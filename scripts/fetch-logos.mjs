#!/usr/bin/env node
/**
 * 公司 Logo 采集脚本（为实习/求职资源板块准备）
 *
 * 数据源优先级（按公司逐个尝试，取第一个成功者）：
 *   1. source: "url:..."            —— 手工指定的 logo 地址（用于官网被墙的公司）
 *   2. source: "simpleicons:slug"   —— Simple Icons CDN（单色 SVG，适合被墙的国际科技大厂）
 *   3. 官网图标抓取                  —— 解析首页 <link rel="icon">/apple-touch-icon，取最大尺寸；失败再试 /favicon.ico
 *
 * 用法:  node scripts/fetch-logos.mjs            # 全量抓取（已成功的会跳过，除非加 --force）
 *        node scripts/fetch-logos.mjs --force    # 强制重新抓取
 * 新增公司：编辑 scripts/companies.json 后重跑本脚本。
 *
 * 产出: assets/logos/{slug}.{png|svg|ico|jpg}
 *       assets/logos.js        （前端索引，window.__LOGOS）
 *       assets/logos/index.json（同内容的 JSON 版本）
 * 版权说明：各公司 Logo 版权归其所有者，仅用于站内资源识别展示。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileP = promisify(execFile);
let curlChain = Promise.resolve(); // 串行化 curl，避免 Windows spawn 冲突

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LOGO_DIR = join(ROOT, 'assets', 'logos');
const FORCE = process.argv.includes('--force');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

mkdirSync(LOGO_DIR, { recursive: true });

async function get(url, timeoutMs = 15000, asBuffer = true) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    let res;
    try {
      res = await fetch(url, {
        signal: ac.signal,
        redirect: 'follow',
        headers: { 'User-Agent': UA, 'Accept': 'image/*,*/*;q=0.8,text/html;q=0.7' },
      });
    } catch (e) {
      // Node fetch 对部分主机（TLS/HTTP2 兼容性）会直接失败，退回系统 curl
      res = await curlGet(url, timeoutMs);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = res.headers.get('content-type') || '';
    const buf = asBuffer ? Buffer.from(await res.arrayBuffer()) : await res.text();
    return { status: res.status, type, buf, finalUrl: res.url };
  } finally {
    clearTimeout(t);
  }
}

/** 用系统 curl 兜底（返回 fetch Response 风格对象）；全局串行执行 */
function curlGet(url, timeoutMs) {
  const run = async () => {
    const secs = Math.max(2, Math.ceil(timeoutMs / 1000));
    const { stdout } = await execFileP('curl', [
      '-s', '-L', '--compressed', '--max-time', String(secs),
      '-A', UA, '-H', 'Accept: image/*,*/*;q=0.8,text/html;q=0.7',
      '-w', '\n__CURL_META__%{content_type}\t%{http_code}',
      url,
    ], { maxBuffer: 32 * 1024 * 1024, timeout: timeoutMs + 5000, encoding: 'buffer' });
    const s = stdout.toString('binary');
    const idx = s.lastIndexOf('__CURL_META__');
    const body = Buffer.from(s.slice(0, idx), 'binary');
    const [ctype, code] = s.slice(idx + 14).trim().split('\t');
    return {
      ok: Number(code) >= 200 && Number(code) < 300,
      status: Number(code),
      headers: { get: (k) => (k.toLowerCase() === 'content-type' ? ctype : null) },
      url,
      arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
      text: async () => body.toString('utf8'),
    };
  };
  const p = curlChain.then(run, run);
  curlChain = p.catch(() => {});
  return p;
}

const isImage = (type, buf) => {
  if (/^image\//i.test(type)) return true;
  if (type.includes('octet-stream') && buf.length > 100) return true;
  // 魔数兜底
  const h = buf.subarray(0, 12);
  if (h[0] === 0x89 && h[1] === 0x50) return true; // PNG
  if (h[0] === 0xff && h[1] === 0xd8) return true; // JPEG
  if (h[0] === 0x47 && h[1] === 0x49) return true; // GIF
  if ((h[0] === 0x00 && h[1] === 0x00 && h[2] === 0x01) || h.toString('ascii', 0, 4).includes('ICON')) return true; // ICO
  const s = buf.toString('utf8', 0, 200).toLowerCase();
  if (s.includes('<svg')) return true;
  return false;
};

const extOf = (type, buf) => {
  if (buf.toString('utf8', 0, 200).toLowerCase().includes('<svg') || type.includes('svg')) return 'svg';
  if (/png/i.test(type) || (buf[0] === 0x89 && buf[1] === 0x50)) return 'png';
  if (/jpe?g/i.test(type) || (buf[0] === 0xff && buf[1] === 0xd8)) return 'jpg';
  if (/ico|icon/i.test(type) || (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01)) return 'ico';
  if (/gif/i.test(type)) return 'gif';
  if (/webp/i.test(type)) return 'webp';
  return 'png';
};

/** 从官网 HTML 中解析图标候选，按优先级排序 */
function parseIconLinks(html, base) {
  const out = [];
  const re = /<link[^>]+>/gi;
  for (const tag of html.match(re) || []) {
    if (!/rel\s*=\s*["'][^"']*(icon|apple-touch)[^"']*["']/i.test(tag)) continue;
    const href = (tag.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!href) continue;
    const sizes = (tag.match(/sizes\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
    const isApple = /apple-touch/i.test(tag);
    let m = 0;
    const sm = sizes.match(/(\d+)x(\d+)/i);
    if (sm) m = parseInt(sm[1], 10);
    else if (/any/i.test(sizes)) m = 500; // "any" 通常是 SVG 大图标
    const abs = href.startsWith('http') ? href : new URL(href, base).href;
    out.push({ url: abs, score: m * 10 + (isApple ? 5 : 0) });
  }
  // og:image 也可以当 logo 用
  const og = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || [])[1]
    || (html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) || [])[1];
  if (og && og.startsWith('http')) out.push({ url: og, score: 3 });
  return out.sort((a, b) => b.score - a.score).slice(0, 4);
}

async function fetchOfficial(domain) {
  const candidates = [];
  // 首页 HTML 抓 icon 声明
  for (const host of [`https://www.${domain}/`, `https://${domain}/`]) {
    try {
      const { buf } = await get(host, 15000, false);
      candidates.push(...parseIconLinks(buf, host));
      break;
    } catch { /* 下一个 host */ }
  }
  candidates.push(
    { url: `https://www.${domain}/favicon.ico`, score: 0 },
    { url: `https://${domain}/favicon.ico`, score: 0 },
  );
  for (const c of candidates) {
    try {
      const { type, buf } = await get(c.url, 15000);
      if (buf.length > 120 && isImage(type, buf)) return { type, buf, url: c.url };
    } catch { /* 尝试下一个候选 */ }
  }
  throw new Error('official: 无可用图标');
}

async function fetchSimpleIcons(slug) {
  const { type, buf } = await get(`https://cdn.simpleicons.org/${slug}`, 15000);
  if (buf.length < 50) throw new Error('simpleicons: 空响应');
  return { type, buf, url: `cdn.simpleicons.org/${slug}` };
}

async function main() {
  const { companies } = JSON.parse(readFileSync(join(__dirname, 'companies.json'), 'utf8'));
  console.log(`共 ${companies.length} 家公司，开始采集…\n`);
  const results = [];
  const failed = [];
  let done = 0;

  const queue = [...companies];
  async function worker() {
    while (queue.length) {
      const c = queue.shift();
      const fileBase = join(LOGO_DIR, c.slug);
      try {
        if (c.skip) { // 官网反爬/无法自动获取 → 前端用文字徽标占位
          results.push({ ...c, file: null, monogram: true });
        } else {
          // 已存在且非 force → 跳过
          const existing = ['png', 'svg', 'ico', 'jpg', 'gif', 'webp'].map(e => `${fileBase}.${e}`).find(existsSync);
          if (existing && !FORCE) {
            results.push({ ...c, file: `assets/logos/${existing.split(/[\\/]/).pop()}`, skipped: true });
          } else {
            let got;
            if (c.source?.startsWith('url:')) {
              got = await get(c.source.slice(4), 20000);
              if (!isImage(got.type, got.buf)) throw new Error('url: 非图片');
            } else if (c.source?.startsWith('simpleicons:')) {
              got = await fetchSimpleIcons(c.source.slice(12));
            } else {
              got = await fetchOfficial(c.domain);
            }
            const ext = extOf(got.type, got.buf);
            const file = `${c.slug}.${ext}`;
            writeFileSync(join(LOGO_DIR, file), got.buf);
            results.push({ ...c, file: `assets/logos/${file}`, bytes: got.buf.length, from: got.url });
          }
        }
      } catch (e) {
        failed.push({ ...c, reason: e.message });
      }
      if (++done % 15 === 0) console.log(`  进度 ${done}/${companies.length}`);
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));

  // 排序：按行业分组内按名称
  const order = ['互联网', '人工智能', '游戏', '硬件与通信', '新能源与汽车', '国际科技', '金融科技', '金融', '咨询', '快消与零售', '医药与健康'];
  results.sort((a, b) => (order.indexOf(a.industry) - order.indexOf(b.industry)) || a.nameZh.localeCompare(b.nameZh, 'zh'));

  const index = results.map(({ slug, name, nameZh, domain, industry, file, bytes, skipped }) => ({ slug, name, nameZh, domain, industry, file, bytes: bytes ?? null, cached: !!skipped }));
  writeFileSync(join(LOGO_DIR, 'index.json'), JSON.stringify(index, null, 2));
  writeFileSync(join(ROOT, 'assets', 'logos.js'), '/* 由 scripts/fetch-logos.mjs 自动生成 */\nwindow.__LOGOS = ' + JSON.stringify(index) + ';\n');

  console.log(`\n✔ 成功 ${results.length} 家（含缓存 ${results.filter(r => r.skipped).length}），失败 ${failed.length} 家`);
  if (failed.length) {
    console.log('\n失败清单（可编辑 scripts/companies.json 加 source 覆盖后重跑）:');
    for (const f of failed) console.log(`  ✗ ${f.nameZh} (${f.domain}) — ${f.reason}`);
  }
  const totalBytes = index.reduce((s, i) => s + (i.bytes || 0), 0);
  console.log(`\n索引: assets/logos/index.json + assets/logos.js（共 ${(totalBytes / 1024).toFixed(0)} KB 新抓取）`);
}

main().catch(e => { console.error('✘', e); process.exit(1); });

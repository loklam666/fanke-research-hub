#!/usr/bin/env node
/**
 * 批量 Logo 采集（curl 版）—— 面向 900+ 家公司的全量补图
 *
 * 与 fetch-logos.mjs 的区别：全部走系统 curl、8 路并发、8 秒硬超时，
 * 适合「一次补几百家」；已存在的 logo 文件自动跳过，可重复执行。
 * favicon 解析失败的公司留空，前端用首字徽标占位（monogram）。
 *
 * 用法：node scripts/fetch-logos-bulk.mjs [--limit N]
 * 产出：assets/logos/{slug}.{png|svg|ico|jpg}、assets/logos/index.json、assets/logos.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

const ROOT = process.cwd();
const LOGO_DIR = path.join(ROOT, 'assets', 'logos');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const CONCURRENCY = Number(process.env.LOGO_CONCURRENCY || 8);
const TIMEOUT = Number(process.env.LOGO_TIMEOUT || 8);
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > 0 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;

fs.mkdirSync(LOGO_DIR, { recursive: true });
const { companies } = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'companies.json'), 'utf8'));

const EXTS = ['png', 'svg', 'ico', 'jpg', 'gif', 'webp'];
const existingFile = (slug) => EXTS.map((e) => `${slug}.${e}`).find((f) => fs.existsSync(path.join(LOGO_DIR, f)));

/** curl 取二进制，返回 {code, type, buf} */
function curl(url, { head = false } = {}) {
  return new Promise((resolve) => {
    const args = ['-s', '-L', '-4', '--compressed', '--max-time', String(TIMEOUT), '-A', UA,
      '-H', 'Accept: image/*,text/html;q=0.9,*/*;q=0.8',
      '-w', '\n__META__%{content_type}\t%{http_code}', url];
    execFile('curl', args, { maxBuffer: 24 * 1024 * 1024, encoding: 'buffer', timeout: (TIMEOUT + 4) * 1000 }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      const s = stdout.toString('binary');
      const i = s.lastIndexOf('__META__');
      if (i < 0) return resolve(null);
      const [type, code] = s.slice(i + 8).split('\t');
      const buf = Buffer.from(s.slice(0, i), 'binary');
      resolve({ code: parseInt(code, 10), type: (type || '').trim(), buf });
    });
  });
}

const isImage = (type, buf) => {
  if (!buf || buf.length < 120) return false;
  if (/^image\//i.test(type)) return true;
  const h = buf.subarray(0, 16);
  if (h[0] === 0x89 && h[1] === 0x50) return true;
  if (h[0] === 0xff && h[1] === 0xd8) return true;
  if (h[0] === 0x47 && h[1] === 0x49) return true;
  if ((h[0] === 0x00 && h[1] === 0x00 && h[2] === 0x01) || h.toString('ascii', 0, 4).includes('ICON')) return true;
  return buf.toString('utf8', 0, 300).toLowerCase().includes('<svg');
};

const extOf = (type, buf) => {
  if (buf.toString('utf8', 0, 300).toLowerCase().includes('<svg') || /svg/i.test(type)) return 'svg';
  if (/png/i.test(type) || (buf[0] === 0x89 && buf[1] === 0x50)) return 'png';
  if (/jpe?g/i.test(type) || (buf[0] === 0xff && buf[1] === 0xd8)) return 'jpg';
  if (/ico|icon/i.test(type) || (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01)) return 'ico';
  if (/gif/i.test(type)) return 'gif';
  if (/webp/i.test(type)) return 'webp';
  return 'png';
};

function iconCandidates(html, base) {
  const out = [];
  for (const tag of html.match(/<link[^>]+>/gi) || []) {
    if (!/rel\s*=\s*["'][^"']*(icon|apple-touch)[^"']*["']/i.test(tag)) continue;
    const href = (tag.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!href) continue;
    const sizes = (tag.match(/sizes\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
    const sm = sizes.match(/(\d+)x(\d+)/i);
    let score = sm ? parseInt(sm[1], 10) * 10 : 0;
    if (/any/i.test(sizes)) score = 5000;
    if (/apple-touch/i.test(tag)) score += 5;
    try {
      out.push({ url: href.startsWith('http') ? href : new URL(href, base).href, score });
    } catch {}
  }
  const og = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || [])[1];
  if (og && og.startsWith('http')) out.push({ url: og, score: 3 });
  return out.sort((a, b) => b.score - a.score).slice(0, 3);
}

async function resolve(c) {
  const file = existingFile(c.slug);
  if (file) return { ok: true, cached: true, file };
  if (c.skip) return { ok: false, reason: 'skip' };
  if (c.source?.startsWith('simpleicons:')) {
    const r = await curl(`https://cdn.simpleicons.org/${c.source.slice(12)}`);
    if (r && isImage(r.type, r.buf)) {
      const name = `${c.slug}.svg`;
      fs.writeFileSync(path.join(LOGO_DIR, name), r.buf);
      return { ok: true, file: name };
    }
  }
  if (c.source?.startsWith('url:')) {
    const r = await curl(c.source.slice(4));
    if (r && isImage(r.type, r.buf)) {
      const name = `${c.slug}.${extOf(r.type, r.buf)}`;
      fs.writeFileSync(path.join(LOGO_DIR, name), r.buf);
      return { ok: true, file: name };
    }
  }
  if (!c.domain) return { ok: false, reason: 'no domain' };
  const hosts = [`https://www.${c.domain}/`, `https://${c.domain}/`, `http://www.${c.domain}/`, `http://${c.domain}/`];
  for (const host of hosts) {
    const page = await curl(host);
    if (!page || page.code >= 400 || !page.buf.length) continue;
    const html = page.buf.toString('utf8');
    for (const cand of iconCandidates(html, host)) {
      const r = await curl(cand.url);
      if (r && isImage(r.type, r.buf)) {
        const name = `${c.slug}.${extOf(r.type, r.buf)}`;
        fs.writeFileSync(path.join(LOGO_DIR, name), r.buf);
        return { ok: true, file: name };
      }
    }
  }
  for (const host of hosts.slice(0, 2)) {
    const r = await curl(`${host}favicon.ico`);
    if (r && isImage(r.type, r.buf)) {
      const name = `${c.slug}.ico`;
      fs.writeFileSync(path.join(LOGO_DIR, name), r.buf);
      return { ok: true, file: name };
    }
  }
  return { ok: false, reason: 'not found' };
}

/* 执行 */
const queue = companies.slice(0, LIMIT);
console.log(`共 ${queue.length} 家，已缓存 ${companies.filter((c) => existingFile(c.slug)).length} 家，开始并发采集（${CONCURRENCY} 路 / ${TIMEOUT}s 超时）…`);
const results = new Map();
let done = 0;
let okNew = 0;
let i = 0;
async function worker() {
  while (i < queue.length) {
    const c = queue[i++];
    let r;
    try {
      r = await resolve(c);
    } catch (e) {
      r = { ok: false, reason: e.message };
    }
    results.set(c.slug, r);
    if (r.ok && !r.cached) okNew++;
    if (++done % 25 === 0) console.log(`  进度 ${done}/${queue.length}（新抓 ${okNew}）`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

/* 重建索引（与 fetch-logos.mjs 同格式） */
const order = ['互联网','人工智能','游戏','硬件与通信','新能源与汽车','交通与物流','建筑与基建','能源与化工','制造与材料','贸易与供应链','国际科技','金融科技','金融','咨询','快消与零售','医药与健康','综合集团'];
const index = companies.map((c) => {
  const f = existingFile(c.slug);
  const r = results.get(c.slug);
  return {
    slug: c.slug,
    name: c.name,
    nameZh: c.nameZh,
    domain: c.domain,
    industry: c.industry,
    file: f ? `assets/logos/${f}` : null,
    bytes: f ? fs.statSync(path.join(LOGO_DIR, f)).size : null,
    cached: !!(r && r.cached),
    ...(c.fortune ? { fortune: c.fortune, rank: c.rank } : {}),
    ...(c.country ? { country: c.country } : {}),
  };
});
index.sort((a, b) => (order.indexOf(a.industry) - order.indexOf(b.industry)) || a.nameZh.localeCompare(b.nameZh, 'zh'));
fs.writeFileSync(path.join(LOGO_DIR, 'index.json'), JSON.stringify(index, null, 2));
fs.writeFileSync(path.join(ROOT, 'assets', 'logos.js'), '/* 由 scripts/fetch-logos-bulk.mjs 自动生成 */\nwindow.__LOGOS = ' + JSON.stringify(index) + ';\n');

const withLogo = index.filter((x) => x.file).length;
const noLogo = index.filter((x) => !x.file);
console.log(`\n✔ 有 logo ${withLogo} / ${index.length}（本次新抓 ${okNew}）`);
fs.writeFileSync(path.join(ROOT, '.fortune-cache', 'logo-missing.txt'), noLogo.map((x) => `${x.slug}\t${x.nameZh}\t${x.domain || ''}`).join('\n'));
console.log(`未拿到 ${noLogo.length} 家，清单见 .fortune-cache/logo-missing.txt`);

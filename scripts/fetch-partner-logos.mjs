// 为合作机构单独抓 logo（slug 前缀 p-，不进企业名录）
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LOGO_DIR = path.resolve(HERE, '../assets/logos');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const ORGS = {
  'p-hillhouse': 'hillhousecap.com', 'p-sequoia': 'sequoiacap.com', 'p-blackstone': 'blackstone.com',
  'p-iqvia': 'iqvia.com', 'p-kearney': 'kearney.com', 'p-lek': 'lek.com', 'p-mercer': 'mercer.com',
  'p-kantar': 'kantar.com', 'p-ipsos': 'ipsos.com', 'p-frost': 'frost.com', 'p-nielsen': 'nielsen.com',
  'p-iresearch': 'iresearch.com.cn', 'p-porsche': 'porsche.com', 'p-ogilvy': 'ogilvy.com',
  'p-groupm': 'groupm.com', 'p-publicis': 'publicisgroupe.com', 'p-mccann': 'mccann.com',
  'p-yingke': 'yingkelawyer.com', 'p-kwm': 'kwm.com', 'p-zhonglun': 'zhonglun.com',
  'p-allbright': 'allbrightlaw.com', 'p-arup': 'arup.com', 'p-gensler': 'gensler.com',
  'p-ecadi': 'ecadi.com', 'p-lvmh': 'lvmh.com', 'p-gucci': 'gucci.com', 'p-prada': 'prada.com',
  'p-chanel': 'chanel.com', 'p-todayart': 'todayartmuseum.com', 'p-youdao': 'youdao.com',
  'p-tal': '100tal.com', 'p-xdf': 'xdf.cn', 'p-3m': '3m.com', 'p-undp': 'undp.org',
  'p-hilton': 'hilton.com', 'p-dxzq': 'dxzq.net.cn', 'p-hczq': 'hczq.com', 'p-idg': 'idgcapital.com',
  'p-jiuqian': 'jiuqian.com', 'p-bda': 'bda.cn', 'p-ia-cas': 'ia.cas.cn', 'p-fudan': 'fudan.edu.cn',
  'p-zhonghuan': 'zhonghuanep.com',
  'p-wpp': 'wpp.com',
  cicc: 'cicc.com', nestle: 'nestle.com', dow: 'dow.com',
};

const EXTS = ['png', 'svg', 'ico', 'jpg', 'webp'];
const has = (s) => EXTS.some((e) => fs.existsSync(path.join(LOGO_DIR, `${s}.${e}`)));

function curl(url) {
  return new Promise((resolve) => {
    execFile('curl', ['-s', '-L', '-4', '--compressed', '--max-time', '8', '-A', UA, '-H', 'Accept: image/*,text/html;q=0.9',
      '-w', '\n__M__%{content_type}\t%{http_code}', url], { maxBuffer: 16 << 20, encoding: 'buffer', timeout: 14000 }, (err, out) => {
      if (err || !out) return resolve(null);
      const s = out.toString('binary');
      const i = s.lastIndexOf('__M__');
      if (i < 0) return resolve(null);
      const [type, code] = s.slice(i + 5).split('\t');
      resolve({ code: +code, type: (type || '').trim(), buf: Buffer.from(s.slice(0, i), 'binary') });
    });
  });
}
const isImg = (t, b) => {
  if (!b || b.length < 120) return false;
  if (/^image\//i.test(t)) return true;
  const h = b.subarray(0, 8);
  if (h[0] === 0x89 && h[1] === 0x50) return true;
  if (h[0] === 0xff && h[1] === 0xd8) return true;
  if (h[0] === 0x47 && h[1] === 0x49) return true;
  if (h[0] === 0 && h[1] === 0 && h[2] === 1) return true;
  return b.toString('utf8', 0, 300).toLowerCase().includes('<svg');
};
const ext = (t, b) => {
  if (b.toString('utf8', 0, 300).toLowerCase().includes('<svg') || /svg/i.test(t)) return 'svg';
  if (/png/i.test(t) || (b[0] === 0x89 && b[1] === 0x50)) return 'png';
  if (/jpe?g/i.test(t) || (b[0] === 0xff && b[1] === 0xd8)) return 'jpg';
  if (/ico/i.test(t) || (b[0] === 0 && b[1] === 0 && b[2] === 1)) return 'ico';
  return 'png';
};

const todo = Object.entries(ORGS).filter(([slug]) => !has(slug));
console.log('待抓', todo.length);
let ok = 0;
let i = 0;
const fail = [];
async function worker() {
  while (i < todo.length) {
    const [slug, domain] = todo[i++];
    let done = false;
    for (const host of [`https://www.${domain}/`, `https://${domain}/`]) {
      const page = await curl(host);
      if (!page || page.code >= 400) continue;
      const html = page.buf.toString('utf8');
      const cands = [];
      for (const tag of html.match(/<link[^>]+>/gi) || []) {
        if (!/rel\s*=\s*["'][^"']*(icon|apple-touch)/i.test(tag)) continue;
        const href = (tag.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1];
        if (!href) continue;
        const sizes = (tag.match(/sizes\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
        const m = sizes.match(/(\d+)x/i);
        cands.push({ url: href.startsWith('http') ? href : new URL(href, host).href, sc: m ? +m[1] : (/any/i.test(sizes) ? 400 : 0) });
      }
      cands.sort((a, b) => b.sc - a.sc);
      for (const c of cands.slice(0, 3)) {
        const r = await curl(c.url);
        if (r && isImg(r.type, r.buf)) {
          fs.writeFileSync(path.join(LOGO_DIR, `${slug}.${ext(r.type, r.buf)}`), r.buf);
          done = true;
          break;
        }
      }
      if (done) break;
      const r = await curl(`${host}favicon.ico`);
      if (r && isImg(r.type, r.buf)) {
        fs.writeFileSync(path.join(LOGO_DIR, `${slug}.ico`), r.buf);
        done = true;
        break;
      }
    }
    if (done) ok++;
    else fail.push(slug);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log(`成功 ${ok} / ${todo.length}`);
console.log('失败:', fail.join(' '));

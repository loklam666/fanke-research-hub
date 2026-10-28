// 复核子页内嵌模式（?embed=1）是否真的渲染出内容
// 用法：cd 到仓库根目录，node scripts/embed-check.mjs
// 判定标准：textLen > 0、bodyH 与 scrollH 相等且 > 1000、页头与 hero 均为 display:none
// 背景：body.embed 会隐藏 .site-header/.hero/.site-footer，若 hero 标签没闭合把 <main> 包进去，
//       正文会被连带隐藏 —— 表现为空白页且控制台无任何报错，只能靠本脚本快速定位。
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PLAYWRIGHT_PATH || 'C:/Users/lok/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const { chromium } = await import('file:///' + PW.replace(/^\/+/, ''));

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
let bad = 0;

for (const f of ['jobs.html?embed=1', 'winter.html?embed=1']) {
  const url = 'file:///' + path.join(REPO, f).replace(/\\/g, '/');
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const q = s => document.querySelector(s);
    return {
      textLen: document.body.innerText.length,
      bodyH: Math.round(document.body.getBoundingClientRect().height),
      scrollH: document.documentElement.scrollHeight,
      headerHidden: !q('.site-header') || getComputedStyle(q('.site-header')).display === 'none',
      heroHidden: !q('.hero') || getComputedStyle(q('.hero')).display === 'none',
      mainParent: q('main')?.parentElement?.tagName.toLowerCase() || 'no-main'
    };
  });
  const ok = r.textLen > 0 && r.bodyH > 1000 && r.bodyH === r.scrollH && r.headerHidden && r.heroHidden && r.mainParent === 'body';
  if (!ok) bad++;
  console.log((ok ? 'PASS ' : 'FAIL ') + f.padEnd(20), JSON.stringify(r));
}

await b.close();
if (bad) { console.log('\n有 ' + bad + ' 个子页内嵌渲染异常'); process.exit(1); }
console.log('\n全部正常');

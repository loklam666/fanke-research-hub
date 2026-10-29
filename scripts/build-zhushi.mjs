#!/usr/bin/env node
/**
 * 竹石创研院官网抓取数据 → 前端数据包 assets/zhushi.js
 *
 * 用法: node scripts/build-zhushi.mjs "C:/Users/lok/WorkBuddy/2026-10-29-10-58-21/zhushi_data"
 * 前置: 先跑 python scripts/build-zhushi-covers.py（生成 assets/zhushi/c/*.jpg）
 *
 * 输出: window.__ZHUSHI = { updated, source, stats, items[] }
 * 频道: special 专题 / topic 课题 / talent 人才培养 / platform 开放平台 / news 资讯 / video 视频
 *
 * 去重：跨频道存在同标题条目（如「压电风能收集器」同时出现在 special 和 topic），
 * 按优先级 special > topic > talent > platform > news > video 保留一条，避免列表里出现两张一样的卡。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = resolve(process.argv[2] || 'C:/Users/lok/WorkBuddy/2026-10-29-10-58-21/zhushi_data');

const raw = JSON.parse(readFileSync(join(SRC, 'all_items.json'), 'utf8'));
const PRIORITY = { special: 0, topic: 1, talent: 2, platform: 3, news: 4, video: 5 };
const CH_CN = { special: '专题', topic: '课题', talent: '人才培养', platform: '开放平台', news: '研究院资讯', video: '视频' };

const norm = s => String(s || '').replace(/[\s\u00a0]+/g, '').trim();

// 去重：同标题保留优先级最高的一条
const byTitle = new Map();
for (const it of raw) {
  const k = norm(it.title);
  if (!k) continue;
  const cur = byTitle.get(k);
  if (!cur || (PRIORITY[it._channel] ?? 9) < (PRIORITY[cur._channel] ?? 9)) byTitle.set(k, it);
}
const dropped = raw.length - byTitle.size;
const kept = [...byTitle.values()];

const items = kept.map(it => {
  const ch = it._channel;
  const id = `${ch}-${it._id}`;
  const coverFile = join(ROOT, 'assets', 'zhushi', 'c', `${ch}_${it._id}.jpg`);
  const tags = [...new Set((it.tag || []).map(t => String(t).trim()).filter(Boolean))];
  return {
    id,
    ch,
    title: String(it.title || '').trim(),
    intro: String(it.intro || '').trim() || null,
    cover: existsSync(coverFile) ? `assets/zhushi/c/${ch}_${it._id}.jpg` : null,
    poster: it.poster || null,
    tags,
    cycle: String(it.kkTime || '').trim() || null,
    attach: it.fujian || null,
    content: String(it.content || '').trim() || null,
    addTime: it.addTime || null,
  };
});

// 排序：专题在前，同频道按 addTime 倒序（新的靠前）
items.sort((a, b) => {
  const d = (PRIORITY[a.ch] ?? 9) - (PRIORITY[b.ch] ?? 9);
  if (d) return d;
  return String(b.addTime || '').localeCompare(String(a.addTime || ''));
});

const stats = {};
for (const it of items) stats[it.ch] = (stats[it.ch] || 0) + 1;

// 学科标签词频（给前端做筛选用，只保留出现 >= 3 次的）
const tagCount = {};
for (const it of items) for (const t of it.tags) tagCount[t] = (tagCount[t] || 0) + 1;
const topTags = Object.entries(tagCount)
  .filter(([, n]) => n >= 3)
  .sort((a, b) => b[1] - a[1])
  .map(([name, n]) => ({ name, n }));

const pack = {
  updated: new Date().toISOString().slice(0, 10),
  source: '竹石创新研究院官网（BamRock）',
  stats: { total: items.length, ...stats },
  topTags,
  items,
};

const out = join(ROOT, 'assets', 'zhushi.js');
writeFileSync(
  out,
  '/* 由 scripts/build-zhushi.mjs 生成，请勿手改 */\nwindow.__ZHUSHI = ' + JSON.stringify(pack) + ';\n',
);

console.log('=== 构建完成 ===');
console.log('  原始:', raw.length, '条 → 去重后:', items.length, '条（合并同标题', dropped, '条）');
console.log('  分频道:', JSON.stringify(stats));
console.log('  学科标签(≥3次):', topTags.length, '个 →', topTags.slice(0, 8).map(t => `${t.name}${t.n}`).join(' '));
const withCover = items.filter(i => i.cover).length;
const withAttach = items.filter(i => i.attach).length;
const withContent = items.filter(i => i.content).length;
console.log(`  封面 ${withCover} / 附件 ${withAttach} / 正文 ${withContent}`);
console.log('  输出:', out, (JSON.stringify(pack).length / 1024).toFixed(0) + 'KB');

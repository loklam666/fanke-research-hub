#!/usr/bin/env node
/**
 * 只读比对：源站当前数据 vs 本地 assets/data.js
 * 用法：node scripts/check-sync.mjs
 *
 * 不写入任何文件，只报告差异：
 *   - 源站现有项目数 / 本地项目数
 *   - 新增（源站有、本地无）
 *   - 下线（本地有、源站无）
 *   - 标题或分类发生变化的条目数
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const API = 'https://gec-api.gecacademy.cn/souapi';

async function post(path, body = {}) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  const json = await res.json();
  if (json.error?.returnCode !== 0) throw new Error(`${path} -> ${json.error?.returnMessage}`);
  return json.data;
}

async function fetchList(label, path, body = {}) {
  try {
    const d = await post(path, { page: 1, limit: 1000, ...body });
    const list = d.courseList || [];
    console.log(`  [ok] ${label}: ${list.length} 条`);
    return list;
  } catch (e) {
    console.warn(`  [skip] ${label}: ${e.message}`);
    return [];
  }
}

// 本地数据
global.window = {};
eval(readFileSync(join(ROOT, 'assets', 'data.js'), 'utf8'));
const LOCAL = window.__FANKE_DATA || {};
const localProjects = LOCAL.projects || [];
const localById = new Map(localProjects.map(p => [p.id, p]));

console.log('=== 本地 assets/data.js ===');
console.log(`  lastSync: ${LOCAL.meta?.lastSync || '—'}`);
console.log(`  projects: ${localProjects.length}`);

console.log('\n=== 拉取源站 ===');
const taxonomyRaw = await post('/territory/query/summary');
const typeMap = new Map(taxonomyRaw.type.map(t => [t.id, t.name]));
const raw = [];
raw.push(...(await fetchList('常规科研(全部)', '/soutools/v2/course/query/common')));
raw.push(...(await fetchList('全球在研 1v1', '/soutools/v2/course/query/common', { typeIdList: [56] })));
raw.push(...(await fetchList('Astra 1v1', '/soutools/v2/course/query/common', { typeIdList: [57] })));
raw.push(...(await fetchList('专业选修课程', '/soutools/v2/course/query/common', { typeIdList: [49] })));
raw.push(...(await fetchList('海外/国内导师线下', '/soutools/v2/course/query/common', { typeIdList: [5, 38] })));
raw.push(...(await fetchList('IEPQ 项目', '/soutools/v2/course/query/ipq')));
raw.push(...(await fetchList('科研竞赛', '/soutools/v2/course/query/competition')));
raw.push(...(await fetchList('AI HUB', '/soutools/v2/course/query/aiHub')));

const remoteById = new Map();
for (const c of raw) {
  if (!c || !c.id || remoteById.has(c.id)) continue;
  remoteById.set(c.id, c);
}

// 汇总长图
let remoteImages = [];
try {
  remoteImages = await post('/imageClient/query/summary/image');
} catch (e) {
  console.warn(`  [skip] 汇总长图: ${e.message}`);
}
const localImages = (LOCAL.summaryImages || []).length;

console.log('\n=== 差异 ===');
const added = [...remoteById.keys()].filter(id => !localById.has(id));
const removed = [...localById.keys()].filter(id => !remoteById.has(id));
const changed = [];
for (const [id, r] of remoteById) {
  const l = localById.get(id);
  if (!l) continue;
  if (l.title !== r.name) changed.push({ id, field: 'title', from: l.title, to: r.name });
  const remoteType = typeMap.get(r.typeId) ?? '其他';
  if (l.type !== remoteType) changed.push({ id, field: 'type', from: l.type, to: remoteType });
}

console.log(`  源站去重后: ${remoteById.size}  本地: ${localProjects.length}`);
console.log(`  新增: ${added.length}   下线: ${removed.length}   字段变化: ${changed.length}`);
console.log(`  汇总长图: 源站 ${remoteImages.length} / 本地 ${localImages}`);

if (added.length) {
  console.log('\n  -- 新增项目（最多列 15 条）--');
  added.slice(0, 15).forEach(id => {
    const r = remoteById.get(id);
    console.log(`   + [${typeMap.get(r.typeId) ?? '其他'}] ${String(r.name).slice(0, 44)}`);
  });
}
if (removed.length) {
  console.log('\n  -- 已下线（最多列 15 条）--');
  removed.slice(0, 15).forEach(id => {
    const l = localById.get(id);
    console.log(`   - [${l.type}] ${String(l.title).slice(0, 44)}`);
  });
}
if (changed.length) {
  console.log('\n  -- 字段变化（最多列 10 条）--');
  changed.slice(0, 10).forEach(c => {
    console.log(`   ~ ${c.field}: ${String(c.from).slice(0, 34)} → ${String(c.to).slice(0, 34)}`);
  });
}

const fresh = added.length === 0 && removed.length === 0 && changed.length === 0 && remoteImages.length === localImages;
console.log('\n结论: ' + (fresh ? '已是最新，无需重新同步' : '存在差异，需跑 node scripts/sync.mjs 重新生成'));

#!/usr/bin/env node
/**
 * 泛柯科研项目库 — 数据同步脚本
 * 从 Path Academics 科研项目平台 (sou-tools.gecacademy.cn) 拉取全部公开项目数据，
 * 规范化后写入 data/ 目录。网站前端直接读取这些 JSON，无需改代码。
 *
 * 用法:  node scripts/sync.mjs        (需要 Node 18+，自带 fetch)
 * 验证:  同步完成后查看 data/meta.json 中的统计信息
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

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

/** 拉取一个课程列表接口的全量数据（带容错，单个来源失败不影响整体） */
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

async function main() {
  console.log('① 拉取分类体系 …');
  const taxonomyRaw = await post('/territory/query/summary');
  const typeMap = new Map(taxonomyRaw.type.map(t => [t.id, t.name]));
  // 学科领域: direction -> { professions: [...] }
  const directionMap = new Map(); // directionId -> name
  const professionMap = new Map(); // professionId -> { name, directionId, directionName }
  for (const dir of taxonomyRaw.direction || []) {
    directionMap.set(dir.id, dir.name);
    for (const p of dir.profession || []) {
      professionMap.set(p.id, { name: p.name, directionId: dir.id, directionName: dir.name });
    }
  }

  console.log('② 拉取全部项目列表 …');
  const raw = [];
  raw.push(...(await fetchList('常规科研(全部)', '/soutools/v2/course/query/common')));
  raw.push(...(await fetchList('全球在研 1v1', '/soutools/v2/course/query/common', { typeIdList: [56] })));
  raw.push(...(await fetchList('Astra 1v1', '/soutools/v2/course/query/common', { typeIdList: [57] })));
  raw.push(...(await fetchList('专业选修课程', '/soutools/v2/course/query/common', { typeIdList: [49] })));
  raw.push(...(await fetchList('海外/国内导师线下', '/soutools/v2/course/query/common', { typeIdList: [5, 38] })));
  raw.push(...(await fetchList('IEPQ 项目', '/soutools/v2/course/query/ipq')));
  raw.push(...(await fetchList('科研竞赛', '/soutools/v2/course/query/competition')));
  raw.push(...(await fetchList('AI HUB', '/soutools/v2/course/query/aiHub')));

  console.log('③ 拉取汇总长图 …');
  let summaryImages = [];
  try {
    summaryImages = await post('/imageClient/query/summary/image');
    console.log(`  [ok] 汇总长图: ${summaryImages.length} 张`);
  } catch (e) {
    console.warn(`  [skip] 汇总长图: ${e.message}`);
  }

  console.log('④ 规范化 & 去重 …');
  const seen = new Map();
  for (const c of raw) {
    if (!c || !c.id || seen.has(c.id)) continue;
    const prof = professionMap.get(c.professionId);
    const directionName =
      prof?.directionName ?? directionMap.get(c.directionId) ?? null;
    const audience = [];
    if (c.suggestSenior === 1) audience.push('高中生');
    if (c.suggestMiddle === 1) audience.push('初中生');
    if (c.suggestCollege === 1) audience.push('大学生');
    if (c.suggestMaster === 1) audience.push('硕士生');
    seen.set(c.id, {
      id: c.id,
      title: c.name,
      typeId: c.typeId ?? null,
      type: typeMap.get(c.typeId) ?? '其他',
      directionId: prof?.directionId ?? c.directionId ?? null,
      direction: directionName,
      professionId: c.professionId ?? null,
      profession: prof?.name ?? null,
      teacher: {
        name: c.teacherName ?? null,
        level: c.teacherLevel ?? null,
        school: c.teacherSchool ?? null,
      },
      mode: c.isOnline === 1 ? '线上' : c.isOnline === 0 ? '线下' : null,
      startDate: c.schoolBegins ?? null,
      startDateUtc: c.schoolBegins_utc ?? null,
      audience,
      basics: c.suggestBasics ?? null,
      fit: c.fitList ?? [],
      star: c.starNum ?? 0,
      surplus: c.surplus == null || c.surplus < 0 ? null : c.surplus,
      isTop: c.isTop === 1,
      image: c.imageHeader ?? null,
      longImage: c.courseImgUrl ?? null,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
  }
  const projects = [...seen.values()];
  console.log(`  去重后共 ${projects.length} 个项目`);

  console.log('⑤ 写入 data/ …');
  mkdirSync(DATA_DIR, { recursive: true });
  const taxonomy = {
    types: taxonomyRaw.type.map(t => ({ id: t.id, name: t.name })),
    directions: (taxonomyRaw.direction || []).map(d => ({
      id: d.id,
      name: d.name,
      professions: (d.profession || []).map(p => ({ id: p.id, name: p.name })),
    })),
    competitionDirections: taxonomyRaw.competitionDirection || [],
  };
  const counts = {};
  for (const p of projects) counts[p.type] = (counts[p.type] || 0) + 1;
  const lastSync = new Date().toISOString();

  console.log('⑥ 拉取每个项目的详情（周期/产出/背景/导师介绍/附件）…');
  const details = {};
  const SKIP = process.argv.includes('--skip-details');
  if (!SKIP) {
    const ids = projects.map(p => p.id);
    let done = 0, fail = 0;
    const CONCURRENCY = 8;
    const queue = [...ids];
    async function worker() {
      while (queue.length) {
        const id = queue.shift();
        try {
          const d = await post('/course/query/share', { id });
          details[id] = {
            cycle: d.cycle ?? null,                    // 项目周期
            output: d.output ?? null,                  // 项目产出
            projectBackground: d.projectBackground ?? null, // 项目背景/周计划
            introduce: d.introduce ?? null,            // 项目介绍(HTML)
            courseOutlineDetail: d.courseOutlineDetail ?? null,
            attachments: Array.isArray(d.allAttachmentsArray)
              ? d.allAttachmentsArray.filter(a => a?.url).map(a => ({ name: a.str, url: a.url }))
              : [],
            series: d.types ?? null,                   // 系列名称
            teacherDetail: d.teacherDetail ?? null,    // 导师介绍(HTML)
            teacherHeadImg: d.teacherHeadImgUrl || null,
            teacherTypes: d.teacherTypes ?? null,
          };
        } catch (e) {
          fail++;
          if (fail <= 5) console.warn(`  [skip] 详情 ${id.slice(0, 8)}: ${e.message}`);
        }
        if (++done % 100 === 0) console.log(`  详情进度 ${done}/${ids.length}`);
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    console.log(`  详情完成: ${Object.keys(details).length} 成功, ${fail} 失败`);
  }

  writeFileSync(join(DATA_DIR, 'projects.json'), JSON.stringify(projects, null, 2));
  writeFileSync(join(DATA_DIR, 'taxonomy.json'), JSON.stringify(taxonomy, null, 2));
  writeFileSync(join(DATA_DIR, 'summary-images.json'), JSON.stringify(summaryImages, null, 2));

  // 前端数据包：以 <script src> 方式加载，双击 index.html 也能正常显示
  const bundle = { projects, taxonomy, summaryImages, meta: { lastSync, totalProjects: projects.length } };
  mkdirSync(join(__dirname, '..', 'assets'), { recursive: true });
  writeFileSync(
    join(__dirname, '..', 'assets', 'data.js'),
    '/* 由 scripts/sync.mjs 自动生成，请勿手改 */\nwindow.__FANKE_DATA = ' + JSON.stringify(bundle) + ';\n',
  );
  // 详情数据包（弹窗首次打开时懒加载）
  writeFileSync(join(DATA_DIR, 'details.json'), JSON.stringify(details, null, 2));
  writeFileSync(
    join(__dirname, '..', 'assets', 'details.js'),
    '/* 由 scripts/sync.mjs 自动生成，请勿手改 */\nwindow.__FANKE_DETAILS = ' + JSON.stringify(details) + ';\n',
  );

  writeFileSync(
    join(DATA_DIR, 'meta.json'),
    JSON.stringify(
      {
        source: 'https://sou-tools.gecacademy.cn/ (Path Academics)',
        api: API,
        lastSync,
        totalProjects: projects.length,
        detailsSynced: Object.keys(details).length,
        countsByType: counts,
      },
      null,
      2,
    ),
  );
  console.log('✔ 同步完成 → data/{projects,taxonomy,summary-images,meta}.json');
  console.log(`  共 ${projects.length} 个项目:`, JSON.stringify(counts));
}

main().catch(e => {
  console.error('✘ 同步失败:', e.message);
  process.exit(1);
});

// 生成 assets/partner.js（合作渠道：竹石 4.0 产品体系 + 实习岗位库）
// 输入：zhushi-materials/extracted/*.csv、assets/logos/*
// 输出：fanke-research-hub/assets/partner.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
// 源表默认取 scripts/partner-src/（已随仓库提交）；换新一期物料时用 PARTNER_SRC 指向新的导出目录
const SRC = process.env.PARTNER_SRC || path.join(HERE, 'partner-src');
const LOGO_DIR = path.join(ROOT, 'assets/logos');

/* ---------- CSV ---------- */
function parseCSV(file) {
  const t = fs.readFileSync(file, 'utf8');
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\r') {}
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

/* ---------- 机构 → logo 键 ---------- */
const ALIAS = {
  中信建投: 'csc', 中信: 'citic-securities', 中金: 'cicc', 招商: 'cms-china', 国泰: 'guotai-junan',
  申万: 'shenwan-hongyuan-group', 光大: 'cebbank', 摩根: 'jp-morgan', 高盛: 'goldman-sachs',
  高瓴: 'p-hillhouse', 红杉: 'p-sequoia', 软银: 'softbank-group', 黑石: 'p-blackstone', 花旗: 'citi',
  麦肯锡: 'mckinsey', 贝恩: 'bain', 波士顿: 'bcg', 罗兰贝格: 'rolandberger', 埃森哲: 'accenture',
  艾昆纬: 'p-iqvia', 科尔尼: 'p-kearney', LEK: 'p-lek', 美世: 'p-mercer', 凯度: 'p-kantar',
  益普索: 'p-ipsos', 沙利文: 'p-frost', IBM: 'ibm', 尼尔森: 'p-nielsen', 艾瑞: 'p-iresearch',
  德勤: 'deloitte', 毕马威: 'kpmg', 安永: 'ey', 普华: 'pwc', 普华永道: 'pwc',
  联合利华: 'unilever', 欧莱雅: 'loreal', 宝洁: 'pg', 玛氏: 'mars', 雀巢: 'nestle',
  奔驰: 'mercedes-benz', 保时捷: 'p-porsche', 奥美: 'p-ogilvy', 群邑: 'p-groupm', 阳狮: 'p-publicis',
  麦肯光明: 'p-mccann', 蓝色光标: 'bluefocus-intelligent-communications-gro', 盈科: 'p-yingke',
  金杜: 'p-kwm', 中伦: 'p-zhonglun', 锦天城: 'p-allbright', 阿里: 'alibaba', 腾讯: 'tencent',
  字节: 'bytedance', 字节跳动: 'bytedance', 微软: 'microsoft', 京东: 'jd', 亚马逊: 'amazon',
  谷歌: 'google', 奥雅纳: 'p-arup', 万科: 'china-vanke', 甘斯勒: 'p-gensler',
  华东建筑设计研究院: 'p-ecadi', LV: 'p-lvmh', LVMH: 'p-lvmh', Dior: 'christian-dior', 迪奥: 'christian-dior',
  Gucci: 'p-gucci', 古驰: 'p-gucci', Prada: 'p-prada', Chanel: 'p-chanel', 香奈儿: 'p-chanel',
  北京今日美术馆: 'p-todayart', 网易有道: 'p-youdao', 好未来: 'p-tal', 新东方: 'p-xdf',
  陶氏化学: 'dow', '3M': 'p-3m', '3M材料': 'p-3m', 西门子: 'siemens', 联合国开发署: 'p-undp',
  特斯拉: 'tesla', 希尔顿: 'p-hilton', 美团: 'meituan', 百度: 'baidu', 蚂蚁: 'antgroup', 蚂蚁金服: 'antgroup',
  华为: 'huawei', 海通: 'guotai-haitong-securities', 海通研究所: 'guotai-haitong-securities',
  东兴证券: 'p-dxzq', 华创: 'p-hczq', 华创固定收益: 'p-hczq', IDG: 'p-idg', 久谦: 'p-jiuqian',
  久谦咨询: 'p-jiuqian', BDA: 'p-bda', 中环环保: 'p-zhonghuan', 招商基金: 'cmb', 中信证券: 'citic-securities',
  中信投行: 'citic-securities', 摩根大通: 'jp-morgan', 中科院自动化所: 'p-ia-cas', 复旦大学研究院: 'p-fudan',
};

const LOGO_EXT = ['png', 'svg', 'ico', 'jpg', 'gif', 'webp'];
const logoOf = (key) => {
  if (!key) return null;
  for (const e of LOGO_EXT) {
    const f = `${key}.${e}`;
    if (fs.existsSync(path.join(LOGO_DIR, f))) return `assets/logos/${f}`;
  }
  return null;
};

/* 简称 → 对外展示全称（同时完成同义机构合并） */
const CANON = {
  中信: ['中信证券', 'citic-securities'],
  中信证券: ['中信证券', 'citic-securities'],
  中信投行: ['中信证券', 'citic-securities'],
  中信建投: ['中信建投证券', 'csc'],
  中金: ['中金公司', 'cicc'],
  招商: ['招商证券', 'cms-china'],
  招商基金: ['招商基金', 'cmb'],
  国泰: ['国泰君安', 'guotai-junan'],
  申万: ['申万宏源', 'shenwan-hongyuan-group'],
  光大: ['光大证券', 'cebbank'],
  海通研究所: ['海通证券研究所', 'guotai-haitong-securities'],
  东兴证券: ['东兴证券', 'p-dxzq'],
  华创: ['华创证券', 'p-hczq'],
  华创固定收益: ['华创证券', 'p-hczq'],
  摩根: ['摩根士丹利', 'morgan-stanley'],
  摩根大通: ['摩根大通', 'jp-morgan'],
  高盛: ['高盛', 'goldman-sachs'],
  花旗: ['花旗', 'citi'],
  高瓴: ['高瓴资本', 'p-hillhouse'],
  红杉: ['红杉中国', 'p-sequoia'],
  软银: ['软银', 'softbank-group'],
  黑石: ['黑石集团', 'p-blackstone'],
  IDG: ['IDG 资本', 'p-idg'],
  麦肯锡: ['麦肯锡', 'mckinsey'],
  贝恩: ['贝恩', 'bain'],
  波士顿: ['波士顿咨询 BCG', 'bcg'],
  罗兰贝格: ['罗兰贝格', 'rolandberger'],
  埃森哲: ['埃森哲', 'accenture'],
  科尔尼: ['科尔尼 Kearney', 'p-kearney'],
  LEK: ['L.E.K. 咨询', 'p-lek'],
  美世: ['美世', 'p-mercer'],
  凯度: ['凯度', 'p-kantar'],
  益普索: ['益普索', 'p-ipsos'],
  尼尔森: ['尼尔森', 'p-nielsen'],
  沙利文: ['弗若斯特沙利文', 'p-frost'],
  艾昆纬: ['艾昆纬 IQVIA', 'p-iqvia'],
  艾瑞: ['艾瑞咨询', 'p-iresearch'],
  久谦: ['久谦咨询', 'p-jiuqian'],
  久谦咨询: ['久谦咨询', 'p-jiuqian'],
  BDA: ['BDA Partners', 'p-bda'],
  德勤: ['德勤', 'deloitte'],
  安永: ['安永', 'ey'],
  毕马威: ['毕马威', 'kpmg'],
  普华: ['普华永道', 'pwc'],
  普华永道: ['普华永道', 'pwc'],
  联合利华: ['联合利华', 'unilever'],
  欧莱雅: ['欧莱雅', 'loreal'],
  宝洁: ['宝洁', 'pg'],
  玛氏: ['玛氏', 'mars'],
  雀巢: ['雀巢', 'nestle'],
  奔驰: ['梅赛德斯-奔驰', 'mercedes-benz'],
  保时捷: ['保时捷', 'p-porsche'],
  奥美: ['奥美', 'p-ogilvy'],
  群邑: ['群邑 GroupM', 'p-groupm'],
  阳狮: ['阳狮集团', 'p-publicis'],
  麦肯光明: ['麦肯', 'p-mccann'],
  蓝色光标: ['蓝色光标', 'bluefocus-intelligent-communications-gro'],
  WPP: ['WPP', 'p-wpp'],
  wpp: ['WPP', 'p-wpp'],
  盈科: ['盈科律师事务所', 'p-yingke'],
  金杜: ['金杜律师事务所', 'p-kwm'],
  中伦: ['中伦律师事务所', 'p-zhonglun'],
  锦天城: ['锦天城律师事务所', 'p-allbright'],
  阿里: ['阿里巴巴', 'alibaba'],
  腾讯: ['腾讯', 'tencent'],
  字节: ['字节跳动', 'bytedance'],
  字节跳动: ['字节跳动', 'bytedance'],
  微软: ['微软', 'microsoft'],
  京东: ['京东', 'jd'],
  亚马逊: ['亚马逊', 'amazon'],
  谷歌: ['谷歌', 'google'],
  美团: ['美团', 'meituan'],
  百度: ['百度', 'baidu'],
  蚂蚁: ['蚂蚁集团', 'antgroup'],
  蚂蚁金服: ['蚂蚁集团', 'antgroup'],
  华为: ['华为', 'huawei'],
  网易有道: ['网易有道', 'p-youdao'],
  好未来: ['好未来 TAL', 'p-tal'],
  奥雅纳: ['奥雅纳 Arup', 'p-arup'],
  甘斯勒: ['甘斯勒 Gensler', 'p-gensler'],
  万科: ['万科', 'china-vanke'],
  华东建筑设计研究院: ['华东建筑设计研究院 ECADI', 'p-ecadi'],
  LV: ['LVMH', 'p-lvmh'],
  LVMH: ['LVMH', 'p-lvmh'],
  Dior: ['迪奥 Dior', 'christian-dior'],
  迪奥: ['迪奥 Dior', 'christian-dior'],
  Gucci: ['古驰 Gucci', 'p-gucci'],
  古驰: ['古驰 Gucci', 'p-gucci'],
  Prada: ['普拉达 Prada', 'p-prada'],
  Chanel: ['香奈儿 Chanel', 'p-chanel'],
  香奈儿: ['香奈儿 Chanel', 'p-chanel'],
  北京今日美术馆: ['今日美术馆', 'p-todayart'],
  陶氏化学: ['陶氏化学', 'dow'],
  '3M': ['3M', 'p-3m'],
  '3M材料': ['3M', 'p-3m'],
  西门子: ['西门子', 'siemens'],
  联合国开发署: ['联合国开发计划署', 'p-undp'],
  特斯拉: ['特斯拉', 'tesla'],
  希尔顿: ['希尔顿', 'p-hilton'],
  中环环保: ['中环环保', 'p-zhonghuan'],
  中科院自动化所: ['中国科学院自动化研究所', 'p-ia-cas'],
  复旦大学研究院: ['复旦大学研究院', 'p-fudan'],
};

function canon(org, key) {
  const c = CANON[org];
  return c ? { org: c[0], key: c[1] } : { org, key };
}

// 从复合名称里剥出母体（腾讯游戏运营 → 腾讯）
const BASES = Object.keys(ALIAS).sort((a, b) => b.length - a.length);

function resolveOrg(raw) {
  const name = String(raw || '').trim();
  if (!name) return null;
  // 1) 精确
  if (ALIAS[name]) return canon(name, ALIAS[name]);
  // 2) 前缀/包含
  for (const b of BASES) {
    if (name.startsWith(b)) {
      const rest = name.slice(b.length).replace(/^[-（(].*?[)）]?/, '').trim();
      const c = canon(b, ALIAS[b]);
      return { ...c, line: rest || undefined };
    }
    if (name.includes(b) && b.length >= 3) {
      const c = canon(b, ALIAS[b]);
      return { ...c, line: name.replace(b, '').replace(/^[-（）\s]+|[（）\s]+$/g, '') || undefined };
    }
  }
  return canon(name, null);
}

/* ---------- 中科院自动化所 ---------- */
const iaRows = parseCSV(path.join(SRC, '中科院自动化所.csv')).slice(2);
const iaJobs = iaRows
  .filter((r) => (r[1] || '').trim())
  .map((r, i) => ({
    org: '中国科学院自动化研究所',
    key: 'p-ia-cas',
    track: '科研实习',
    title: r[1].trim(),
    place: (r[3] || '').trim() || '北京',
    duration: (r[4] || '').trim(),
    type: (r[2] || '').trim(),
    jd: (r[5] || '').trim(),
    id: `ia-${i + 1}`,
  }));

/* ---------- 复旦研究院 ---------- */
const fdRows = parseCSV(path.join(SRC, '复旦研究院.csv')).slice(1);
const fdJobs = fdRows
  .filter((r) => (r[1] || '').trim())
  .map((r, i) => ({
    org: '复旦大学研究院',
    key: 'p-fudan',
    track: '科研实习',
    group: (r[0] || '').trim(),
    title: r[1].trim(),
    place: (r[2] || '').trim() || '上海/远程',
    jd: (r[3] || '').trim(),
    id: `fd-${i + 1}`,
  }));

/* ---------- 远程实习列表 ---------- */
const rmRows = parseCSV(path.join(SRC, '远程实习列表.csv')).slice(1);
let industry = '';
const rmJobs = [];
rmRows.forEach((r) => {
  const ind = (r[0] || '').replace(/\u3000/g, '').trim();
  if (ind) industry = ind;
  const orgRaw = (r[1] || '').trim();
  const title = (r[2] || '').trim();
  if (!orgRaw || !title) return;
  const o = resolveOrg(orgRaw);
  rmJobs.push({
    org: o.org,
    key: o.key,
    track: '远程实习',
    group: industry,
    title,
    place: '远程',
    jd: '',
    id: `rm-${rmJobs.length + 1}`,
  });
});

/* ---------- 远程岗位 JD ---------- */
const jdRows = parseCSV(path.join(SRC, '远程岗位JD.csv')).slice(1);
let ind2 = '';
const jdJobs = [];
jdRows.forEach((r) => {
  const ind = (r[0] || '').replace(/\u3000/g, '').trim();
  if (ind) ind2 = ind;
  const orgRaw = (r[1] || '').trim();
  const title = (r[2] || '').trim();
  const jd = (r[3] || '').trim();
  if (!orgRaw || !title) return;
  const o = resolveOrg(orgRaw);
  jdJobs.push({
    org: o.org,
    key: o.key,
    track: '远程实习',
    group: ind2,
    title,
    place: '远程',
    jd,
    id: `jd-${jdJobs.length + 1}`,
  });
});

/* ---------- 产品体系（价格不上站，只留档位描述） ---------- */
const research = [
  {
    tier: '人文社科 × 自然科学',
    tagline: '5 天集训 + 训前任务',
    audience: '跨学科入门',
    points: ['1 个完整的「人文社科 × 自然科学」研究项目', '掌握 1 项独立干实验技能', '3 个月后续学术思路研讨', '1 次自有论文研究思路点拨'],
    outputs: ['研究一页纸 One-Pager', '学术海报 Research Poster', '行业简报 Policy Brief'],
  },
  {
    tier: 'Nova 中阶',
    tagline: '≥64 核心课时 + 3 天进阶课程',
    audience: '理工主线 · 单专题深做',
    points: ['1 个理工主线的完整研究设计与实验路线规划', '2 项实验技能（湿实验 + 干实验）', '20 小时自有论文指导与润色', '1 年内后续学术研讨与调研数据库支持'],
    outputs: ['科研级训练总结报告（实验图集 / 实验日志 / 数据溯源）', '可复现研究代码', '自采问卷数据包', '全英文解题答辩（可选）'],
  },
  {
    tier: 'Pro 高阶',
    tagline: '≥160 核心课时 + 3 天进阶课程',
    audience: '双项目 · 冲 SCI 与申请',
    points: ['2 个完整项目的科研思路与实验路线规划', '4 项实验技能（湿 + 干）', '1 篇 SCI 写作辅导与润色，不限时', '3 年内学术研讨与调研数据库支持'],
    outputs: ['研究报告 RP 底稿', '检索式与分类文献清单', '规范科研图与图注', '科研助理智能体', '90 秒研究自述 / 套磁信 / 学术面试辅导'],
  },
  {
    tier: '课题研究（SCI / CCF）',
    tagline: '真实在研课题 · 周期 12–18 个月',
    audience: '需署名成果',
    points: ['企业真实在研课题，学生真实参与并完成对应研究任务', '按 JCR Q4 区标准预收录，发表后按实际分区补差价', '署名位置分第一作者 / 共同一作 / 第二—四作者三档', '周期正常 12–18 个月，需加急 case by case'],
    outputs: ['论文署名（首位次位分级）', 'Research Proposal 辅导', '学术面试专业辅导', '科研用途数据库调用权', '实习 / 实践证明'],
  },
];

const youth = [
  { name: '启蒙项目', days: '1 天', note: '轻量入门，真实实验室初体验' },
  { name: '启蒙项目', days: '2 天', note: '轻量入门，真实实验室初体验' },
  { name: '科学营', days: '4 天', note: '短期集中，完成一个完整实验项目' },
  { name: '科学营', days: '5 天', note: '深度沉浸，完整科研流程训练' },
  { name: '科学营', days: '6 天', note: '进阶挑战，完整课题研究与成果产出' },
];

const career = [
  {
    name: '单段实训',
    sub: '职能岗 / 干实验 / 湿实验',
    points: ['真实职能岗项目经历，含测评 1 份', '生信 · 数据挖掘方向真项目', '研发级实验室，耗材全含'],
  },
  {
    name: '专业领航长线',
    sub: '大一 → 大四 逐级进阶',
    points: ['单方向深耕至硕士毕业', '课题参与按真实贡献署名', '实训 ≥ 2 段，可含联合培养企业'],
  },
  {
    name: '管培生',
    sub: '大一 → 大四 逐级进阶',
    points: ['不限专业，参与企业运营管理职能', '按正常管培生培养'],
  },
  {
    name: '求职陪跑',
    sub: '简历 / 技能 / 面试 / 高管辅导逐级叠加',
    points: ['职前技能培训：通用技能 + 行业技能 + 实战项目', '竹石人才测评，数据长期归档', 'AI 科研能力面试，六维追问检验掌握度'],
  },
  {
    name: '定向输送 + 联合培养',
    sub: '常规岗位 / 热门高薪前沿岗位',
    points: ['按定向输送与联合培养模式', '涵盖职前培训、岗位实训及入职后 6 个月咨询辅导'],
  },
];

/* ---------- 去重合并（同机构 + 同岗位 + 同方向视为一条，保留信息最全的） ---------- */
const merged = new Map();
[...iaJobs, ...fdJobs, ...rmJobs, ...jdJobs].forEach((j) => {
  const k = [j.org, j.title, j.group || ''].join('||');
  const cur = merged.get(k);
  if (!cur) { merged.set(k, { ...j }); return; }
  if ((j.jd || '').length > (cur.jd || '').length) cur.jd = j.jd;
  if (!cur.duration && j.duration) cur.duration = j.duration;
  if (!cur.type && j.type) cur.type = j.type;
  if (!cur.place && j.place) cur.place = j.place;
  if (!cur.key && j.key) cur.key = j.key;
});
const all = [...merged.values()];

/* ---------- 统计与输出 ---------- */
const orgCount = {};
all.forEach((j) => (orgCount[j.org] = (orgCount[j.org] || 0) + 1));
const orgs = Object.entries(orgCount)
  .sort((a, b) => b[1] - a[1])
  .map(([org, n]) => {
    const sample = all.find((j) => j.org === org);
    return { org, n, key: sample.key, logo: logoOf(sample.key) };
  });

const payload = {
  updated: '2026-10',
  source: '竹石创新研究院 4.0（BamRock）',
  stats: { total: all.length, orgs: orgs.length, ia: iaJobs.length, fd: fdJobs.length, remote: rmJobs.length + jdJobs.length },
  orgs,
  research,
  youth,
  career,
  jobs: all.map((j) => ({ ...j, logo: logoOf(j.key) })),
};

fs.writeFileSync(path.join(ROOT, 'assets/partner.js'), '/* 由 build-partner-data 生成：竹石 4.0 合作项目与实习岗位 */\nwindow.__PARTNER = ' + JSON.stringify(payload) + ';\n');

console.log('岗位总数', all.length, '机构', orgs.length);
console.log('无 logo 机构:', orgs.filter((o) => !o.logo).map((o) => o.org).join(' / ') || '无');
console.log('输出', (fs.statSync(path.join(ROOT, 'assets/partner.js')).size / 1024).toFixed(0) + ' KB');

#!/usr/bin/env node
/**
 * 财富 500 强 → 公司名录（companies.json）构建流水线
 *
 * 数据源：财富中文网 2026 榜单
 *   中国 500 强全表：https://www.fortunechina.com/fortune500/c/2026-07/21/content_475324.htm
 *     公司详情页 /china500/{id}/2026 含「中文名 + 官网地址」（curl 可直取，需浏览器 UA）
 *   世界 500 强全表：https://www.fortunechina.com/fortune500/c/2026-07/28/content_475298.htm
 *     表格已含中英文名/国家/营收利润；详情页有 JS 守卫，官网域名改用 Clearbit 名称补全解析
 *
 * 用法：
 *   node scripts/build-fortune-500.mjs               # 全流程（有缓存则复用，增量安全）
 *   node scripts/build-fortune-500.mjs --stage lists # 只抓榜单与详情页
 *   node scripts/build-fortune-500.mjs --stage domains # 只补官网域名
 *   node scripts/build-fortune-500.mjs --stage merge   # 只做去重/分类/写回 companies.json
 *   node scripts/build-fortune-500.mjs --refresh      # 忽略缓存重抓
 *
 * 产出：.fortune-cache/{parsed,domains,merged}.json（缓存，不入库）
 *       scripts/companies.json（与原有条目合并，原有条目的手工字段保持不变）
 *
 * 注：本机 curl 需加 -4（IPv6 连接会挂死）；Node fetch 对部分主机 TLS 失败，故统一走 curl。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

const ROOT = process.cwd();
const CACHE = path.join(ROOT, '.fortune-cache');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const CN_LIST = 'https://www.fortunechina.com/fortune500/c/2026-07/21/content_475324.htm';
const GLOBAL_LIST = 'https://www.fortunechina.com/fortune500/c/2026-07/28/content_475298.htm';

const argv = process.argv.slice(2);
const stageArg = argv.indexOf('--stage');
const STAGE = stageArg >= 0 ? argv[stageArg + 1] : 'all';
const REFRESH = argv.includes('--refresh');

fs.mkdirSync(CACHE, { recursive: true });

/* ---------- 基础工具 ---------- */
const decode = (s) =>
  String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
const textOf = (html) => decode(html.replace(/<[^>]+>/g, ' '));

function curlText(url, timeout = 45) {
  return new Promise((resolve) => {
    execFile('curl', ['-s', '-L', '-4', '-m', String(timeout), '-A', UA, url], { maxBuffer: 64 << 20, encoding: 'utf8' }, (err, stdout) => {
      resolve(err || !stdout ? null : stdout);
    });
  });
}
function curlJSON(url, timeout = 20) {
  return new Promise((resolve) => {
    execFile('curl', ['-s', '-L', '-4', '-m', String(timeout), '-A', UA, url], { maxBuffer: 16 << 20, encoding: 'utf8' }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve(null);
      }
    });
  });
}
async function pool(items, n, fn) {
  let i = 0;
  const workers = Array.from({ length: n }, async () => {
    while (i < items.length) await fn(items[i++]);
  });
  await Promise.all(workers);
}

/* ---------- 阶段 1：抓榜单 + 详情页 ---------- */
async function stageLists() {
  const cnListPath = path.join(CACHE, 'list-cn500.html');
  const globalListPath = path.join(CACHE, 'list-global500.html');
  if (REFRESH || !fs.existsSync(cnListPath)) {
    console.log('① 抓取中国 500 强全表 …');
    const html = await curlText(CN_LIST);
    if (!html || html.length < 50000) throw new Error('中国 500 强列表抓取失败');
    fs.writeFileSync(cnListPath, html);
  }
  if (REFRESH || !fs.existsSync(globalListPath)) {
    console.log('② 抓取世界 500 强全表 …');
    const html = await curlText(GLOBAL_LIST);
    if (!html || html.length < 50000) throw new Error('世界 500 强列表抓取失败');
    fs.writeFileSync(globalListPath, html);
  }

  const cnHtml = fs.readFileSync(cnListPath, 'utf8');
  const cnRows = (cnHtml.match(/<tr><td>[\s\S]*?<\/tr>/gi) || []).map((r) => {
    const cells = [...r.matchAll(/<td>([^<]*)<\/td>/g)].map((m) => decode(m[1]));
    return {
      id: parseInt((r.match(/data-company-id="(\d+)"/) || [])[1], 10),
      rank: parseInt(cells[0], 10),
      lastRank: parseInt(cells[1], 10),
      en: decode((r.match(/target="_blank">([^<]+)<\/a>/) || [])[1]),
      rev: cells[2],
      profit: cells[3],
    };
  });
  if (cnRows.length !== 500) console.warn(`  注意：中国榜解析到 ${cnRows.length} 行（预期 500）`);

  // 详情页（含中文名 + 官网）
  const todo = cnRows.filter((r) => REFRESH || !fs.existsSync(path.join(CACHE, `${r.id}.html`)));
  if (todo.length) console.log(`③ 抓取 ${todo.length} 个公司详情页 …`);
  let done = 0;
  await pool(todo, 6, async (r) => {
    const dest = path.join(CACHE, `${r.id}.html`);
    const html = await curlText(`https://www.fortunechina.com/china500/${r.id}/2026`, 45);
    if (html && html.length > 2000) fs.writeFileSync(dest, html);
    if (++done % 100 === 0) console.log(`  详情 ${done}/${todo.length}`);
  });

  const cn = cnRows.map((r) => {
    const f = path.join(CACHE, `${r.id}.html`);
    const rec = { ...r, zh: '', web: '', city: '', emp: '', list: '中国500' };
    if (fs.existsSync(f)) {
      const h = fs.readFileSync(f, 'utf8');
      const title = textOf((h.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
      const m = title.match(/^(.+?)\s*[（(]?[A-Z0-9][^（(]*?(?:\(中国500强)/);
      if (m) rec.zh = decode(m[1]);
      rec.web = decode((h.match(/官方网站：<\/div>\s*<div class="value"><a href='([^']+)'/) || [])[1]);
      rec.city = decode((h.match(/城市：<\/div>\s*<div class="value">([^<]*)</) || [])[1]);
      rec.emp = decode((h.match(/员工数：<\/div>\s*<div class="value">([^<]*)</) || [])[1]);
    }
    return rec;
  });

  // 世界 500 强：表格里就是「中文名（ENGLISH）」
  const gHtml = fs.readFileSync(globalListPath, 'utf8');
  const global = (gHtml.match(/<tr><td>[\s\S]*?<\/tr>/gi) || []).map((r) => {
    const cells = [...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => textOf(m[1]));
    const nameCell = cells[1];
    let zh = '';
    let en = nameCell;
    const fi = nameCell.lastIndexOf('（');
    if (fi > 0) {
      zh = nameCell.slice(0, fi).trim();
      en = nameCell.slice(fi + 1).replace(/[）)\s]+$/, '').trim();
      if ((en.match(/\(/g) || []).length > (en.match(/\)/g) || []).length) en += ')';
    } else {
      const mm = nameCell.match(/^(.*\S)\s*\(([A-Z][\s\S]*)\)\s*$/);
      if (mm) {
        zh = mm[1].trim();
        en = mm[2].trim();
      }
    }
    return {
      rank: parseInt(cells[0], 10),
      zh,
      en,
      country: cells[4],
      rev: cells[2],
      profit: cells[3],
      list: '世界500',
    };
  });
  if (global.length !== 500) console.warn(`  注意：世界榜解析到 ${global.length} 行（预期 500）`);

  fs.writeFileSync(path.join(CACHE, 'parsed.json'), JSON.stringify({ cn, global }, null, 1));
  console.log(`✔ 中国500强 ${cn.length} 家（官网 ${cn.filter((x) => x.web).length}） / 世界500强 ${global.length} 家`);
}

/* ---------- 名称归一化 ---------- */
const SUFFIX = /股份有限公司|有限责任公司|有限公司|控股集团|控股公司|集团公司|集团|控股|公司|总公司|co\.,? ?ltd\.?|inc\.?|corp\.?|corporation|company|group|holdings?|holding|limited|ltd\.?|plc|s\.?a\.?|ag|se|nv|the\b/gi;
const stripZh = (s) => decode(s).replace(/（[^）]*）|\([^)]*\)/g, '').replace(SUFFIX, '').replace(/[\s·．.、,，]/g, '').trim();
const stripEn = (s) => decode(s).toLowerCase().replace(/（[^）]*）|\([^)]*\)/g, '').replace(SUFFIX, '').replace(/[^a-z0-9]/g, '');
const normEn = (s) => decode(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
const rootDomain = (d) =>
  decode(d).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    .replace(/\.(com|cn|net|org|co|hk|jp|de|fr|uk|tw|kr|in|ch|nl|au|ca|es|it|se|sg)(\.[a-z]{2})?$/, '')
    .replace(/[^a-z0-9]/g, '');

function matchScore(a, b) {
  const az = stripZh(a.zh ?? a.nameZh);
  const ae = stripEn(a.en ?? a.name);
  const ad = rootDomain(a.web ?? a.domain);
  const bz = stripZh(b.zh ?? b.nameZh);
  const be = stripEn(b.en ?? b.name);
  const bd = rootDomain(b.web ?? b.domain);
  let s = 0;
  if (az && bz && (az === bz || (az.length >= 3 && bz.length >= 3 && (az.includes(bz) || bz.includes(az))))) s += 4;
  if (ae && be && ae === be) s += 4;
  else if (ae && be && ae.length >= 6 && be.length >= 6 && (ae.includes(be) || be.includes(ae))) s += 2;
  if (ad && bd && (ad === bd || (ad.length >= 6 && bd.length >= 6 && (ad.includes(bd) || bd.includes(ad))))) s += 4;
  return s;
}

/* ---------- 阶段 2：官网域名（Clearbit 名称补全） ---------- */
const DOMAIN_FIX = {
  CENCORA: 'cencora.com', 'CIGNA GROUP': 'cigna.com', 'TRAFIGURA GROUP': 'trafigura.com',
  'META PLATFORMS': 'meta.com', 'VERIZON COMMUNICATIONS': 'verizon.com', 'GOLDMAN SACHS GROUP': 'goldmansachs.com',
  'HUAWEI INVESTMENT & HOLDING': 'huawei.com', 'ROYAL AHOLD DELHAIZE': 'aholddelhaize.com', 'ROSNEFT OIL': 'rosneft.com',
  'NIPPON LIFE INSURANCE': 'nissay.co.jp', 'XIAMEN C&D': 'chinacnd.com', 'MITSUBISHI UFJ FINANCIAL GROUP': 'mufg.jp',
  'DHL GROUP': 'dhl.com', 'UNITED PARCEL SERVICE': 'ups.com', 'TORONTO-DOMINION BANK': 'td.com',
  'ITAÚ UNIBANCO HOLDING': 'itau.com.br', 'JAPAN POST HOLDINGS': 'japanpost.jp', 'DAIICHI LIFE GROUP': 'dai-ichi-life.co.jp',
  'ALIMENTATION COUCHE-TARD': 'couche-tard.com', 'BUNGE GLOBAL': 'bunge.com', 'CAPITAL ONE FINANCIAL': 'capitalone.com',
  'OIL & NATURAL GAS': 'ongcindia.com', 'INTERNATIONAL BUSINESS MACHINES': 'ibm.com', 'ASSICURAZIONI GENERALI': 'generali.com',
  'ENEOS HOLDINGS': 'eneos.co.jp', 'EDEKA ZENTRALE': 'edeka.de', 'SHAANXI COAL & CHEMICAL INDUSTRY': 'shccig.com',
  'TOKIO MARINE HOLDINGS': 'tokio-marine.co.jp', 'RIO TINTO GROUP': 'riotinto.com', 'CRÉDIT MUTUEL GROUP': 'creditmutuel.fr',
  'CISCO SYSTEMS': 'cisco.com', 'BANK OF MONTREAL': 'bmo.com', 'DAIMLER TRUCK HOLDING': 'daimlertruck.com',
  'PANASONIC HOLDINGS': 'panasonic.com', 'ENTERPRISE PRODUCTS PARTNERS': 'enterpriseproducts.com',
  'ELECTRICITÉ DE FRANCE': 'edf.fr', 'LIFE INSURANCE CORP. OF INDIA': 'licindia.in', 'X5 GROUP': 'x5.ru',
  'MASSACHUSETTS MUTUAL LIFE INSURANCE': 'massmutual.com', 'PLAINS GP HOLDINGS': 'plains.com',
  'J. SAINSBURY': 'sainsburys.co.uk', 'FOMENTO ECONÓMICO MEXICANO': 'femsa.com', 'ZF FRIEDRICHSHAFEN': 'zf.com',
  'BANK OF NEW YORK (BNY)': 'bny.com', 'ENERGIE BADEN-WÜRTTEMBERG': 'enbw.com', 'NATIONAL AUSTRALIA BANK': 'nab.com.au',
  'MONDELEZ INTERNATIONAL': 'mondelez.com', 'LANDESBANK BADEN-WÜRTTEMBERG': 'lbbw.de',
  'CHINA PACIFIC INSURANCE (GROUP)': 'cpic.com.cn', 'SHAANXI YANCHANG PETROLEUM (GROUP)': 'ycpc.com.cn',
  'INDUSTRIAL & COMMERCIAL BANK OF CHINA': 'icbc.com.cn',
};

async function stageDomains() {
  const parsed = JSON.parse(fs.readFileSync(path.join(CACHE, 'parsed.json'), 'utf8'));
  const outPath = path.join(CACHE, 'domains.json');
  const store = fs.existsSync(outPath) && !REFRESH ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {};
  const cnEn = new Set(parsed.cn.map((c) => stripEn(c.en)));
  const targets = parsed.global.filter((g) => !cnEn.has(stripEn(g.en)));
  const todo = targets.filter((g) => !store[g.en]);
  console.log(`④ 解析世界榜官网域名：待查 ${todo.length} / ${targets.length}`);

  const query = async (name) => {
    const key = stripEn(name);
    let best = null;
    let bestScore = 0;
    const list = await curlJSON('https://autocomplete.clearbit.com/v1/companies/suggest?query=' + encodeURIComponent(name));
    for (const c of list || []) {
      const n = stripEn(c.name);
      let s = 0;
      if (n === key) s = 4;
      else if (n.length >= 4 && key.length >= 4 && (n.startsWith(key) || key.startsWith(n))) s = 3;
      else if (n.includes(key) || key.includes(n)) s = 2;
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    return bestScore >= 2 && best ? best.domain : '';
  };

  let done = 0;
  await pool(todo, 4, async (g) => {
    let domain = await query(g.en);
    if (!domain) {
      // 去掉 GROUP / HOLDINGS / 变音符后再试一次
      const alt = g.en.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' ')
        .replace(/\b(GROUP|HOLDINGS?|CORPORATION|COMPANY|PLATFORMS?|COMMUNICATIONS?|INTERNATIONAL)\b/gi, '')
        .replace(/\s+/g, ' ').trim();
      if (alt && alt !== g.en) domain = await query(alt);
    }
    store[g.en] = { domain: domain || DOMAIN_FIX[decode(g.en).toUpperCase()] || '' };
    if (++done % 50 === 0) console.log(`  域名 ${done}/${todo.length}`);
  });
  fs.writeFileSync(outPath, JSON.stringify(store, null, 1));
  const hit = targets.filter((g) => store[g.en]?.domain).length;
  console.log(`✔ 官网域名命中 ${hit} / ${targets.length}`);
}

/* ---------- 阶段 3：去重、分类、写回 companies.json ---------- */
const RULES = [
  ['金融科技', /\bvisa\b|mastercard|paypal|fiserv|\bfis\b|global payments|fintech|支付|蚂蚁|ant group|adyen|nexi|block inc/i],
  ['金融', /bank|banc|insur|assur|reinsur|securit|broker|asset manage|investment|capital|financ|mortgage|credit|leasing|银行|保险|证券|信托|基金|资产管理|金融|人寿|财险|投资|金控|交易所|期货|租赁|农商行|村镇银行/i],
  ['咨询', /consult|advisory|audit|accounting|mckinsey|\bbain\b|boston consulting|deloitte|pwc|kpmg|ernst|accenture|cognizant|咨询|会计师/i],
  ['医药与健康', /pharma|biotech|biolog|health|hospital|medical|medicine|drug|clinic|diagnos|therap|医药|药业|生物|医疗|健康|制药|疫苗|诊断|大药房|genomics|石药|同仁堂|云南白药|片仔癀/i],
  ['快消与零售', /retail|supermarket|grocery|food|beverage|brew|beer|spirit|wine|coca|pepsi|nestl|unilever|procter|mondelez|danone|kraft|general mills|kellogg|apparel|fashion|clothing|shoe|luxury|cosmetic|loreal|household|consumer|tobacco|dairy|coffee|restaurant|hotel|catering|超市|食品|乳业|酒业|啤酒|白酒|茅台|服饰|日化|零售|百货|商贸|粮油|餐饮|酒店|免税|牧业|饲料|肉制品|饮料|烟草|统一企业|旺旺|康师傅|蒙牛|伊利|农夫山泉|海底捞|永辉/i],
  ['互联网', /internet|online|e-commerce|ecommerce|platform|social network|search engine|门户|网络科技|电商|互联网|在线|传媒|media|entertainment|netflix|disney|广告|传播|文旅|数字内容|贝壳|ke holdings|卓尔/i],
  ['游戏', /game|gaming|游戏|互娱|电竞/i],
  ['人工智能', /artificial intelligence|openai|anthropic|deepmind|人工智能|智能驾驶/i],
  ['新能源与汽车', /motor|automotive|automobile|\bauto\b|vehicle|battery|electric vehicle|tire|汽车|锂|动力电池|整车|吉利|geely|赛力斯|seres|重汽|sinotruk|万向|wanxiang|长城汽车|长安汽车|东风汽车|奇瑞/i],
  ['交通与物流', /logistic|freight|shipping|courier|express|airline|airway|air lines|railway|rail\b|transport|truck|maritime|\bport\b|物流|海运|航运|航空|铁路|运输|港口|快递|机场|邮政|高速|外运|sinotrans|中远|cosco|招商局|地铁|轨道/i],
  ['建筑与基建', /construction|engineering|building material|cement|infrastructure|real estate|property|architect|建筑|建设|基建|房地产|置业|地产|水泥|建材|工程|施工|勘察|万科|vanke|绿地|greenland|碧桂园|country garden|龙湖|longfor|绿城|greentown|海螺|conch|华润置地|保利发展|招商蛇口/i],
  ['能源与化工', /oil|petro|petroleum|\bgas\b|energy|power|electric util|utilit|coal|mining|\bmine\b|chemical|refin|solar|wind power|nuclear|grid|石油|天然气|能源|电力|电网|煤|矿业|化工|化学|核电|燃气|黄金|gold|钼|molybdenum|镍|nickel|光伏|风电|恒力|hengli|荣盛|rongsheng|盛虹|shenghong|恒逸|hengyi|桐昆|tongkun|新凤鸣|通威|tongwei|中油|cpc|晋能|jinneng|陕煤|兖矿|潞安|同煤/i],
  ['硬件与通信', /semiconductor|electronic|telecom|communicat|network equipment|display|chip|optoelectr|家电|通信|电子|半导体|光电|芯片|手机|集成电路|面板|电器|海尔|haier|美的|midea|格力|gree|海信|hisense|\btcl\b|铁塔|tower|亨通|hengtong|歌尔|goertek|立讯|luxshare|鸿海|hon hai|纬创|wistron|英业达|inventec|仁宝|compal|广达|quanta|和硕|pegatron|联想|lenovo|中兴|zte|京东方|boe/i],
  ['制造与材料', /steel|metal|aluminium|aluminum|copper|machinery|industrial|equipment|heavy industr|shipbuild|defense|defence|aerospace|\barms\b|paper|packaging|glass|textile|机械|装备|重工|材料|有色|造纸|包装|船舶|军工|航天|钢铁|稀土|rare earth|钢|沙钢|shagang|首钢|shougang|河钢|hbis|建龙|德龙|敬业|jingye|宏桥|hongqiao|铝业|铜业|金川|jinchuan|魏桥|weiqiao|特变|tbea|中集|cimc|三一|徐工|潍柴|weichai|中国中车|crrc/i],
  ['贸易与供应链', /trading|trader|supply chain|distribution|wholesale|进出口|国贸|建发|c&d|象屿|xmxyg|物产|中大|zhongda|贸易|供应链|经销|中升|zhongsheng|怡和|jardine|托克|trafigura|嘉能可|glencore/i],
  ['国际科技', /software|technolog|tech\b|cloud|computer|systems|digital|solutions|information|it services|科技|软件|信息|数码|云计算/i],
];

function classify(rec, map) {
  const hit = map.get(normEn(rec.en));
  if (hit) return hit;
  const hay = `${rec.zh || ''} ${rec.en || ''}`;
  for (const [bucket, re] of RULES) if (re.test(hay)) return bucket;
  return '综合集团';
}

function stageMerge() {
  const parsed = JSON.parse(fs.readFileSync(path.join(CACHE, 'parsed.json'), 'utf8'));
  const domains = fs.existsSync(path.join(CACHE, 'domains.json')) ? JSON.parse(fs.readFileSync(path.join(CACHE, 'domains.json'), 'utf8')) : {};
  const indMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'fortune-industry-map.json'), 'utf8'));
  const map = new Map();
  for (const [k, v] of Object.entries(indMap)) if (!k.startsWith('_')) map.set(normEn(k), v);

  const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'companies.json'), 'utf8'));
  const before = doc.companies.length;

  const poolRecs = [
    ...parsed.cn.map((c) => ({ ...c, list: '中国500' })),
    ...parsed.global.map((c) => ({ ...c, list: '世界500' })),
  ];

  // 榜单内部去重：中国榜优先（有官网字段）
  const dropped = new Set();
  const cnIdx = poolRecs.map((p, i) => ({ p, i })).filter((x) => x.p.list === '中国500');
  poolRecs.forEach((p, i) => {
    if (p.list !== '世界500' || dropped.has(i)) return;
    let best = 0;
    for (const { p: q } of cnIdx) best = Math.max(best, matchScore(p, q));
    if (best >= 4) dropped.add(i);
  });
  const inner = dropped.size;

  // 与现有条目去重
  doc.companies.forEach((e) => {
    let bi = -1;
    let bs = 0;
    poolRecs.forEach((p, i) => {
      if (dropped.has(i)) return;
      const s = matchScore(e, p);
      if (s > bs) {
        bs = s;
        bi = i;
      }
    });
    if (bi >= 0 && bs >= 4) dropped.add(bi);
  });

  const news = poolRecs.filter((_, i) => !dropped.has(i));
  const used = new Set(doc.companies.map((c) => c.slug));
  const slugify = (s) => decode(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const mkSlug = (r) => {
    let base = slugify(r.en);
    if (!/[a-z]{3}/.test(base)) base = r.list === '世界500' ? `g500-${r.rank}` : `cn500-${r.rank}`;
    let s = base;
    let n = 2;
    while (used.has(s)) s = `${base}-${n++}`;
    used.add(s);
    return s;
  };

  const added = news.map((r) => {
    let domain = decode(r.list === '中国500' ? r.web : domains[r.en]?.domain || '')
      .replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
    if (!domain) domain = DOMAIN_FIX[decode(r.en).toUpperCase()] || '';
    const rec = {
      slug: mkSlug(r),
      name: r.en,
      nameZh: r.zh || r.en,
      domain,
      industry: classify(r, map),
      fortune: r.list,
      rank: r.rank,
    };
    if (r.country && r.country !== '中国') rec.country = r.country;
    return rec;
  });

  const order = ['互联网','人工智能','游戏','硬件与通信','新能源与汽车','交通与物流','建筑与基建','能源与化工','制造与材料','贸易与供应链','国际科技','金融科技','金融','咨询','快消与零售','医药与健康','综合集团'];
  added.sort((a, b) => order.indexOf(a.industry) - order.indexOf(b.industry) || a.rank - b.rank);
  doc.companies = [...doc.companies, ...added];
  fs.writeFileSync(path.join(ROOT, 'scripts', 'companies.json'), JSON.stringify(doc, null, 2) + '\n');

  const dist = {};
  doc.companies.forEach((c) => (dist[c.industry] = (dist[c.industry] || 0) + 1));
  console.log(`✔ 两榜重叠 ${inner} 家；新增 ${added.length} 家；companies.json 现共 ${doc.companies.length} 家（原 ${before}）`);
  console.log(dist);
  const noDomain = added.filter((a) => !a.domain).length;
  if (noDomain) console.log(`  提示：${noDomain} 家没有官网域名（logo 会用文字徽标占位）`);
}

/* ---------- 主流程 ---------- */
const run = async () => {
  if (STAGE === 'lists' || STAGE === 'all') await stageLists();
  if (STAGE === 'domains' || STAGE === 'all') await stageDomains();
  if (STAGE === 'merge' || STAGE === 'all') stageMerge();
};
run().catch((e) => {
  console.error('✘', e.message);
  process.exit(1);
});

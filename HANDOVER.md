# HANDOVER — 新电脑无缝衔接交接书

> 本文件是给「新电脑上的 AI」看的。读完即可接手全部工作，不需要旧电脑的任何文件。
> 上线正式版对外发布前，可以删除本文件。

## 项目是什么

**fanke-research-hub**（泛柯科研库 + 求职板块），GitHub: `loklam666/fanke-research-hub`（main 分支）

- `index.html` — 科研主站（单文件 SPA，泛柯橙 `#F4532B`）：871 个科研项目（源站 2026-10 实时拉取，此前记录为 935），从 Path Academics 站点（sou-tools.gecacademy.cn）逆向同步，含搜索/筛选/详情弹窗/汇总长图；四个视图 = 项目库 / 汇总长图 / **科研培养体系**（合作渠道产品档位）/ **合作科研专题**（竹石创研院小程序专题，有数据才出现）
- `jobs.html` — 实习·求职板块 v0.2（蓝色主题 `#2E6FF2`）：企业名录（934 家 logo 墙，2026 世界500强 + 中国500强全量）/ **实习岗位库（335 个真实岗位 · 90 家合作机构）** / **人才培养与求职服务（5 条路径）** / 招聘日历（示例占位）/ 资源精选（示例占位）
- `logos.html` — logo 素材库预览页（按行业分组）
- `winter.html` — 2027 寒假项目页（泛柯橙）：**41 个项目** = 义工游学 19（国内义工 8 / 国际义工 9 / 国际游学 2）+ 实习课程 22（名企实习实训 11 / 名校访学·大学班 8 / 名校访学·高中班 3）；标签页 + 分类筛选 + 关键词搜索；数据在 `assets/winter.js`（`window.__WINTER`）

## 新机器首次上手（必做）

```bash
node scripts/sync.mjs     # 重新生成 data/、assets/data.js、assets/details.js（几分钟）
node scripts/sync.mjs --skip-details   # 快速版：只要列表不要详情
npx serve .               # 本地预览；或 python -m http.server 8642
```

- 项目**零依赖**：没有 package.json，不要 npm install，只需 Node ≥ 18
- `.gitignore` 掉了 data/ 和 assets/data.js、details.js —— **clone 后不跑 sync 就没有科研数据**
- logo 库（assets/logos/，189 个文件）已在仓库里，无需重新抓

## 数据管道

- 同步脚本 `scripts/sync.mjs`，目标 API `https://gec-api.gecacademy.cn/souapi`（POST JSON，免鉴权）
  - 列表：`{"page":1,"limit":1000}`，`typeIdList:[56]/[57]/[49]/[5,38]` 过滤分类
  - 详情：`POST /course/query/share {id}`（`/course/query/detail` 需登录不可用）
  - 图片在阿里云 OSS：URL 加 `?x-oss-process=image/resize,w_800,m_lfit/format,jpg/quality,q_85` 提清晰度，前端 `oss()` / `coverURL()` 已封装
- 前端数据包：`assets/data.js`、`details.js`、`logos.js` 挂 `window.__DATA` 等全局，`<script>` 加载，file:// 直接可用；details.js（5.6MB）由详情弹窗首次打开时动态注入懒加载

## 公司 logo 库（求职板块用）

- 清单：`scripts/companies.json`（**934 家** = 2026《财富》世界500强 + 中国500强并集 876 家 + 原有 204 家中非榜单公司 58 家）
- 字段：`slug / name / nameZh / domain / industry`；榜单公司额外带 `fortune`（`世界500`/`中国500`）与 `rank`（榜内排名），前端卡片右上角渲染排名角标
- 行业 17 类：互联网、人工智能、游戏、硬件与通信、新能源与汽车、交通与物流、建筑与基建、能源与化工、制造与材料、贸易与供应链、国际科技、金融科技、金融、咨询、快消与零售、医药与健康、综合集团
- 采集：`node scripts/fetch-logos-bulk.mjs`（curl 并发，`LOGO_CONCURRENCY`/`LOGO_TIMEOUT` 可调，强制 `-4` IPv4——本机 IPv6 会挂死）；少量新增用 `node scripts/fetch-logos.mjs`（增量）
- 三处行业 `order` 数组必须同步：`jobs.html` / `logos.html` / `fetch-logos.mjs`（`fetch-logos-bulk.mjs` 里也有一份）
- 抓不到官网图标的自动降级首字徽标（monogram），不影响页面；缺图清单在 `.fortune-cache/logo-missing.txt`

### 500 强名单抓取要点（已跑通，年度更新照做）

- 财富中文网**列表落地页有反爬 JS 守卫，内容详情页 curl 可直取**（带浏览器 UA）
- 中国 500 强全表：`/fortune500/c/2026-07/21/content_475324.htm`（500 行静态表格 → `/china500/{id}/2026` 详情页含中文名 + 官网 `www.xxx.com`）
- 世界 500 强全表：`/fortune500/c/2026-07/28/content_475298.htm`（表格已含中英文名 + 国家 + 营收利润；**详情页有 JS 守卫不可直取**）
- 世界榜官网域名 → Clearbit 名称补全 `https://autocomplete.clearbit.com/v1/companies/suggest?query=名称`（免鉴权，命中率 ~93%，剩余手工补在脚本 `DOMAIN_FIX`）
- Wikidata（wikipedia/wikidata API）本机不稳定、批量会被限速，仅作备选
- 去重：公司名归一化（去「集团/股份/有限公司/holdings/inc」等）后比对，中国榜优先（有官网字段）；两榜自身重叠 124 家
- 分类：关键词规则 + `scripts/fortune-industry-map.json` 人工校订（295 条，主要覆盖外企与投资控股类）

## 合作渠道数据（竹石 4.0）

- 数据包 `assets/partner.js`（挂 `window.__PARTNER`，约 196 KB）由 `node scripts/build-partner-data.mjs` 生成，输入是 `scripts/partner-src/*.csv`（源表：中科院自动化所 / 复旦研究院 / 远程实习列表 / 远程岗位 JD / **专题清单**，共 351 行 + 专题；换新一期物料用 `PARTNER_SRC` 指向新目录）
- 结构：`{ updated, source, stats, orgs, research, youth, career, topics, jobs }`
  - `jobs[]`：`{ org, key, track(科研实习|远程实习), group(方向或行业), title, place, duration, type, jd, id, logo }`
  - `orgs[]`：`{ org, n, key, logo }`，**90 家**（按岗位数降序）
  - `research[]` 四档科研体系、`youth[]` 五档青少年营、`career[]` 五条求职路径 —— **只写课时与产出，不写价格**
  - `topics[]`：`{ id, subject(学科), title(专题名称), tags[](方向标签，｜分隔), status, mode(参与方式), rhythm(开课节奏), desc }` —— 合作科研专题，来源 `scripts/partner-src/专题清单.csv`；**文件不存在则 topics 为空、前端不注册「合作科研专题」导航**
- 生成时的三个关键处理：
  1. `ALIAS` 把简称/复合名映射成 logo slug（`腾讯游戏运营 → tencent`、`古驰市场部意大利 → p-gucci`）
  2. `CANON` 把简称补成全称并合并同义机构（`招商 → 招商证券`、`中信/中信投行 → 中信证券`、`LV/LVMH → LVMH`）
  3. 去重键 `org|title|group`，保留信息最全的一条（远程列表无 JD、远程 JD 表有 JD，靠这步合并）
- 合作机构 logo 用 `p-` 前缀单独抓（`node scripts/fetch-partner-logos.mjs`），不污染企业名录；抓不到的降级字母徽标
- 首页展示：`index.html` 第三视图「科研培养体系」渲染 `research` + `youth`、第四视图「合作科研专题」渲染 `topics`（数据来自 `专题清单.csv`，空则不显示）；`jobs.html` 渲染 `jobs` + `orgs` + `career`

## 寒假项目（2027）

- 页面 `winter.html`，数据 `assets/winter.js`（挂 `window.__WINTER`），源为用户提供的渠道 2027 寒假项目表（两批明细 + 两张官方汇总表）
- 结构：`{ updated, source, groups[2], stats{total,volunteer,intern}, items[] }`
  - `items[]`：`{ id, group(volunteer|intern), cat, name, place, duration, mode(线下|线上|远程), age, hours, minGroup, headcount, lang, batches[], outputs[], inc[], exc[], note }`
  - 分类：义工游学 = 国内义工 / 国际义工 / 国际游学；实习课程 = 名企实习实训 / 名校访学·大学班 / 名校访学·高中班
- **报价处理（重点）**：售价 / 底价 / 住宿费不入明文，统一编码成 base64 存 `window.__WINTER_PRICES_B64`；页面默认不显示，**按 `P` 键解码并显示到每张卡片的橙色价格行，按 `Esc` 关闭**。这是"默认隐藏 + 快捷键查看"，属于防随手查看的混淆，不是加密——明文在源码里不存在，但懂技术的人解码 base64 仍可还原，敏感程度高时不要上公开域名
- 更新价格：改 winter.js 末尾的 base64 串（用 `Buffer.from(JSON.stringify({id:{s:售价,f:底价,l:住宿}})).toString('base64')` 重新生成）

## 设计规范（延续）

- 主站橙 `#F4532B`，求职蓝 `#2E6FF2`；杂志感卡片布局，无 emoji，中文直给
- 泛柯 logo 内嵌 base64；卡片封面用 OSS 800px 顶裁切；详情弹窗 1200px
- 对外内容不出现合办校名（西浦/宁诺等）

## 发布

- **GitHub**：直接 `git push`；网络抖动时用 `scripts/push-retry.sh`（判断真实退出码）
- **github.com:443 被代理阻断时**（报 `CONNECT tunnel failed, response 502` 或 `schannel: server closed abruptly`，但 `api.github.com` 仍 200）：
  `node scripts/push-via-api.mjs "<commit message>"` 走 Git Data API 提交（blob → tree → commit → 移动分支）。
  增量基准默认 `origin/main`；连续多次推送时用 `BASE=<上一次的本地 ref>` 控制比较基准。
  脚本内容取自 `git cat-file blob`，不会把工作区 CRLF 带进仓库（否则远端 tree 会和本地不一致）。
  这样产生的远端提交与本地提交 sha 不同但 tree 相同，网络恢复后执行 `git fetch origin && git reset --hard origin/main` 对齐即可
- **WorkBuddy 托管（sites）**：`shareLink` 形如 `https://fanke-projects.app.workbuddy.host/?sharecode=XXXX`。
  带 `sharecode` 首次访问会下发 `__wb_rsc` cookie，**此后同源所有 HTML 与 `assets/*.js` 都靠这个 cookie 放行**；
  不带 sharecode 且无 cookie 的直连（curl / 新标签）一律 403「链接不完整」。
  index.html 里两个内嵌 iframe 必须把父页 `location.search` 的 `sharecode` 透传到 `data-src` 上，否则换设备打开时子页可能拉不到。
- **内嵌视图（jobs / winter）有一条硬约束**：`<main>` 必须是 `<body>` 的直接子级。
  因为 `body.embed` 会 `display:none` 掉 `.site-header / .hero / .site-footer / footer`，
  一旦 hero 没闭合把 main 包进去，正文会跟着一起消失（表现为「实习页面打不开了」的空白页，且控制台无报错）。
  改完子页后用 `node scripts/embed-check.mjs` 复核：`textLen > 0`、`bodyH` 与 `scrollH` 相等且 > 1000 才算正常。
- **EdgeOne**：`npm i -g edgeone@latest` → `edgeone makers deploy --name fanke-research-hub`（新机首次浏览器授权）；部署 URL 必须带完整 `?eo_token=...&eo_time=...` 参数
- 本地 Node fetch 对部分主机 TLS 失败 → 脚本内已自动 curl 兜底，Windows 下 curl 已串行化避免 spawn 冲突

## 待办

1. 招聘日历接真实批次、求职资源（简历/笔试/面经）落地（现为示例占位）
1b. 竹石创研院小程序科研专题（已完成落地）：小程序本体仅微信客户端内可见、无法公开抓取；但其运营方「竹石创新研究院 / BamRock 竹石生物」把每个专题以公众号文章逐篇发布（公众号：BamRock-竹石创新研究院，__biz=MzYzNTQyODI0NQ==），公众号可抓。已据此提取 4 个真实专题写入 `scripts/partner-src/专题清单.csv`（肝癌早检 / APOE4 / 卫生经济 / 光遗传学研学），导航「合作科研专题」已点亮、可筛选。补全其余专题：持续检索该公众号新文章，或用户粘贴小程序完整列表，再跑 `node scripts/build-partner-data.mjs` 即可。注意对方称「已开放 7 个生物医学专题」，剩余几个只有方向名（免疫学/临床医学/统计与机器学习/计算机技术与人工智能）未单独发文，未编造。
2. 名录可按 500 强排名排序 / 只看榜单公司（现在只能按行业筛 + 关键词搜）
3. 缺图公司补 logo：把图片放到 `assets/logos/{slug}.png` 后重跑 `fetch-logos-bulk.mjs` 即自动索引；合作机构缺图 19 家（多为律所/本土 PE，官网有反爬）
4. 远程岗位的 `title` 是模板化写法（多家券商都叫「投行/行研/量化」），后续可按 `org` 展开成各自的具体岗位名

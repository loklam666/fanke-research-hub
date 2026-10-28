# HANDOVER — 新电脑无缝衔接交接书

> 本文件是给「新电脑上的 AI」看的。读完即可接手全部工作，不需要旧电脑的任何文件。
> 上线正式版对外发布前，可以删除本文件。

## 项目是什么

**fanke-research-hub**（泛柯科研库 + 求职板块），GitHub: `loklam666/fanke-research-hub`（main 分支）

- `index.html` — 科研主站（单文件 SPA，泛柯橙 `#F4532B`）：871 个科研项目（源站 2026-10 实时拉取，此前记录为 935），从 Path Academics 站点（sou-tools.gecacademy.cn）逆向同步，含搜索/筛选/详情弹窗/汇总长图；三个视图 = 项目库 / 汇总长图 / **科研培养体系**（合作渠道产品档位）
- `jobs.html` — 实习·求职板块 v0.2（蓝色主题 `#2E6FF2`）：企业名录（934 家 logo 墙，2026 世界500强 + 中国500强全量）/ **实习岗位库（335 个真实岗位 · 90 家合作机构）** / **人才培养与求职服务（5 条路径）** / 招聘日历（示例占位）/ 资源精选（示例占位）
- `logos.html` — logo 素材库预览页（按行业分组）

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

- 数据包 `assets/partner.js`（挂 `window.__PARTNER`，约 196 KB）由 `node scripts/build-partner-data.mjs` 生成，输入是 `scripts/partner-src/*.csv`（源表：中科院自动化所 / 复旦研究院 / 远程实习列表 / 远程岗位 JD，共 351 行；换新一期物料用 `PARTNER_SRC` 指向新目录）
- 结构：`{ updated, source, stats, orgs, research, youth, career, jobs }`
  - `jobs[]`：`{ org, key, track(科研实习|远程实习), group(方向或行业), title, place, duration, type, jd, id, logo }`
  - `orgs[]`：`{ org, n, key, logo }`，**90 家**（按岗位数降序）
  - `research[]` 四档科研体系、`youth[]` 五档青少年营、`career[]` 五条求职路径 —— **只写课时与产出，不写价格**
- 生成时的三个关键处理：
  1. `ALIAS` 把简称/复合名映射成 logo slug（`腾讯游戏运营 → tencent`、`古驰市场部意大利 → p-gucci`）
  2. `CANON` 把简称补成全称并合并同义机构（`招商 → 招商证券`、`中信/中信投行 → 中信证券`、`LV/LVMH → LVMH`）
  3. 去重键 `org|title|group`，保留信息最全的一条（远程列表无 JD、远程 JD 表有 JD，靠这步合并）
- 合作机构 logo 用 `p-` 前缀单独抓（`node scripts/fetch-partner-logos.mjs`），不污染企业名录；抓不到的降级字母徽标
- 首页展示：`index.html` 第三视图「科研培养体系」渲染 `research` + `youth`；`jobs.html` 渲染 `jobs` + `orgs` + `career`

## 设计规范（延续）

- 主站橙 `#F4532B`，求职蓝 `#2E6FF2`；杂志感卡片布局，无 emoji，中文直给
- 泛柯 logo 内嵌 base64；卡片封面用 OSS 800px 顶裁切；详情弹窗 1200px
- 对外内容不出现合办校名（西浦/宁诺等）

## 发布

- **GitHub**：直接 `git push`；网络抖动时用 `scripts/push-retry.sh`（判断真实退出码）
- **EdgeOne**：`npm i -g edgeone@latest` → `edgeone makers deploy --name fanke-research-hub`（新机首次浏览器授权）；部署 URL 必须带完整 `?eo_token=...&eo_time=...` 参数
- 本地 Node fetch 对部分主机 TLS 失败 → 脚本内已自动 curl 兜底，Windows 下 curl 已串行化避免 spawn 冲突

## 待办

1. 招聘日历接真实批次、求职资源（简历/笔试/面经）落地（现为示例占位）
2. 名录可按 500 强排名排序 / 只看榜单公司（现在只能按行业筛 + 关键词搜）
3. 缺图公司补 logo：把图片放到 `assets/logos/{slug}.png` 后重跑 `fetch-logos-bulk.mjs` 即自动索引；合作机构缺图 19 家（多为律所/本土 PE，官网有反爬）
4. 远程岗位的 `title` 是模板化写法（多家券商都叫「投行/行研/量化」），后续可按 `org` 展开成各自的具体岗位名

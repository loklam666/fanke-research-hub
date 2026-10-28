# HANDOVER — 新电脑无缝衔接交接书

> 本文件是给「新电脑上的 AI」看的。读完即可接手全部工作，不需要旧电脑的任何文件。
> 上线正式版对外发布前，可以删除本文件。

## 项目是什么

**fanke-research-hub**（泛柯科研库 + 求职板块），GitHub: `loklam666/fanke-research-hub`（main 分支）

- `index.html` — 科研主站（单文件 SPA，泛柯橙 `#F4532B`）：935 个科研项目，从 Path Academics 站点（sou-tools.gecacademy.cn）逆向同步，含搜索/筛选/详情弹窗/汇总长图
- `jobs.html` — 实习·求职板块设计稿 v0.1（蓝色主题 `#2E6FF2`）：企业名录（204 家 logo 墙）/ 招聘日历（示例占位）/ 资源精选（示例占位），主站导航已加入口
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

- 清单：`scripts/companies.json`（204 家，已含部分世界/中国 500 强）。字段：`slug / name / nameZh / domain / industry`，可选 `source:"url:..."` 或 `source:"simpleicons:slug"`，可选 `skip:true`
- 采集：`node scripts/fetch-logos.mjs`（优先级 source > simpleicons > 官网图标解析；失败自动 monogram 文字徽标占位；已成功的 slug 自动跳过，增量安全）
- 新增公司：companies.json 追加条目 → 重跑 fetch-logos.mjs
- 注意：jobs.html / logos.html / fetch-logos.mjs 三处的行业 `order` 数组要保持一致
- 16 家 monogram 占位待手工补图：华电/中冶/中交/中远海运/国药/华夏银行/国开行/台积电/雀巢/安联/中车/广发银行/蒙牛/科大讯飞/OpenAI/中金

## 【进行中】500 强全量扩充（未完成，数据源已探明）

用户要求把公司库扩成**全量世界 500 强 + 中国 500 强**（现仅 204 家）。已踩通的路径：

- 财富中文网（fortunechina.com）**列表落地页有反爬 JS 守卫，但内容详情页 curl 可直取**（需带浏览器 UA）
- 2026《财富》中国 500 强全表（500 行静态 HTML，含排名/英文名/营收/利润/详情页链接 `/china500/{id}/2026`）：
  `https://www.fortunechina.com/fortune500/c/2026-07/21/content_475324.htm`
- 公司详情页含：**中文名 + 英文名 + 官网地址（`<div class="value"><a href='www.xxx.com'>`）**，官网正是 logo 采集要的 domain
- 2026《财富》世界 500 强（2026-07-28 发布，亚马逊第一）列表页 URL 待定位，模式应类似 `/global500/c/2026-07/28/content_XXXXXX.htm`，可 WebSearch「2026年财富世界500强 财富中文网」找到
- 维基百科在本机不可达（直连和本地代理均失败），国内新闻源可用
- 与现有 204 家去重：按 nameZh 归一化（去掉"股份有限公司/集团/有限公司"后比对）

## 设计规范（延续）

- 主站橙 `#F4532B`，求职蓝 `#2E6FF2`；杂志感卡片布局，无 emoji，中文直给
- 泛柯 logo 内嵌 base64；卡片封面用 OSS 800px 顶裁切；详情弹窗 1200px
- 对外内容不出现合办校名（西浦/宁诺等）

## 发布

- **GitHub**：直接 `git push`；网络抖动时用 `scripts/push-retry.sh`（判断真实退出码）
- **EdgeOne**：`npm i -g edgeone@latest` → `edgeone makers deploy --name fanke-research-hub`（新机首次浏览器授权）；部署 URL 必须带完整 `?eo_token=...&eo_time=...` 参数
- 本地 Node fetch 对部分主机 TLS 失败 → 脚本内已自动 curl 兜底，Windows 下 curl 已串行化避免 spawn 冲突

## 待办

1. 完成 500 强全量扩充（见上节）
2. 求职板块接真实数据：岗位列表、真实招聘日历、简历/笔试/面经资源（现为示例占位）
3. （可选）16 家占位 logo 补图：放 `assets/logos/{slug}.png` 后从 companies.json 去掉 skip 标记重跑

# 泛柯科研项目库 · Fanke Research Hub

泛柯教育品牌化科研项目库网站。数据完整抓取自 Path Academics 科研项目平台（sou-tools.gecacademy.cn）的公开接口，当前在库 **925 个项目**，覆盖 12 个项目类型与 4 大学科领域。

## 目录结构

```
fanke-research-hub/
├── index.html              # 网站入口（泛柯品牌 UI，单文件应用）
├── logos.html              # 公司 Logo 素材库预览页（实习/求职板块筹备）
├── assets/
│   ├── fanke-logo.png      # 泛柯 logo（已内嵌进 index.html，此文件仅本地留存）
│   ├── data.js             # 前端列表数据包（sync 脚本自动生成，勿手改）
│   ├── details.js          # 前端详情数据包（弹窗首次打开时懒加载）
│   └── logos/              # 公司 Logo 素材库（94 家，为实习/求职板块准备）
├── scripts/
│   ├── sync.mjs            # 科研项目数据同步脚本
│   ├── fetch-logos.mjs     # 公司 Logo 采集脚本
│   └── companies.json      # 公司清单（编辑后重跑 fetch-logos 即可扩充）
└── data/
    ├── projects.json       # 全部项目列表（规范化后的主数据）
    ├── details.json        # 全部项目详情（周期/产出/背景/介绍/导师/附件）
    ├── taxonomy.json       # 分类体系（项目类型 / 学科 / 专业）
    ├── summary-images.json # 学科汇总长图
    └── meta.json           # 同步元信息（时间 / 数量统计）
```

## 如何同步最新项目

源站数据更新后，重新拉取即可：

```bash
node scripts/sync.mjs
```

- 需要 Node 18+（自带 fetch），无需安装任何依赖。
- 脚本会自动拉取：分类体系、常规科研、全球在研 1v1、Astra 1v1、专业选修课、线下项目、IEPQ、竞赛、AI HUB、汇总长图，以及**每个项目的详情页数据**（`/course/query/share`，含项目周期、项目产出、项目背景与课程安排、项目介绍、导师详细介绍、大纲附件）。
- 详情约 900+ 次请求，并发 8，全程约 30 秒；如需跳过详情（只更新列表）加参数 `--skip-details`。
- 去重合并后写入 `data/` 与 `assets/*.js`，网站刷新即是最新数据，前端代码零改动。
- 单个数据源失败会被跳过（日志显示 `[skip]`），不影响其余数据同步。

## 如何修改 / 增删项目

直接编辑 `data/projects.json`（字段结构见下），然后运行：

```bash
node scripts/pack.mjs   # 如已删除可运行 node scripts/sync.mjs 重新生成
```

即可把 JSON 重新打包进 `assets/data.js`。项目字段：

| 字段 | 说明 |
|---|---|
| `title` | 项目名称 |
| `type` / `typeId` | 项目类型（国外小组科研、全球在研、竞赛…） |
| `direction` / `profession` | 学科领域 / 一级专业 |
| `teacher` | `{ name, level, school }` 导师信息 |
| `mode` | 线上 / 线下 |
| `startDate` | 开课时间 |
| `audience` | 适合人群（高中生 / 初中生 / 大学生 / 硕士生） |
| `basics` | 报名要求（建议基础） |
| `fit` | 适合方向标签数组 |
| `star` / `surplus` | 星级 / 剩余名额 |
| `image` / `longImage` | 封面图 / 详情长图 URL |

## 网站功能

- 🔍 关键词搜索：项目名、导师、大学、专业、要求全文匹配
- 🏷️ 多维筛选：项目类型（带数量）、学科领域、适合人群
- ↕️ 排序：综合（置顶+星级）/ 开课时间 / 星级
- 📄 **完整详情页**（点卡片弹出）：项目周期、项目介绍、项目背景与每周安排、课程大纲、项目产出、报名要求、导师介绍（含头像）、可下载的大纲附件、详情长图（可放大）；与原站详情页信息一致，另附"在原站查看"直达链接
- 🖼️ 汇总长图：31 张学科全景图，点击放大
- 📱 移动端适配
- ⚡ 详情数据 `assets/details.js`（约 5.6MB）在首次打开详情时才懒加载，列表页秒开

## 本地预览

直接双击 `index.html` 即可（数据通过 `assets/data.js` 加载，无跨域问题）。也可起本地服务：

```bash
cd fanke-research-hub && python -m http.server 8080
```

## 图片清晰度说明

源站提供的封面小图仅 450px 宽（高分屏下会模糊）。网站前端已做优化：利用阿里云 OSS 的实时图片处理（`x-oss-process`），卡片封面改用每个项目的 1500px 高清详情长图按需缩放到 800px + 顶部裁切，弹窗长图 1200px，汇总长图缩略图 480px——按需生成、无需预先下载，流量与清晰度兼顾。该逻辑仅对 `aliyuncs.com` 域名的图片生效，其他图源原样加载。

## 公司 Logo 素材库（实习/求职板块筹备）

`logos.html` 可预览已采集的 94 家公司标识（覆盖互联网、人工智能、游戏、硬件、新能源、国际科技、金融、咨询、四大、快消、医药等校招热门行业）。

- 采集来源：公司官网图标（自动解析 apple-touch-icon / favicon，取最大尺寸）为主，Simple Icons CDN 与手工指定地址兜底
- 扩充方式：编辑 `scripts/companies.json` 增加公司（slug/name/nameZh/domain/industry）→ `node scripts/fetch-logos.mjs`
- 产出：`assets/logos/{slug}.{png|svg|ico}` + `assets/logos/index.json` + `assets/logos.js`
- 官网反爬无法自动抓取的公司（科大讯飞、OpenAI、中金公司）暂用文字徽标占位，后续可手工补充 logo 文件到 `assets/logos/{slug}.png` 并去掉 companies.json 中的 `"skip": true`
- 版权说明：各公司 Logo 版权归其所有者，仅用于站内资源识别展示

## 发布上线

方式一（本机 CLI，最快）——已登录 EdgeOne CLI 时，在项目目录执行：

```bash
PAGES_SOURCE=skills edgeone makers deploy --name fanke-research-hub --json
```

方式二（GitHub 自动部署，推荐长期维护）——仓库只含源码，数据由构建时同步生成：

1. GitHub 仓库：本仓库（`fanke-research-hub`）。生成文件（`data/`、`assets/data.js`、`assets/details.js`）已 gitignore，克隆后先跑一次 `node scripts/sync.mjs` 即可本地预览。
2. 在 [EdgeOne Pages 控制台](https://console.cloud.tencent.com/edgeone/pages) 「创建项目 → 导入 Git 仓库」选择本仓库：
   - 构建命令：`node scripts/sync.mjs`（Node 18+）
   - 输出目录：项目根目录（纯静态，无需额外服务）
3. 之后每次 `git push`，EdgeOne 自动重新同步数据并部署上线。

> 维护流程总结：改代码或改数据 → `git push` → EdgeOne 自动构建部署；或本地 `node scripts/sync.mjs` 后直接 CLI 重新 deploy。

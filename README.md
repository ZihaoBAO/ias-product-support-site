# IAS 产品售后说明中心

这是 IAS-3120 和 IAS-5100 维护 SOP 的本地静态网页版本。Excel 仍作为内容来源，网页默认展示客户可阅读的文档化界面，包括产品目录、故障排查、通用排查流程、步骤卡片、图片预览和审核对照入口。

## 技术栈

- **Vue 3** — 响应式框架，组件化开发
- **Vite 6** — 开发服务器与构建工具
- **Vue Router 4** — 前端路由（Hash 模式）

## 本地运行

```bash
npm install
npm run dev
```

默认地址：

```text
http://localhost:5173
```

## 国际化 (i18n)

站点支持简体中文、English、Italiano 和 Русский 四种语言，默认语言为英语。在顶部导航栏右侧的下拉框中切换。

语言包位于 `src/locales/` 目录：
- `en.json` — 英文（默认）
- `zh-CN.json` — 简体中文
- `it.json` — 意大利语
- `ru.json` — 俄语

添加新语言只需：
1. 复制 `en.json` 为新文件（如 `fr.json`），翻译内容
2. 在 `src/composables/useI18n.js` 中 import 并加入 `messagesMap` 和 `availableLocales`

## 内容生成

```bash
npm run migrate:excel
npm run migrate:manual
npm run audit:manual
```

| 脚本 | 语言 | 说明 |
|------|------|------|
| `scripts/migrate-excel.py` | Python | 从 Excel 导出原始工作表 JSON 和图片，用于审核对照与后续结构化迁移 |
| `scripts/generate-manual.py` | Python | 生成客户可读的 `manual.json` 文档数据（前端 Vue 组件读取的主要数据源） |
| `scripts/audit-manual.py` | Python | 检查结构化内容、图片绑定和原表覆盖情况，输出 `MANUAL_AUDIT.md` |

这三个脚本的依赖关系：`migrate-excel.py` → `generate-manual.py` → `audit-manual.py`（可选质量检查）。仅在原始 Excel 文件内容变更时需要重新运行，日常开发不需要。

## 构建和预览

```bash
npm run build
npm run preview
```

- `build`：Vite 打包构建，产物输出到 `dist/`
- `preview`：本地预览构建产物，默认 `http://localhost:4173`

## 项目结构

```
├── index.html                    # Vite 入口 HTML
├── vite.config.js                # Vite 配置
├── package.json                  # 项目依赖与脚本
├── public/
│   ├── content/                  # 内容数据（JSON，由 Python 脚本生成）
│   │   └── products/
│   │       └── ias-3120/
│   │       │   ├── product.json   # 产品元信息
│   │       │   ├── manual/        # 结构化手册
│   │       │   │   └── manual.json
│   │       │   └── excel/         # Excel 迁移数据
│   │       │       ├── manifest.json
│   │       │       └── sheets/
│   │       └── ias-5100/          # 同上结构
│   ├── images/                   # 产品维修步骤图片
│   └── downloads/                # 可下载文件
├── src/
│   ├── main.js                   # Vue 应用入口
│   ├── App.vue                   # 根组件（顶栏 + 语言切换 + 路由视图）
│   ├── styles.css                # 全局样式（科技风玻璃拟态 UI）
│   ├── router/
│   │   └── index.js              # 路由配置
│   ├── locales/
│   │   ├── en.json               # 英文语言包
│   │   ├── zh-CN.json            # 简体中文语言包
│   │   ├── it.json               # 意大利语语言包
│   │   └── ru.json               # 俄语语言包
│   ├── composables/
│   │   ├── useRepository.js      # 数据获取 composable
│   │   └── useI18n.js            # 国际化 composable（翻译 + 语言切换）
│   ├── data/
│   │   └── repository.js         # 数据仓库
│   ├── components/
│   │   └── ProductCard.vue       # 产品卡片组件
│   └── views/
│       ├── HomePage.vue           # 首页（产品列表 + 搜索）
│       ├── ProductPage.vue        # 产品外壳页（侧栏导航 + 内容区）
│       ├── ProductOverview.vue    # 文档概览（目录 + 阅读入口）
│       ├── ProductFlow.vue        # 通用排查流程（时间线）
│       ├── ProductTroubleshooting.vue # 故障排查表
│       ├── ProductSop.vue         # SOP 步骤卡片
│       └── NotFoundPage.vue       # 404 页面
└── scripts/
    ├── migrate-excel.py           # Excel → JSON 迁移（数据处理第一步）
    ├── generate-manual.py         # JSON → 结构化手册（数据处理第二步）
    └── audit-manual.py            # 内容覆盖审核（数据质量检查）
```

## 数据流说明

```
[Excel 文件]
  │
  ▼
migrate-excel.py ────► public/content/products/xxx/excel/sheets/*.json + 图片
  │
  ▼
generate-manual.py ───► public/content/products/xxx/manual/manual.json
  │
  ▼
Vite + Vue 3 ────────► 网页展示（前端通过 src/data/repository.js 读取 JSON）
```

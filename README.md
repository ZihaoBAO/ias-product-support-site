# IAS 产品售后说明中心

IAS-3120 和 IAS-5100 维护 SOP 的网页版售后支持平台。前后端分离架构，支持多语言、用户认证、故障排查、SOP 步骤卡片和图片预览。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vue Router 4 + Element Plus + Vite 6 |
| 后端 | Node.js + Express, JWT 认证, bcrypt 密码哈希 |
| 数据库 | MySQL 8.0 |
| 部署 | Nginx 反向代理，前后端同服 |

---

## 架构

```
浏览器
  │
  ▼
Nginx :80 (或 IIS)
  │
  ├── /          → dist/ 静态文件（Vue 前端 SPA）
  ├── /api/*     → Express :3000（后端 API）
  │                  │
  │                  ▼
  │              MySQL 192.168.0.141:3306（baozihao 库）
  │
  └── 同一域名 + 同一服务器，无需 CORS
```

---

## 本地运行

### 前端

```bash
npm install
npm run dev
```

默认地址：`http://localhost:5173`

Vite 自动将 `/api` 请求代理到 `http://localhost:3000`。

### 后端

```bash
cd server
npm install

# 首次使用需配置 server/.env
cp .env.example .env
# 编辑 .env，填入数据库密码和 JWT 密钥

# 初始化数据库（建表 + 创建默认用户）
node setup.mjs "数据库密码" "admin密码" "customer密码"

# 将输出的 JWT 密钥填入 .env

# 启动后端
npm run dev
```

后端地址：`http://localhost:3000`，健康检查：`http://localhost:3000/api/health`

---

## 用户认证

### 数据库初始化

```bash
cd server
node setup.mjs "数据库密码" "admin密码" "customer密码"
```

自动完成：建表、bcrypt 哈希、插入 admin/customer 用户、生成 JWT 密钥。

### 添加新用户

> `add-user.mjs` 直接连接 MySQL 数据库，不依赖后端 Express 服务。
> 只要电脑能连通 `192.168.0.141:3306`（连公司网络即可），在任何机器上都能运行。

```bash
cd server
node add-user.mjs "用户名" "密码" admin       # 管理员
node add-user.mjs "用户名" "密码"              # 客户（默认）
```

已存在用户会被覆盖（更新密码和角色）。添加后即时生效，无需重启后端。

### JWT 密钥

`setup.mjs` 会输出两行密钥，填入 `server/.env`：

```bash
JWT_ACCESS_SECRET=<输出的密钥>
JWT_REFRESH_SECRET=<输出的另一个密钥>
```

> 密钥生成后不要改动，除非泄露。修改密钥会导致所有用户被迫重新登录。

### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录，返回 JWT token |
| POST | `/api/auth/refresh` | 刷新 access token |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 获取当前用户信息 |
| GET | `/api/health` | 健康检查 |

---

## 环境变量（`server/.env`）

```bash
DB_HOST=192.168.0.141
DB_PORT=3306
DB_USER=baozihao
DB_PASSWORD="数据库密码"
DB_NAME=baozihao

JWT_ACCESS_SECRET=64位随机字符串
JWT_REFRESH_SECRET=64位随机字符串
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

CORS_ORIGIN=https://实际部署后的域名
PORT=3000
```

> 密码含特殊字符（如 `#`）需用双引号包裹。

---

## 国际化 (i18n)

支持四种语言，顶部导航栏下拉框切换：

- English（默认）
- 简体中文
- Italiano
- Русский

语言包位于 `src/locales/`。添加新语言：

1. 复制 `en.json` 为新文件并翻译
2. 在 `src/composables/useI18n.js` 的 `messagesMap` 和 `availableLocales` 中注册

---

## 内容生成

Excel 是原始数据源，Python 脚本负责导出和结构化：

```bash
npm run migrate:excel   # Excel → JSON + 图片
npm run migrate:manual   # JSON → 结构化手册 manual.json
npm run audit:manual     # 内容覆盖审核
```

| 脚本 | 说明 |
|------|------|
| `scripts/migrate-excel.py` | 从 Excel 导出工作表 JSON 和图片 |
| `scripts/generate-manual.py` | 生成客户可读的 `manual.json` |
| `scripts/audit-manual.py` | 检查结构完整性，输出 `MANUAL_AUDIT.md` |

依赖关系：`migrate-excel.py` → `generate-manual.py` → `audit-manual.py`（可选）。仅在 Excel 内容变更时需重新运行。

---

## 构建

```bash
npm run build       # Vite 打包，产物输出到 dist/
npm run preview     # 本地预览构建产物，http://localhost:4173
```

---

## 部署（给 IT 部门的操作指南）

> 将整个 `ias-product-support-site/` 文件夹交付给 IT。以下为 IT 需要的完整操作步骤。
>
> **重要：`.env` 已配好数据库连接和 JWT 密钥，`users` 表也已创建。IT 只需改一处：`CORS_ORIGIN`。**
>
> **注意：`node_modules/` 不要从 Windows 复制到 Linux！** `bcrypt` 等原生模块依赖操作系统，必须直接在目标服务器上运行 `npm install` 编译。

### 前置条件

| 项目 | 要求 |
|------|------|
| 服务器 | Windows 或 Linux，能访问 `192.168.0.141:3306` |
| Node.js | v20+ |
| Nginx | 做反向代理 + 静态文件服务 |
| PM2 | 守护 Express 进程，崩溃自动重启 |

### 步骤一：构建前端

```bash
cd ias-product-support-site
npm install
npm run build
# 产物: dist/
```

> 如果服务器上已有其他网站在 80 端口运行（见步骤四），构建前无需特殊配置——本项目使用 hash 路由（`#/...`），静态资源路径为 `/assets/`，可直接工作在任意端口。

### 步骤二：配置后端（只改一行）

```bash
cd server
npm install
```

打开 `server/.env`，**只需修改 `CORS_ORIGIN`**，其余不需要动：

```bash
# 改之前：
CORS_ORIGIN=http://localhost:5173

# 改成实际访问地址（含端口号）：
CORS_ORIGIN=http://192.168.0.141:8080
```

为什么只改这一行？

- `DB_*` — 数据库地址和密码已经是内网真实配置 ✅
- `JWT_*` — 密钥已生成并填入 ✅
- 数据库 `users` 表 — 已在首次初始化时创建 ✅
- 只有 `CORS_ORIGIN` 在本地开发时填的是 `localhost`，部署后需要改成实际域名

> **不需要**重新运行 `setup.mjs`，数据库已经初始化过了。
>
> **不需要**重新生成 JWT 密钥，否则现有用户全部需要重新登录。

### 步骤三：启动后端

```bash
# 安装 PM2（全局一次）
npm install -g pm2

# 启动并设为开机自启
cd server
pm2 start src/index.js --name ias-api
pm2 save
pm2 startup
```

> 后端通过 `dotenv` 自动读取 `server/.env`，无需手动传 `--env-file` 参数。

### 步骤四：配置 Nginx

```nginx
server {
    listen 8080;               # 如 80 端口被占用，换成其他端口
    server_name _;

    # 前端静态文件
    root /path/to/ias-product-support-site/dist;
    index index.html;

    # SPA 路由：所有路径返回 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

> Ubuntu 下 Nginx 默认以 `www-data` 用户运行，如果项目放在 `/home/` 目录下，需要给 `/home/<user>` 添加执行权限：
> ```bash
> sudo chmod o+x /home/<用户名>
> sudo chmod -R o+rX /path/to/ias-product-support-site/dist
> ```

### 步骤五：验证

1. **健康检查**：`curl http://localhost:3000/api/health` 返回 `{"status":"ok"}`
2. **后端状态**：`pm2 status` 显示 `ias-api` 为 `online`
3. **前端访问**：浏览器打开 `http://<IP>:<端口>` → 显示登录页
4. **登录测试**：用现有的账号密码登录 → 进入首页

### 常用运维命令

```bash
pm2 status                  # 查看进程状态
pm2 logs ias-api            # 查看实时日志
pm2 restart ias-api         # 重启后端
pm2 stop ias-api            # 停止后端
```

> 添加新用户不需要在服务器上操作——`add-user.mjs` 直接连数据库，只要电脑能访问 `192.168.0.141` 就能运行，在本地电脑上操作即可。

### 常见问题

| 现象 | 原因 | 解决 |
|------|------|------|
| `invalid ELF header` | 从 Windows 复制了 `node_modules` | 删掉 `node_modules/`，在 Linux 上重新 `npm install` |
| `Permission denied`（Nginx 500）| 项目在 `/home/` 下，Nginx 无权限 | `chmod o+x /home/<user>` |
| 登录报 500 且日志显示 `Access denied for user ''` | `.env` 未被加载（缺少 `dotenv`） | 确认 `server/src/index.js` 第一行有 `import 'dotenv/config'` |
| 访问网站显示其他服务页面 | 该端口被其他 `server` 块抢了匹配 | 使用独立端口（如 8080）|
| PM2 不知 `--env-file` 参数 | PM2 版本过旧 | 升级 PM2 或确保代码中有 `dotenv` 加载 |

---

## 项目结构

```
ias-product-support-site/
├── index.html                        # Vite 入口 HTML
├── vite.config.js                    # Vite 配置（含开发代理）
├── package.json                      # 前端依赖与脚本
├── .gitignore
│
├── server/                           # 后端
│   ├── .env                          # 环境变量（不提交 Git）
│   ├── .env.example                  # 环境变量模板
│   ├── package.json
│   ├── setup.mjs                     # 数据库初始化脚本（已执行，无需重复）
│   ├── add-user.mjs                  # 用户管理脚本
│   ├── init-db.sql                   # 建表 SQL（参考）
│   └── src/
│       ├── index.js                  # Express 入口
│       ├── db.js                     # MySQL 连接池
│       ├── routes/auth.js            # 登录/登出/刷新 API
│       ├── middleware/authMiddleware.js  # JWT 验证中间件
│       └── utils/jwt.js              # JWT 签发/验证
│
├── public/
│   ├── content/                      # 内容数据（JSON，Python 脚本生成）
│   │   ├── flowchart/process-flow.json
│   │   ├── products.index.json
│   │   └── products/
│   │       ├── ias-3120/             # product.json, manual/, excel/ 等
│   │       └── ias-5100/
│   ├── images/                       # 产品图片
│   │   ├── ias-logo.png
│   │   └── products/
│   └── downloads/                    # 可下载文件
│
├── src/
│   ├── main.js                       # Vue 应用入口
│   ├── App.vue                       # 根组件
│   ├── styles.css                    # 全局样式
│   ├── api/auth.js                   # 前端 API 封装
│   ├── router/index.js               # 路由配置 + 导航守卫
│   ├── composables/
│   │   ├── useAuth.js                # 认证状态管理（JWT）
│   │   ├── useI18n.js                # 国际化
│   │   └── useRepository.js          # 数据获取
│   ├── data/repository.js            # 数据仓库
│   ├── locales/                      # 语言包（en/zh-CN/it/ru）
│   ├── components/
│   │   ├── ProductCard.vue
│   │   └── ProcessFlow.vue
│   └── views/
│       ├── HomePage.vue              # 首页
│       ├── LoginPage.vue             # 登录页
│       ├── ProductPage.vue           # 产品外壳页
│       ├── ProductOverview.vue       # 文档概览
│       ├── ProductFlow.vue           # 排查流程
│       ├── ProductTroubleshooting.vue # 故障排查表
│       ├── ProductSop.vue            # SOP 步骤卡片
│       └── NotFoundPage.vue          # 404
│
├── scripts/                          # 数据处理脚本
│   ├── migrate-excel.py
│   ├── generate-manual.py
│   ├── audit-manual.py
│   └── hash-password.mjs             # 已废弃（用 server/setup.mjs）
│
└── docs/
    └── login-and-deployment.md       # 登录与部署详细说明
```

---

## 数据流

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
Vue 3 前端 ──────────► src/data/repository.js 读取 JSON ──► 网页展示
```

---

## 安全特性

| 特性 | 实现 |
|------|------|
| 密码存储 | bcrypt(12 rounds)，仅存哈希 |
| 密码验证 | 服务端比对 |
| 会话管理 | JWT access token (15min) + refresh token (7d) |
| Token 刷新 | 过期自动无感刷新 |
| 暴力破解 | 登录接口 15 分钟内限 10 次 |
| CORS | 仅允许配置的前端域名 |

---

## 路由一览

| 路径 | 页面 | 认证 |
|------|------|------|
| `#/login` | 登录页 | 公开 |
| `#/` | 首页（产品列表） | 需登录 |
| `#/products/:productId` | 产品概览 | 需登录 |
| `#/products/:productId/flow` | 排查流程 | 需登录 |
| `#/products/:productId/troubleshooting` | 故障排查表 | 需登录 |
| `#/products/:productId/sop/:docId` | SOP 步骤卡片 | 需登录 |
| `#/*` | 404 页面 | 公开 |

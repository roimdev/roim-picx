<p align="center">
  <img src="docs/favicon.ico" alt="roim-picx" width="120" height="120">
</p>

<h1 align="center">roim-picx</h1>

<p align="center">
  <strong>🖼️ 一款基于 Cloudflare 的 Worker、R2、Pages、D1 实现的免费图床应用</strong>
</p>

<p align="center">
  <a href="https://roim.page">🌐 在线预览</a> •
  <a href="#-功能特性">✨ 功能特性</a> •
  <a href="#-部署教程">🚀 部署教程</a> •
  <a href="#-界面截图">📸 界面截图</a>
</p>

---

## 📢 预览说明

> [!WARNING]
> 在线预览地址仅作演示使用，每天有使用限额，请勿大量上传图片。  
> **请勿将预览图床地址用于生产环境**，数据会定期清理。

**预览 Token：** `4xVSYkCKw2ExbPNEaMPjCnaaOowU9sTf`

---

## 💡 为什么选择 roim-picx？

| 特性 | 说明 |
|:---:|:---|
| 💾 **免费存储** | 10GB 的免费存储空间 |
| 🚀 **高速访问** | 每月 300W 次不计流量的图片访问（每天 10W 次限制） |
| 📤 **上传无忧** | 每月 100W 次的图片上传次数 |
| 🆓 **零成本部署** | 无需购买服务器，克隆代码后部署 Cloudflare 即可使用 |
| 🔒 **数据安全** | 独立部署，无需担心第三方删除数据 |

---

## ✨ 功能特性

- [√] 📦 图片批量上传
- [√] 📋 图片列表查询
- [√] 🗑️ 图片删除
- [√] 📁 目录创建
- [√] 🔍 按目录查询
- [√] 📎 链接地址点击复制
- [√] 🔐 简单的身份认证功能
- [√] 🔗 提供删除图片的访问链接
- [√] 📂 上传图片时支持选择目录
- [√] 📄 管理页面支持分页加载
- [√] ✏️ 图片重命名
- [√] 🔑 GitHub 登录
- [√] ⏰ 文件过期自动删除
- [√] 🔎 文件前缀搜索
- [√] 👤 上传图片关联登录用户信息
- [√] 📊 访问统计与热度分析
- [√] 💾 D1 数据库持久化存储元数据
- [√] 🔄 历史 R2 数据一键同步到 D1
- [√] 📱 移动端自适应优化

---

## 🏗️ 技术架构

### 架构概览

```mermaid
graph TB
    subgraph 用户端
        A[浏览器] -->|HTTPS| B[Cloudflare CDN]
    end
    
    subgraph Cloudflare 基础设施
        B --> C[Pages 静态托管]
        B --> D[Pages Functions]
        D -->|读写| E[(R2 对象存储)]
        D -->|持久化| H[(D1 数据库)]
        D -->|会话管理| F[(KV 键值存储)]
    end
    
    subgraph 第三方服务
        D -->|OAuth 认证| G[GitHub API]
    end
```

### 前端技术栈

| 技术 | 版本 | 说明 |
|:---|:---:|:---|
| **Vue 3** | ^3.5 | 渐进式 JavaScript 框架，使用 Composition API |
| **Vue Router** | ^4.6 | 官方路由管理器 |
| **Element Plus** | ^2.13 | 基于 Vue 3 的组件库 |
| **Tailwind CSS** | ^4.1 | 原子化 CSS 框架 |
| **Vite** | ^7.3 | 下一代前端构建工具 |
| **TypeScript** | ^5.9 | JavaScript 超集，提供类型安全 |
| **Font Awesome** | ^7.1 | 图标库 |
| **Axios** | ^1.13 | HTTP 客户端 |

### 后端技术栈

| 技术 | 说明 |
|:---|:---|
| **Cloudflare Pages** | 静态网站托管平台，支持全球 CDN 加速 |
| **Pages Functions** | 基于 Cloudflare Workers 的 Serverless 函数 |
| **Hono** | 轻量级、高性能的 Web 框架，运行在 Edge Runtime |
| **R2** | S3 兼容的对象存储服务，用于存储图片文件 |
| **D1** | Cloudflare 的原生 SQL 数据库，用于存储结构化元数据和统计信息 |
| **KV** | 分布式键值存储，用于会话管理和元数据存储 |

### 项目结构

```
roim-picx/
├── 📁 src/                    # 前端源码
│   ├── 📁 components/         # Vue 组件
│   ├── 📁 views/              # 页面视图
│   ├── 📁 utils/              # 工具函数
│   ├── 📁 plugins/            # 插件配置
│   └── 📄 App.vue             # 根组件
├── 📁 functions/              # Cloudflare Pages Functions
│   └── 📁 rest/               # RESTful API 路由
│       └── 📄 [[route]].ts    # 动态路由处理
├── 📁 public/                 # 静态资源
├── 📁 docs/                   # 文档资源
├── 📁 migrations/             # D1 数据库迁移文件
├── 📄 package.json            # 项目依赖配置
├── 📄 vite.config.ts          # Vite 构建配置
├── 📄 tailwind.config.js      # Tailwind CSS 配置
└── 📄 tsconfig.json           # TypeScript 配置
```

### 数据流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant F as 前端 (Vue)
    participant A as API (Hono)
    participant R as R2 存储
    participant D as D1 数据库
    participant K as KV 存储

    U->>F: 选择图片上传
    F->>A: POST /rest/upload
    A->>K: 验证 Token/Session
    K-->>A: 验证结果
    A->>R: 存储图片文件
    R-->>A: 返回存储路径
    A->>D: 存储图片元数据
    A-->>F: 返回图片 URL
    F-->>U: 显示上传结果
```

---

## 🚀 部署教程

### 1️⃣ Fork 项目

将本项目 Fork 到自己的 GitHub 账户

### 2️⃣ 注册 Cloudflare 并开通 R2 服务

![开通 R2 服务](docs/r2.png)

### 3️⃣ 创建 Pages 项目

找到 Pages 选项并创建项目

![创建项目](docs/1.png)

### 4️⃣ 链接代码仓库

连接 GitHub 或 GitLab 并选择需要构建的项目

![链接仓库](docs/2.png)

### 5️⃣ 设置环境变量

![设置环境变量](docs/3.png)

### 6️⃣ 绑定 R2 和 KV 服务

在项目创建后，设置项目的函数信息绑定 R2 和 KV 服务

![绑定服务](docs/build_setting.png)

### 7️⃣ 构建项目

构建项目，提示成功即可访问

![构建成功](docs/build_success.png)

> [!NOTE]
> Pages 的函数变量名称需要与项目的变量名称一致。  
> 如需修改 functions 里面的 Env 命名空间，对应的文件是 `[[route]].ts`

### 8️⃣ 数据库迁移

在本地环境执行以下命令将初始表结构导入到 D1：

```bash
npx wrangler d1 execute <YOUR_DATABASE_NAME> --remote --file=./migrations/0001_init.sql
```

---

## 🔄 历史数据同步

如果你之前已经有一些图片存储在 R2 中但还没同步到 D1 数据库，可以使用内置的同步 API：

1. 获取你的管理员 Token (`PICX_AUTH_TOKEN`)。
2. 调用同步接口：
   ```bash
   curl -H "Authorization: <YOUR_ADMIN_TOKEN>" "https://your-domain.com/rest/admin/sync-r2-to-d1?limit=100"
   ```
3. 如果返回数据中 `hasMore` 为 `true`，请使用返回的 `nextCursor` 继续同步。


---

## 📸 界面截图

<table>
  <tr>
    <td align="center">
      <img src="docs/auth_page.png" alt="登录页面" width="400"><br>
      <sub><b>🔐 登录页面</b></sub>
    </td>
    <td align="center">
      <img src="docs/manage.png" alt="管理页面" width="400"><br>
      <sub><b>📋 管理页面</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="docs/upload.png" alt="上传页面" width="400"><br>
      <sub><b>📤 上传页面</b></sub>
    </td>
    <td align="center">
      <img src="docs/upload_select.png" alt="选择上传" width="400"><br>
      <sub><b>📂 选择上传</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="docs/upload_result.png" alt="上传结果" width="400"><br>
      <sub><b>✅ 上传结果</b></sub>
    </td>
    <td align="center">
      <img src="docs/delete.png" alt="删除页面" width="400"><br>
      <sub><b>🗑️ 删除页面</b></sub>
    </td>
  </tr>
</table>

---

## 🔑 GitHub 登录配置

### 步骤说明

1. **注册 GitHub 应用**  
   前往 [GitHub Developer Settings](https://github.com/settings/apps) 注册一个新的 GitHub 应用

2. **设置回调地址**  
   ```
   https://your-domain.com/auth/github/callback
   ```

3. **获取客户端凭证**  
   在应用中获取客户端 ID 和客户端密钥

4. **配置环境变量**  
   在项目中设置以下环境变量：
   
   | 变量名 | 说明 |
   |:---|:---|
   | `GITHUB_CLIENT_ID` | 应用的客户端 ID |
   | `GITHUB_CLIENT_SECRET` | 应用的客户端密钥 |
   | `GITHUB_REDIRECT_URI` | 应用的回调地址 |

### 配置截图

<table>
  <tr>
    <td align="center">
      <img src="docs/create.png" alt="创建应用" width="280"><br>
      <sub><b>创建应用</b></sub>
    </td>
    <td align="center">
      <img src="docs/create_2.png" alt="应用设置" width="280"><br>
      <sub><b>应用设置</b></sub>
    </td>
    <td align="center">
      <img src="docs/secret.png" alt="获取密钥" width="280"><br>
      <sub><b>获取密钥</b></sub>
    </td>
  </tr>
</table>

---

## 🙏 致谢

本项目参考了以下优秀开源项目：

- [cfworker-kv-image-hosting](https://github.com/realByg/cfworker-kv-image-hosting) - Cloudflare Worker KV 图床实现
- [HikariSearch](https://github.com/mixmoe/HikariSearch) - 图片搜索引擎

---

<p align="center">
  <sub>Made with ❤️ by <a href="https://github.com/roimdev">roimdev</a></sub>
</p>

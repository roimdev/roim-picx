# Cloudflare D1 配置指南

本项目已集成 Cloudflare D1 数据库支持，用于用户管理和权限控制。

## 1. 创建 D1 数据库

```bash
# 使用 Wrangler CLI 创建数据库
npx wrangler d1 create picx-db
```

记录返回的 database_id。

## 2. 执行数据库迁移

```bash
# 本地测试
npx wrangler d1 execute picx-db --local --file=./migrations/0001_init.sql

# 生产环境
npx wrangler d1 execute picx-db --file=./migrations/0001_init.sql
```

## 3. 配置 Cloudflare Pages

在 Cloudflare Dashboard 中配置 Pages 项目：

1. 进入 **Workers & Pages** > 你的 Pages 项目
2. 点击 **Settings** > **Functions**
3. 在 **D1 database bindings** 中添加：
   - Variable name: `DB`
   - D1 database: 选择 `picx-db`

## 4. 配置环境变量

在 **Settings** > **Environment variables** 中添加：

| 变量名 | 说明 | 示例 |
|:---|:---|:---|
| `ADMIN_USERS` | 超级管理员的 GitHub 用户名（逗号分隔） | `your-username,admin2` |

## 5. 本地开发配置

创建 `wrangler.toml` 文件用于本地开发：

```toml
name = "roim-picx"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "picx-db"
database_id = "your-database-id"  # 替换为实际的 database_id

[vars]
ADMIN_USERS = "your-github-username"
```

## 6. 权限说明

### 用户角色

| 角色 | 权限 |
|:---|:---|
| `admin` | 查看所有图片、管理用户、查看统计 |
| `user` | 只能查看自己上传的图片 |

### 权限控制

1. **管理员 Token**：使用 `PICX_AUTH_TOKEN` 登录，拥有所有权限
2. **超级管理员**：`ADMIN_USERS` 中的用户，自动获得 admin 角色
3. **普通用户**：只能查看自己的图片
4. **被授权用户**：管理员可以授权普通用户查看所有图片

## 7. API 接口

### 用户接口

```
GET  /rest/user/me          # 获取当前用户信息
GET  /rest/user/me/stats    # 获取当前用户统计
```

### 管理员接口

```
GET  /rest/admin/users                    # 获取所有用户
GET  /rest/admin/users/:login             # 获取单个用户
POST /rest/admin/users/:login/view-all    # 授权查看所有图片
POST /rest/admin/users/:login/role        # 设置用户角色
POST /rest/admin/users/:login/quota       # 设置存储配额
GET  /rest/admin/stats                    # 获取系统统计
GET  /rest/admin/users/:login/stats       # 获取用户统计
GET  /rest/admin/audit-logs               # 获取审计日志
```

## 8. 数据迁移（可选）

如果需要将现有 R2 中的图片元数据同步到 D1，可以运行以下脚本：

```javascript
// 在 Cloudflare Workers 控制台执行
const list = await env.PICX.list({ include: ['customMetadata'] })
for (const obj of list.objects) {
    if (obj.customMetadata?.uploadedBy) {
        await env.DB.prepare(
            `INSERT OR IGNORE INTO images (key, user_login, size, created_at) VALUES (?, ?, ?, ?)`
        ).bind(
            obj.key,
            obj.customMetadata.uploadedBy,
            obj.size,
            obj.uploaded?.toISOString()
        ).run()
    }
}
```

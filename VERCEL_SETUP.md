# Vercel Postgres 部署指南

## 已完成的迁移

✅ 已将 SQLite（better-sqlite3）迁移到 Vercel Postgres
✅ 所有 API 路由已更新以使用 PostgreSQL
✅ 构建通过验证

## 在 Vercel 部署步骤

### 1. 创建 Vercel Postgres 数据库

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 点击 **Storage** 标签
4. 点击 **Create Database**
5. 选择 **Postgres**
6. 选择区域（建议选择离你最近的区域）
7. 点击 **Create**

### 2. 连接数据库到项目

创建数据库后，Vercel 会自动添加以下环境变量到你的项目：

- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

**不需要手动配置！** `@vercel/postgres` 会自动使用这些环境变量。

### 3. 部署项目

```bash
git add .
git commit -m "feat: 迁移到 Vercel Postgres"
git push
```

推送后，Vercel 会自动部署。数据库表会在第一次 API 调用时自动创建。

### 4. 验证部署

部署完成后：

1. 访问你的项目 URL
2. 尝试创建用户
3. 检查是否成功（不再报 500 错误）

## 本地开发配置（可选）

如果想在本地使用 Vercel Postgres：

1. 安装 Vercel CLI：
   ```bash
   pnpm add -g vercel
   ```

2. 链接项目并拉取环境变量：
   ```bash
   vercel link
   vercel env pull .env.local
   ```

3. 启动开发服务器：
   ```bash
   pnpm dev
   ```

## 数据库管理

### 查看数据库

在 Vercel Dashboard > Storage > 你的数据库 > Data 标签中可以：
- 查看所有表
- 运行 SQL 查询
- 查看数据

### 运行 SQL 查询

在 Vercel Dashboard 的 Query 标签中可以运行 SQL，例如：

```sql
-- 查看所有用户
SELECT * FROM users;

-- 查看某用户的基金
SELECT * FROM funds WHERE user_id = 'your_user_id';

-- 清空表（谨慎使用）
TRUNCATE TABLE history, funds, users CASCADE;
```

## 重要说明

⚠️ **数据迁移**：如果你在本地 SQLite 中有重要数据，需要手动导出并导入到 Postgres。

✨ **自动初始化**：每次 API 调用时都会检查并创建必要的表（如果不存在），无需手动初始化。

🔒 **安全**：所有数据库凭证都通过 Vercel 的环境变量安全管理，不会暴露在代码中。

## 常见问题

### Q: 部署后还是 500 错误？
A: 检查 Vercel Dashboard > Deployment > Functions 日志，查看具体错误信息。

### Q: 如何备份数据库？
A: 在 Vercel Dashboard > Storage > 你的数据库 > Settings 中可以配置自动备份。

### Q: 免费套餐限制？
A: Vercel Postgres 免费套餐包括：
- 60 小时的计算时间/月
- 256 MB 存储
- 100 个并发连接

对于个人项目完全够用。

## 技术细节

### 主要变更

1. **依赖包**：
   - 移除：`better-sqlite3`, `@types/better-sqlite3`
   - 新增：`@vercel/postgres`

2. **数据库层** (`src/server/db.ts`)：
   - 使用 `@vercel/postgres` 的 `sql` 函数
   - 异步查询（返回 Promise）
   - 自动连接池管理

3. **API 路由**：
   - 查询语法：从 `?` 占位符改为 PostgreSQL 的 `${variable}` 模板语法
   - 所有查询改为异步 `await sql`
   - 移除 SQLite 特有的事务语法

4. **数据类型**：
   - `INTEGER` → `SERIAL`
   - `REAL` → `DECIMAL`
   - `TEXT` → `TEXT`
   - 日期字段使用 `TIMESTAMP`

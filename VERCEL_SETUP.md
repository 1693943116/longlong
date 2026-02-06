# Vercel Postgres 部署指南

## ✅ 已完成的迁移（更新版）

- ✅ 混合数据库方案：本地 SQLite + Vercel PostgreSQL
- ✅ 自动检测环境并切换数据库
- ✅ SQL 占位符自动转换（`?` → `$1, $2, $3`）
- ✅ PostgreSQL 兼容的 SQL 语法
- ✅ 所有 API 路由已更新
- ✅ 构建通过验证

## 🎯 工作原理

### 自动数据库切换
```
本地开发 (没有 POSTGRES_URL) → SQLite
Vercel 部署 (有 POSTGRES_URL) → PostgreSQL
```

### SQL 语法自动转换
- 使用统一的 `?` 占位符编写 SQL
- PostgreSQL 环境自动转换为 `$1, $2, $3`
- SQLite 环境保持 `?` 不变

## 📦 在 Vercel 部署步骤

### 1. 创建 Vercel Postgres 数据库

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 点击 **Storage** 标签
4. 点击 **Create Database**
5. 选择 **Postgres**
6. 选择区域（建议选择离你最近的区域）
7. 点击 **Create**

### 2. 部署项目

```bash
git add .
git commit -m "fix: 修复 PostgreSQL 占位符转换和 SQL 兼容性"
git push
```

推送后，Vercel 会自动部署。数据库表会在第一次 API 调用时自动创建。

### 3. 验证部署

1. 等待 Vercel 部署完成
2. 访问你的项目 URL
3. 测试创建用户 API
4. 检查 Vercel Dashboard > Deployments > Functions 日志

如果看到以下日志，说明 PostgreSQL 工作正常：
```
[DB] 使用数据库: PostgreSQL
[DB] PostgreSQL 数据库初始化成功
[DB] PG Run: INSERT INTO users (id, name, created_at) VALUES ($1, $2, $3)
```

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

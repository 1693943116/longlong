# 基金管理系统

一个简单的基金管理应用，使用浏览器 localStorage 存储数据。

## ✨ 特性

- 📊 多用户管理
- 💰 基金持仓跟踪
- 📈 实时数据更新（每30秒）
- 📉 历史数据图表
- 💾 数据存储在浏览器本地（无需数据库）

## 🚀 部署到 Vercel

直接部署即可，无需配置数据库！

```bash
# 提交代码
git add .
git commit -m "feat: 使用 localStorage 存储数据"
git push

# 或者在 Vercel 中导入仓库
```

## 🛠️ 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建
pnpm build
```

## 📝 数据存储

所有数据存储在浏览器的 localStorage 中：
- 用户数据
- 基金持仓
- 历史数据

**注意**：清除浏览器数据会导致数据丢失。

## 🔧 技术栈

- Next.js 16
- React 19
- TypeScript
- TailwindCSS
- Recharts（图表）

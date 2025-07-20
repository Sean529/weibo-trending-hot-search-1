# Deno Deploy 部署指南

## 部署步骤

### 1. 准备 GitHub Token

1. 访问 [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. 创建新的 Classic Token
3. 勾选以下权限：
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
4. 复制生成的 token

### 2. 部署到 Deno Deploy

1. 访问 [dash.deno.com](https://dash.deno.com)
2. 点击 "New Project"
3. 连接 GitHub 账户并选择此仓库
4. 设置项目配置：
   - **入口文件**: `deploy.ts`
   - **自动部署**: 启用
5. 添加环境变量：
   - `GITHUB_TOKEN`: 你的 GitHub token
   - `GITHUB_REPO_OWNER`: 仓库所有者 (例如: justjavac)
   - `GITHUB_REPO_NAME`: 仓库名称 (例如: weibo-trending-hot-search)
   - `WEIBO_COOKIE`: (可选) 自定义微博 Cookie

### 3. 验证部署

部署完成后，访问你的 Deno Deploy URL：

- `GET /` - 显示服务状态
- `GET /health` - 健康检查 JSON 响应
- `POST /trigger` - 手动触发一次爬取

### 4. 定时任务

定时任务会自动启动，每小时执行一次。你可以在 Deno Deploy 控制台的日志中查看执行情况。

## 工作原理

1. **定时执行**: 使用 `Deno.cron()` 每小时执行一次
2. **数据爬取**: 从微博热搜页面获取趋势话题
3. **数据存储**: 通过 GitHub API 直接提交到仓库
4. **文件更新**: 
   - `raw/YYYY-MM-DD.json` - 原始数据
   - `archives/YYYY-MM-DD.md` - 日常归档
   - `README.md` - 实时热搜列表

## 环境差异

- **本地运行**: 使用文件系统存储
- **Deno Deploy**: 使用 GitHub API 存储
- **自动检测**: 代码会根据 `DENO_DEPLOYMENT_ID` 环境变量自动切换模式

## 故障排除

### 常见问题

1. **GitHub API 权限错误**: 检查 token 权限是否包含 `repo`
2. **微博请求失败**: 可能需要更新 Cookie 或添加代理
3. **定时任务未执行**: 查看 Deno Deploy 控制台日志

### 调试命令

```bash
# 本地测试
deno task start

# 检查权限
deno run --allow-net --allow-env deploy.ts
```
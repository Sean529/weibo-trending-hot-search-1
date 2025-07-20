# Deno Deploy 部署指南

## 完整配置清单

### 必需配置项

#### 1. GitHub Personal Access Token
1. 访问 [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. 选择 **Fine-grained tokens** (推荐) 或 Classic tokens
3. **Fine-grained tokens 权限**:
   - `Contents`: **Read and write** (读写仓库文件)
   - `Metadata`: **Read** (自动包含)
4. **Classic tokens 权限** (备选):
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)

#### 2. Deno Deploy 项目设置
1. 访问 [dash.deno.com](https://dash.deno.com)
2. 点击 **"New Project"**
3. 连接 GitHub 账户并选择仓库
4. **关键配置**:
   - **入口文件**: `deploy.ts`
   - **自动部署**: 启用
   - **GitHub Integration**: 启用

#### 3. 环境变量配置 (在 Deno Deploy 项目设置中)
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_REPO_OWNER=Sean529
GITHUB_REPO_NAME=weibo-trending-hot-search-1
WEIBO_COOKIE=SUB=_2AkMWJrk... (可选，使用默认值)
```

### 可选配置项

#### 4. GitHub Actions 工作流
项目已包含以下工作流：
- `ci.yml` - 代码质量检查 (格式化、类型检查、测试)
- `deploy.yml` - 自动部署到 Deno Deploy

#### 5. 本地开发环境
创建 `.env` 文件 (参考 `.env.example`):
```bash
GITHUB_TOKEN=your_token_here
GITHUB_REPO_OWNER=Sean529
GITHUB_REPO_NAME=weibo-trending-hot-search-1
WEIBO_COOKIE=your_custom_cookie (可选)
```

## 部署步骤详解

### 第一步：准备 GitHub Token
1. **创建 Token**:
   - 访问 GitHub Settings > Developer settings > Personal access tokens
   - 选择 "Fine-grained tokens" (推荐新方式)
   - 设置过期时间 (建议 90 天或更长)
   
2. **配置权限**:
   - **Contents**: Read and write (必需 - 用于读写数据文件)
   - **Metadata**: Read (自动包含 - 访问仓库基本信息)

3. **复制 Token**: 保存生成的 token (格式: `ghp_xxxxxxxxxxxxxxxxxxxx`)

### 第二步：创建 Deno Deploy 项目
1. **登录 Deno Deploy**: 使用 GitHub 账户登录 [dash.deno.com](https://dash.deno.com)
2. **新建项目**: 点击 "New Project"
3. **连接仓库**: 选择 `Sean529/weibo-trending-hot-search-1`
4. **项目配置**:
   - **Project Name**: 自定义名称 (如: `weibo-trend-72`)
   - **Entry Point**: `deploy.ts`
   - **Automatic Deployment**: 启用

### 第三步：配置环境变量
在 Deno Deploy 项目的 Settings > Environment Variables 中添加：

| 变量名 | 值 | 说明 |
|--------|----|----- |
| `GITHUB_TOKEN` | `ghp_xxxxxxxxxxxxxxxxxxxx` | GitHub Personal Access Token |
| `GITHUB_REPO_OWNER` | `Sean529` | GitHub 仓库所有者 |
| `GITHUB_REPO_NAME` | `weibo-trending-hot-search-1` | GitHub 仓库名称 |
| `WEIBO_COOKIE` | (可选) | 自定义微博 Cookie，不设置会使用默认值 |

### 第四步：验证部署
部署完成后，访问分配的 URL (如: `https://your-project.deno.dev/`):

- **`GET /`** - 显示微博热搜列表
- **`GET /health`** - JSON 格式的健康检查
- **`POST /trigger`** - 手动触发数据抓取

## 工作原理

### 数据流程
1. **定时执行**: `Deno.cron()` 每小时执行一次 (`0 * * * *`)
2. **数据抓取**: 从 `https://s.weibo.com/top/summary` 抓取热搜
3. **数据处理**: 解析 HTML，提取热搜标题和链接
4. **存储到 GitHub**: 通过 GitHub API 保存到仓库
5. **文件更新**:
   - `raw/YYYY-MM-DD.json` - 原始 JSON 数据
   - `archives/YYYY-MM-DD.md` - 归档页面
   - `README.md` - 实时热搜列表

### 环境差异
- **本地开发**: 使用文件系统存储，适合测试
- **Deno Deploy**: 使用 GitHub API 存储，生产环境
- **自动检测**: 通过 `DENO_DEPLOYMENT_ID` 环境变量自动识别

## 故障排除

### 常见错误及解决方案

#### 1. GitHub API 403 错误
**错误**: `GitHub API error: 403 Resource not accessible by personal access token`
**解决**: 
- 检查 token 权限是否包含 `Contents: Read and write`
- 确认 token 未过期
- 验证仓库名称和所有者是否正确

#### 2. 中文编码错误
**错误**: `Cannot encode string: string contains characters outside of the Latin1 range`
**解决**: 已修复，使用 `TextEncoder/TextDecoder` 处理 UTF-8 编码

#### 3. Git 冲突错误
**错误**: `GitHub API error: 409 is at xxx but expected yyy`
**解决**: 已实现重试机制，自动解决并发修改冲突

#### 4. 格式化失败
**错误**: `deno fmt --check` 在 CI 中失败
**解决**: `.claude/settings.local.json` 已添加到 `.gitignore`

### 调试命令

```bash
# 本地测试数据抓取
deno task start

# 测试部署脚本
deno run --allow-net --allow-env deploy.ts

# 检查格式
deno fmt --check

# 运行测试
deno task test

# 手动触发远程抓取
curl -X POST https://your-project.deno.dev/trigger
```

### 监控和日志
- **Deno Deploy 日志**: 在项目控制台查看实时日志
- **GitHub Actions**: 查看 CI/CD 执行状态
- **健康检查**: 定期访问 `/health` 端点

## 最佳实践

### 安全性
1. **Token 权限最小化**: 只授予必需的权限
2. **定期轮换**: 建议每 90 天更换 GitHub Token
3. **环境分离**: 本地和生产环境使用不同配置

### 维护性
1. **监控**: 设置告警监控部署状态
2. **备份**: GitHub 仓库本身就是数据备份
3. **更新**: 定期更新依赖和 Deno 版本

### 性能优化
1. **缓存**: 网页响应设置了 5 分钟缓存
2. **重试机制**: 自动处理 GitHub API 冲突
3. **错误处理**: 友好的错误提示和降级方案

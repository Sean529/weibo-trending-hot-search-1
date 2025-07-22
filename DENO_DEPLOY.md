# Deno Deploy 部署指南

## 概述

使用 Deno Deploy 的免费定时任务功能替代 GitHub Actions，实现每小时自动抓取微博热搜。

## 部署步骤

### 1. 准备代码

代码已经支持 Deno Deploy 定时任务：

```typescript
// main.ts 中已包含
Deno.cron("Weibo Trending Scraper", "0 * * * *", scrapeTrendingTopics);
```

### 2. 部署到 Deno Deploy

1. 访问 [dash.deno.com](https://dash.deno.com)
2. 使用 GitHub 账户登录
3. 创建新项目
4. 连接到您的 GitHub 仓库
5. 设置入口文件为 `main.ts`

### 3. 配置环境变量

在 Deno Deploy 项目设置中添加：

```
GITHUB_TOKEN=your_github_personal_access_token
WEIBO_APPEND_MODE=true
WEIBO_COOKIE=your_weibo_cookie
GITHUB_REPO_OWNER=your_username
GITHUB_REPO_NAME=weibo-trending-hot-search-1
```

### 4. GitHub Token 设置

创建 Personal Access Token：

1. GitHub Settings → Developer settings → Personal access tokens
2. 选择 "Tokens (classic)"
3. 生成新 token，勾选以下权限：
   - `repo` (完整仓库访问)
   - `workflow` (工作流访问)

### 5. 微博 Cookie 获取

1. 浏览器访问 weibo.com 并登录
2. 打开开发者工具 (F12)
3. 网络面板，刷新页面
4. 找到任意请求，复制 Cookie 头部值

## 工作原理

1. **定时触发**: Deno Deploy 每小时执行一次定时任务
2. **数据抓取**: 从微博 API 获取最新热搜数据
3. **去重追加**: 使用 `appendWordsWithDedup` 函数去重后追加新数据
4. **自动提交**: 通过 GitHub API 自动提交更新到仓库

## 优势

- ✅ **完全免费** - Deno Deploy 定时任务免费
- ✅ **无需维护** - 自动运行，无需管理服务器
- ✅ **高可用性** - Deno Deploy 提供全球 CDN
- ✅ **简单配置** - 只需设置环境变量
- ✅ **实时监控** - Deno Deploy 提供日志查看

## 验证部署

部署成功后：

1. 在 Deno Deploy 控制台查看日志
2. 检查 GitHub 仓库是否有自动提交
3. 访问您的部署 URL 查看网页界面

## 故障排除

### 常见问题

1. **定时任务不运行**
   - 检查环境变量是否正确设置
   - 查看 Deno Deploy 日志中的错误信息

2. **GitHub API 权限错误**
   - 确认 GITHUB_TOKEN 权限正确
   - 检查仓库名称是否匹配

3. **微博数据获取失败**
   - 更新 WEIBO_COOKIE
   - 检查网络连接

### 日志查看

在 Deno Deploy 控制台中可以查看：

- 定时任务执行日志
- 错误信息
- 性能指标

## 与 GitHub Actions 对比

| 特性       | Deno Deploy | GitHub Actions               |
| ---------- | ----------- | ---------------------------- |
| 费用       | 完全免费    | 公共仓库免费，私有仓库有限制 |
| 配置复杂度 | 简单        | 中等                         |
| 日志查看   | 实时        | 需要进入 Actions 页面        |
| 扩展性     | 适中        | 非常好                       |

Deno Deploy 方案更简单，适合这种定时数据抓取的场景。

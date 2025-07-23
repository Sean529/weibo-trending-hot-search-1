# 使用方法

## 安装要求

- [Deno](https://deno.land/) 运行时

## 基本用法

### 抓取热搜数据

```bash
deno task start
```

### 运行测试

```bash
deno task test
```

## 功能说明

- 自动抓取微博热搜榜
- 数据保存到 `raw/` 目录
- 更新 `README.md` 显示今日热搜

## 自动化

项目配置了 GitHub Actions，每小时自动运行一次。

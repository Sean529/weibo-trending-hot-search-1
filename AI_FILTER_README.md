# AI筛选社会新闻功能说明

基于参考项目的豆包AI模型方案，为微博热搜项目实现了智能社会新闻筛选功能。

## 🚀 功能特性

- **智能分类**: 使用豆包AI模型自动识别和分类新闻内容
- **5大类别**: 支持社会新闻、娱乐新闻、科技新闻、体育新闻、财经新闻
- **增量处理**: 支持对历史数据进行AI分析，避免重复处理
- **前端筛选**: 网页界面支持按类型实时筛选显示
- **API接口**: 提供RESTful API支持数据筛选

## 📁 新增文件

- `ai-filter.ts` - AI筛选核心模块
- `ai-filter-tool.ts` - 命令行AI筛选工具

## 🔧 使用方法

### 1. 环境配置

设置豆包AI API密钥：
```bash
export DOUBAO_API_KEY="your-api-key"
```

### 2. 命令行工具

```bash
# 筛选今日社会新闻
deno task ai-social

# 筛选特定日期的娱乐新闻
deno task ai-entertainment --date 2025-07-22

# 筛选科技新闻
deno task ai-tech

# 其他类别
deno task ai-sports    # 体育新闻
deno task ai-finance   # 财经新闻
```

### 3. API接口

```bash
# 获取按类别筛选的数据
GET /api/filtered?category=社会新闻

# 支持的类别参数
- 社会新闻
- 娱乐新闻  
- 科技新闻
- 体育新闻
- 财经新闻
```

### 4. 前端界面

访问网页后，使用右上角的筛选下拉菜单按类型查看不同分类的新闻。

## 🤖 AI模型配置

- **模型**: doubao-seed-1-6-flash-250615
- **API**: 字节跳动火山引擎
- **特点**: 低延迟、高准确率的文本分类

## 📊 处理流程

1. 加载历史热搜数据
2. 筛选未处理的条目
3. 调用豆包AI进行分类判断
4. 保存带分类标签的数据
5. 前端支持按类型筛选显示

## 🔍 数据结构扩展

```typescript
type Word = {
  title: string;
  url: string;
  aiCategory?: string;     // AI分类结果
  processedAt?: string;    // 处理时间戳
};
```

功能已完全实现并可立即使用！
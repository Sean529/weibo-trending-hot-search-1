import type { Word, FilterCategory } from "./types.ts";
import { format } from "std/datetime/mod.ts";

// AI分类数据存储结构
export interface AIClassifiedData {
  date: string;
  timestamp: string;
  totalProcessed: number;
  categories: {
    [key in FilterCategory]: {
      count: number;
      items: Word[];
    }
  };
  // 新增：已处理但未分类的内容（用于去重）
  processedButUnclassified: {
    count: number;
    titles: string[]; // 只存储标题，节省空间
  };
  metadata: {
    lastUpdated: string;
    processingStats: {
      totalChecked: number;
      newlyProcessed: number;
      skippedDuplicates: number;
    };
  };
}

// 获取AI分类数据文件路径
function getAIDataPath(date: string): string {
  return `./ai-classified/${date}.json`;
}

// 确保目录存在
async function ensureAIDirectory(): Promise<void> {
  try {
    await Deno.stat("./ai-classified");
  } catch {
    await Deno.mkdir("./ai-classified", { recursive: true });
  }
}

// 加载AI分类数据
export async function loadAIClassifiedData(date: string): Promise<AIClassifiedData> {
  await ensureAIDirectory();
  const filePath = getAIDataPath(date);

  try {
    const content = await Deno.readTextFile(filePath);
    return JSON.parse(content);
  } catch {
    // 如果文件不存在，返回初始结构
    return {
      date,
      timestamp: new Date().toISOString(),
      totalProcessed: 0,
      categories: {
        '社会新闻': { count: 0, items: [] },
        '娱乐新闻': { count: 0, items: [] },
        '科技新闻': { count: 0, items: [] },
        '体育新闻': { count: 0, items: [] },
        '财经新闻': { count: 0, items: [] },
      },
      processedButUnclassified: {
        count: 0,
        titles: [],
      },
      metadata: {
        lastUpdated: new Date().toISOString(),
        processingStats: {
          totalChecked: 0,
          newlyProcessed: 0,
          skippedDuplicates: 0,
        },
      },
    };
  }
}

// 保存AI分类数据
export async function saveAIClassifiedData(data: AIClassifiedData): Promise<void> {
  await ensureAIDirectory();
  const filePath = getAIDataPath(data.date);
  
  // 更新metadata
  data.metadata.lastUpdated = new Date().toISOString();
  data.totalProcessed = Object.values(data.categories).reduce((sum, cat) => sum + cat.count, 0);
  
  await Deno.writeTextFile(filePath, JSON.stringify(data, null, 2));
}

// 添加分类数据到指定类别
export async function addToCategory(
  date: string,
  category: FilterCategory,
  items: Word[]
): Promise<AIClassifiedData> {
  const data = await loadAIClassifiedData(date);
  
  // 去重：检查是否已经存在
  const existingTitles = new Set(data.categories[category].items.map(item => item.title));
  const newItems = items.filter(item => !existingTitles.has(item.title));
  
  // 添加新项目
  data.categories[category].items.push(...newItems);
  data.categories[category].count = data.categories[category].items.length;
  
  // 更新统计
  data.metadata.processingStats.newlyProcessed += newItems.length;
  data.metadata.processingStats.skippedDuplicates += items.length - newItems.length;
  data.metadata.processingStats.totalChecked += items.length;
  
  await saveAIClassifiedData(data);
  return data;
}

// 获取指定类别的数据
export async function getCategoryData(
  date: string,
  category: FilterCategory
): Promise<Word[]> {
  const data = await loadAIClassifiedData(date);
  return data.categories[category].items;
}

// 获取所有已处理的标题（用于去重）
export async function getProcessedTitles(date: string): Promise<Set<string>> {
  const data = await loadAIClassifiedData(date);
  const allTitles = new Set<string>();
  
  // 添加所有分类中的标题
  Object.values(data.categories).forEach(category => {
    category.items.forEach(item => {
      allTitles.add(item.title);
    });
  });
  
  // 添加已处理但未分类的标题
  data.processedButUnclassified.titles.forEach(title => {
    allTitles.add(title);
  });
  
  return allTitles;
}

// 获取统计信息
export async function getAIStats(date: string): Promise<AIClassifiedData['metadata']> {
  const data = await loadAIClassifiedData(date);
  return data.metadata;
}

// 列出所有可用的日期
export async function listAIClassifiedDates(): Promise<string[]> {
  await ensureAIDirectory();
  
  try {
    const dates: string[] = [];
    for await (const entry of Deno.readDir("./ai-classified")) {
      if (entry.isFile && entry.name.endsWith('.json')) {
        dates.push(entry.name.replace('.json', ''));
      }
    }
    return dates.sort();
  } catch {
    return [];
  }
}

// 记录已处理的内容（包括非目标类别），避免重复AI处理
export async function markAsProcessed(date: string, items: Word[]): Promise<void> {
  const data = await loadAIClassifiedData(date);
  
  // 获取新的标题（去重）
  const existingUnclassified = new Set(data.processedButUnclassified.titles);
  const newTitles = items
    .map(item => item.title)
    .filter(title => !existingUnclassified.has(title));
  
  // 添加新的未分类标题
  data.processedButUnclassified.titles.push(...newTitles);
  data.processedButUnclassified.count = data.processedButUnclassified.titles.length;
  
  // 更新处理统计
  data.metadata.processingStats.totalChecked += items.length;
  
  await saveAIClassifiedData(data);
}
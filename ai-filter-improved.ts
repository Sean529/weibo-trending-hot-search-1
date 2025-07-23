#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env
// 改进的AI筛选工具 - 支持去重和按天存储

import { loadFromStorage } from "./storage.ts";
import { filterWordsByAI, isAIConfigValid } from "./ai-filter.ts";
import { 
  loadAIClassifiedData, 
  addToCategory, 
  getProcessedTitles, 
  getAIStats 
} from "./ai-storage.ts";
import type { Word, FilterCategory } from "./types.ts";
import { format } from "std/datetime/mod.ts";

const VALID_CATEGORIES: FilterCategory[] = [
  '社会新闻', 
  '娱乐新闻', 
  '科技新闻', 
  '体育新闻', 
  '财经新闻'
];

function showUsage() {
  console.log(`
改进的AI筛选工具 - 支持去重和按天存储

使用方法: deno run --allow-net --allow-read --allow-write --allow-env ai-filter-improved.ts [选项]

选项:
  --date YYYY-MM-DD     指定要处理的日期 (默认: 今天)
  --category CATEGORY   指定筛选类别 (默认: 社会新闻)
  --limit NUMBER        限制处理数量 (默认: 无限制)
  --stats               显示统计信息
  --help                显示此帮助信息

支持的类别:
  ${VALID_CATEGORIES.join(', ')}

示例:
  # 筛选今日社会新闻，自动去重
  deno run --allow-net --allow-read --allow-write --allow-env ai-filter-improved.ts --category 社会新闻
  
  # 限制处理10条，用于测试
  deno run --allow-net --allow-read --allow-write --allow-env ai-filter-improved.ts --limit 10
  
  # 查看处理统计
  deno run --allow-net --allow-read --allow-write --allow-env ai-filter-improved.ts --stats

环境变量:
  DOUBAO_API_KEY        豆包AI API密钥 (必需)

新功能:
  ✓ 自动去重：已识别过的内容不会重复处理
  ✓ 按天存储：AI分类结果按日期单独保存在 ai-classified/ 目录
  ✓ 统计信息：追踪处理进度和token使用情况
  ✓ 增量处理：支持中断后继续处理
`);
}

async function showStats(targetDate: string) {
  console.log(`📊 AI处理统计 - ${targetDate}`);
  console.log("=" * 50);
  
  try {
    const data = await loadAIClassifiedData(targetDate);
    const stats = data.metadata;
    
    console.log(`📅 日期: ${data.date}`);
    console.log(`🕒 最后更新: ${new Date(stats.lastUpdated).toLocaleString('zh-CN')}`);
    console.log(`📈 总计已分类: ${data.totalProcessed} 条`);
    console.log();
    
    console.log("📂 分类统计:");
    for (const [category, info] of Object.entries(data.categories)) {
      console.log(`   ${category}: ${info.count} 条`);
    }
    console.log();
    
    console.log("🔍 处理统计:");
    console.log(`   总计检查: ${stats.processingStats.totalChecked} 条`);
    console.log(`   新增处理: ${stats.processingStats.newlyProcessed} 条`);
    console.log(`   跳过重复: ${stats.processingStats.skippedDuplicates} 条`);
    
    if (stats.processingStats.totalChecked > 0) {
      const efficiency = ((stats.processingStats.newlyProcessed / stats.processingStats.totalChecked) * 100).toFixed(1);
      console.log(`   处理效率: ${efficiency}% (避免重复率: ${(100 - parseFloat(efficiency)).toFixed(1)}%)`);
    }
    
  } catch (error) {
    console.error("❌ 获取统计失败:", (error as Error).message);
  }
}

async function main() {
  const args = Deno.args;
  
  if (args.includes("--help")) {
    showUsage();
    return;
  }

  // 解析命令行参数
  let targetDate = format(new Date(), "yyyy-MM-dd");
  let category: FilterCategory = '社会新闻';
  let limit: number | undefined;
  let showStatsOnly = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--date":
        if (i + 1 < args.length) {
          targetDate = args[++i];
        }
        break;
      case "--category":
        if (i + 1 < args.length) {
          const inputCategory = args[++i] as FilterCategory;
          if (VALID_CATEGORIES.includes(inputCategory)) {
            category = inputCategory;
          } else {
            console.error(`❌ 无效的类别: ${inputCategory}`);
            console.error(`支持的类别: ${VALID_CATEGORIES.join(', ')}`);
            Deno.exit(1);
          }
        }
        break;
      case "--limit":
        if (i + 1 < args.length) {
          limit = parseInt(args[++i]);
          if (isNaN(limit) || limit <= 0) {
            console.error("❌ 限制数量必须是正整数");
            Deno.exit(1);
          }
        }
        break;
      case "--stats":
        showStatsOnly = true;
        break;
    }
  }

  if (showStatsOnly) {
    await showStats(targetDate);
    return;
  }

  // 检查AI配置
  if (!isAIConfigValid()) {
    console.error("❌ AI配置无效，请设置环境变量 DOUBAO_API_KEY");
    Deno.exit(1);
  }

  try {
    console.log(`🚀 智能AI筛选 (改进版)`);
    console.log(`📅 日期: ${targetDate}`);
    console.log(`📂 类别: ${category}`);
    if (limit) console.log(`🔢 限制: ${limit} 条`);
    console.log();

    // 加载原始数据
    console.log("📖 加载原始数据...");
    const allWords = await loadFromStorage(targetDate);
    console.log(`✅ 加载了 ${allWords.length} 条热搜数据`);

    if (allWords.length === 0) {
      console.log("⚠️  没有找到数据");
      return;
    }

    // 获取已处理的标题（去重）
    console.log("🔍 检查已处理数据...");
    const processedTitles = await getProcessedTitles(targetDate);
    console.log(`📝 已处理: ${processedTitles.size} 条`);

    // 筛选出未处理的数据
    const unprocessedWords = allWords.filter(word => !processedTitles.has(word.title));
    console.log(`🆕 待处理: ${unprocessedWords.length} 条`);

    if (unprocessedWords.length === 0) {
      console.log("✅ 所有数据已处理完成");
      await showStats(targetDate);
      return;
    }

    // 应用限制
    const wordsToProcess = limit ? unprocessedWords.slice(0, limit) : unprocessedWords;
    if (limit && wordsToProcess.length < unprocessedWords.length) {
      console.log(`🔢 限制处理前 ${limit} 条`);
    }

    // AI筛选
    console.log("");
    console.log("🤖 开始AI分析...");
    const filteredWords = await filterWordsByAI(wordsToProcess, category);

    // 保存到AI分类存储
    console.log("");
    console.log("💾 保存AI分类结果...");
    const aiData = await addToCategory(targetDate, category, filteredWords);

    // 显示结果
    console.log("");
    console.log("📊 处理完成!");
    console.log(`✅ 本次筛选出 ${category}: ${filteredWords.length} 条`);
    console.log(`📈 累计 ${category}: ${aiData.categories[category].count} 条`);
    console.log(`📝 总计已分类: ${aiData.totalProcessed} 条`);

    if (filteredWords.length > 0) {
      console.log("");
      console.log(`📝 新筛选出的${category}:`);
      filteredWords.forEach((word, index) => {
        console.log(`   ${index + 1}. ${word.title}`);
      });
    }

    // 显示节省的token统计
    const stats = aiData.metadata.processingStats;
    if (stats.skippedDuplicates > 0) {
      console.log("");
      console.log("💰 Token节省统计:");
      console.log(`   跳过重复: ${stats.skippedDuplicates} 条`);
      console.log(`   节省率: ${((stats.skippedDuplicates / (stats.totalChecked || 1)) * 100).toFixed(1)}%`);
    }

  } catch (error) {
    console.error("❌ 处理失败:", (error as Error).message);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
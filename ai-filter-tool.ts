#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env
// AI筛选工具 - 对历史数据进行AI分类

import { loadFromStorage, saveToStorage } from "./storage.ts";
import { filterWordsByAI, isAIConfigValid } from "./ai-filter.ts";
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
使用方法: deno run --allow-net --allow-read --allow-write --allow-env ai-filter-tool.ts [选项]

选项:
  --date YYYY-MM-DD     指定要处理的日期 (默认: 今天)
  --category CATEGORY   指定筛选类别 (默认: 社会新闻)
  --help                显示此帮助信息

支持的类别:
  ${VALID_CATEGORIES.join(', ')}

示例:
  deno run --allow-net --allow-read --allow-write --allow-env ai-filter-tool.ts --date 2025-07-22 --category 社会新闻
  deno run --allow-net --allow-read --allow-write --allow-env ai-filter-tool.ts --category 娱乐新闻

环境变量:
  DOUBAO_API_KEY        豆包AI API密钥 (必需)
`);
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
    }
  }

  // 检查AI配置
  if (!isAIConfigValid()) {
    console.error("❌ AI配置无效，请设置环境变量 DOUBAO_API_KEY");
    Deno.exit(1);
  }

  try {
    console.log(`🚀 开始AI筛选`);
    console.log(`📅 日期: ${targetDate}`);
    console.log(`📂 类别: ${category}`);
    console.log("");

    // 加载原始数据
    console.log("📖 加载数据...");
    const words = await loadFromStorage(targetDate);
    console.log(`✅ 加载了 ${words.length} 条热搜数据`);

    if (words.length === 0) {
      console.log("⚠️  没有找到数据");
      return;
    }

    // 筛选出未处理的数据
    const unprocessedWords = words.filter(word => !word.aiCategory);
    const alreadyProcessed = words.filter(word => word.aiCategory);
    
    console.log(`📊 已处理: ${alreadyProcessed.length} 条，待处理: ${unprocessedWords.length} 条`);

    if (unprocessedWords.length === 0) {
      console.log("✅ 所有数据已处理完成");
      const categoryFiltered = alreadyProcessed.filter(word => word.aiCategory === category);
      console.log(`📈 ${category}类别共有 ${categoryFiltered.length} 条`);
      return;
    }

    // AI筛选
    console.log("");
    console.log("🤖 开始AI分析...");
    const filteredWords = await filterWordsByAI(unprocessedWords, category);

    // 合并结果
    const updatedWords = [
      ...alreadyProcessed,
      ...filteredWords,
      // 未匹配的也要保留，但不添加aiCategory字段
      ...unprocessedWords.filter(word => 
        !filteredWords.some(filtered => 
          filtered.title === word.title && filtered.url === word.url
        )
      )
    ];

    // 保存更新后的数据
    console.log("");
    console.log("💾 保存结果...");
    await saveToStorage(updatedWords, targetDate);

    // 统计结果
    const totalProcessed = updatedWords.filter(word => word.aiCategory).length;
    const newlyFound = filteredWords.length;
    const categoryTotal = updatedWords.filter(word => word.aiCategory === category).length;

    console.log("");
    console.log("📊 筛选完成!");
    console.log(`✅ 本次新筛选出 ${category} ${newlyFound} 条`);
    console.log(`📈 总计已分类: ${totalProcessed} 条`);
    console.log(`🎯 ${category}类别总计: ${categoryTotal} 条`);

    if (newlyFound > 0) {
      console.log("");
      console.log(`📝 新筛选出的${category}:`);
      filteredWords.forEach((word, index) => {
        console.log(`   ${index + 1}. ${word.title}`);
      });
    }

  } catch (error) {
    console.error("❌ 处理失败:", (error as Error).message);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
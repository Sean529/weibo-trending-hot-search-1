#!/usr/bin/env -S deno run --unstable --allow-net --allow-read --allow-write --allow-env --unstable-cron
import { format } from "std/datetime/mod.ts";

import type { Word } from "./types.ts";
import { appendWordsWithDedup, mergeWords } from "./utils.ts";
import { loadFromStorage, saveToStorage } from "./storage.ts";
import { filterWordsByAI, isAIConfigValid } from "./ai-filter.ts";
import { getProcessedTitles, addToCategory, markAsProcessed } from "./ai-storage.ts";

const regexp = /<a href="(\/weibo\?q=[^"]+)".*?>(.+)<\/a>/g;

export async function scrapeTrendingTopics() {
  console.log(`开始抓取微博热搜 - ${new Date().toISOString()}`);

  const response = await fetch("https://s.weibo.com/top/summary", {
    headers: {
      "Cookie": Deno.env.get("WEIBO_COOKIE") ||
        "SUB=_2AkMWJrkXf8NxqwJRmP8SxWjnaY12zwnEieKgekjMJRMxHRl-yj9jqmtbtRB6PaaX-IGp-AjmO6k5cS-OH2X9CayaTzVD",
    },
  });

  if (!response.ok) {
    console.error("请求失败:", response.statusText);
    return;
  }

  const result: string = await response.text();
  const matches = result.matchAll(regexp);
  const words: Word[] = Array.from(matches).map((x) => ({
    url: x[1],
    title: x[2],
  }));

  if (words.length === 0) {
    console.log("没有获取到热搜数据");
    return;
  }

  const yyyyMMdd = format(new Date(), "yyyy-MM-dd");

  // 从存储中加载已有数据
  const wordsAlreadyDownload = await loadFromStorage(yyyyMMdd);

  // 检查环境变量决定使用追加模式还是合并模式
  // 在 Deno Deploy 中默认使用追加模式
  const useAppendMode = Deno.env.get("WEIBO_APPEND_MODE") === "true" ||
    Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;

  // 合并数据
  const finalWords = useAppendMode
    ? appendWordsWithDedup(wordsAlreadyDownload, words) // 追加模式：保留所有条目但去重
    : mergeWords(words, wordsAlreadyDownload); // 合并模式：去重相同标题

  // 保存到存储
  await saveToStorage(yyyyMMdd, finalWords);

  console.log(`成功更新 ${finalWords.length} 条热搜数据 (${useAppendMode ? "追加模式" : "合并模式"})`);

  // 自动执行AI筛选 - 只处理未筛选过的新内容
  await autoAIFiltering(yyyyMMdd, finalWords);
}

// 自动AI筛选函数 - 智能去重，避免重复处理
async function autoAIFiltering(date: string, allWords: Word[]) {
  console.log("🔍 检查AI筛选配置...");
  
  // 检查AI配置
  if (!isAIConfigValid()) {
    console.log("⚠️  AI配置未设置，跳过自动筛选 (需要 DOUBAO_API_KEY)");
    return;
  }

  try {
    console.log("🤖 开始自动AI筛选...");
    
    // 获取所有已处理过的标题（包括已判断为非目标类别的）
    const processedTitles = await getProcessedTitles(date);
    console.log(`📊 已处理: ${processedTitles.size} 条`);
    
    // 筛选出从未被AI处理过的新内容
    const unprocessedWords = allWords.filter(word => !processedTitles.has(word.title));
    
    if (unprocessedWords.length === 0) {
      console.log("✅ 所有内容都已处理过，跳过AI筛选");
      return;
    }

    console.log(`📝 发现 ${unprocessedWords.length} 条新内容，开始AI筛选...`);

    // 只筛选社会新闻（最常用的类别）
    // 其他类别可以根据需要手动筛选或者在这里添加
    const socialNews = await filterWordsByAI(unprocessedWords, '社会新闻');
    
    if (socialNews.length > 0) {
      await addToCategory(date, '社会新闻', socialNews);
      console.log(`✅ AI筛选完成: 发现 ${socialNews.length} 条社会新闻`);
      
      // 打印筛选结果
      socialNews.forEach((word, index) => {
        console.log(`   ${index + 1}. ${word.title}`);
      });
    } else {
      console.log("📰 本次未发现新的社会新闻");
    }

    // 记录所有处理过的内容（包括非目标类别）到AI存储
    // 这样下次就不会重复处理这些内容了
    const nonSocialNews = unprocessedWords.filter(word => 
      !socialNews.some(social => social.title === word.title)
    );
    
    if (nonSocialNews.length > 0) {
      // 将非社会新闻标记为已处理，避免下次重复筛选
      await markAsProcessed(date, nonSocialNews);
      console.log(`📋 标记 ${nonSocialNews.length} 条为非社会新闻，下次将跳过`);
    }

  } catch (error) {
    console.error("❌ 自动AI筛选失败:", (error as Error).message);
    // 不影响主流程，继续执行
  }
}

// 如果直接运行此文件，执行主函数
if (import.meta.main) {
  scrapeTrendingTopics();
} 
#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env
// 选择性测试 - 挑选可能的社会新闻进行测试

import { loadFromStorage, saveToStorage } from "./storage.ts";
import { filterWordsByAI } from "./ai-filter.ts";
import type { Word } from "./types.ts";
import { format } from "std/datetime/mod.ts";

async function selectiveTest() {
  const today = format(new Date(), "yyyy-MM-dd");
  console.log("🎯 选择性AI测试");

  try {
    const allWords = await loadFromStorage(today);
    
    // 选择一些可能是社会新闻的标题
    const socialKeywords = ['法院', '警方', '案件', '社区', '医院', '事故', '救援', '教育', '政策', '公安', '死亡', '受伤', '火灾', '地震', '救助'];
    const potentialSocialNews = allWords.filter(word => 
      socialKeywords.some(keyword => word.title.includes(keyword)) ||
      word.title.includes('男子') || word.title.includes('女子') ||
      word.title.includes('老人') || word.title.includes('儿童') ||
      word.title.includes('学生') || word.title.includes('家长')
    ).slice(0, 5);

    console.log("选中的测试数据:");
    potentialSocialNews.forEach((word, i) => {
      console.log(`  ${i+1}. ${word.title}`);
    });

    if (potentialSocialNews.length === 0) {
      console.log("没有找到潜在的社会新闻，使用前5条:");
      const testWords = allWords.slice(0, 5);
      testWords.forEach((word, i) => {
        console.log(`  ${i+1}. ${word.title}`);
      });
    }

    const testWords = potentialSocialNews.length > 0 ? potentialSocialNews : allWords.slice(0, 5);

    console.log("\n🤖 AI分析中...");
    const filtered = await filterWordsByAI(testWords, '社会新闻');

    console.log(`\n✅ 结果: ${filtered.length} 条社会新闻`);
    if (filtered.length > 0) {
      filtered.forEach((word, i) => {
        console.log(`  ${i+1}. ${word.title}`);
      });

      // 手动保存几个测试结果
      const simpleUpdate = allWords.map(word => {
        const found = filtered.find(f => f.title === word.title);
        if (found) {
          return { ...word, aiCategory: '社会新闻', processedAt: new Date().toISOString() };
        }
        return word;
      });

      await saveToStorage(simpleUpdate, today);
      console.log("💾 已保存到存储");
    } else {
      console.log("本次测试未发现社会新闻");
    }

  } catch (error) {
    console.error("❌ 错误:", (error as Error).message);
  }
}

selectiveTest();
#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env
// 快速AI测试 - 处理前3条数据

import { loadFromStorage, saveToStorage } from "./storage.ts";
import { filterWordsByAI } from "./ai-filter.ts";
import type { Word } from "./types.ts";
import { format } from "std/datetime/mod.ts";

async function quickTest() {
  const today = format(new Date(), "yyyy-MM-dd");
  console.log("🔬 快速AI测试");

  try {
    const allWords = await loadFromStorage(today);
    const testWords = allWords.slice(0, 3);
    
    console.log("测试数据:");
    testWords.forEach((word, i) => {
      console.log(`  ${i+1}. ${word.title}`);
    });

    console.log("\n🤖 AI分析中...");
    const filtered = await filterWordsByAI(testWords, '社会新闻');

    console.log(`\n✅ 结果: ${filtered.length} 条社会新闻`);
    filtered.forEach((word, i) => {
      console.log(`  ${i+1}. ${word.title}`);
    });

    // 保存结果
    const updatedWords = allWords.map(word => {
      const found = filtered.find(f => f.title === word.title && f.url === word.url);
      return found || word;
    });

    await saveToStorage(updatedWords, today);
    console.log("💾 已保存到存储");

  } catch (error) {
    console.error("❌ 错误:", (error as Error).message);
  }
}

quickTest();
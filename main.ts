#!/usr/bin/env -S deno run --unstable --allow-net --allow-read --allow-write --import-map=import_map.json
// Copyright 2020 justjavac(迷渡). All rights reserved. MIT license.
import { format } from "std/datetime/mod.ts";

import type { Word } from "./types.ts";
import { appendWords, mergeWords } from "./utils.ts";
import { loadFromStorage, saveToStorage } from "./storage.ts";

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
  const useAppendMode = Deno.env.get("WEIBO_APPEND_MODE") === "true";
  
  // 合并数据
  const finalWords = useAppendMode 
    ? appendWords(wordsAlreadyDownload, words)  // 追加模式：保留所有条目
    : mergeWords(words, wordsAlreadyDownload);   // 合并模式：去重相同标题

  // 保存到存储
  await saveToStorage(yyyyMMdd, finalWords);

  console.log(`成功更新 ${finalWords.length} 条热搜数据 (${useAppendMode ? '追加模式' : '合并模式'})`);
}

// Deno Deploy 定时任务
Deno.cron("Weibo Trending Scraper", "0 * * * *", scrapeTrendingTopics);

// 如果直接运行则立即执行一次
if (import.meta.main) {
  await scrapeTrendingTopics();
}

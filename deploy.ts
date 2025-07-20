// Deno Deploy 入口文件
import { scrapeTrendingTopics } from "./main.ts";
import { loadFromStorage } from "./storage.ts";
import { format } from "std/datetime/mod.ts";
import type { Word } from "./types.ts";

// HTML转义函数
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 生成热搜列表HTML
function generateTrendingItems(todayWords: Word[]): string {
  if (todayWords.length === 0) {
    return `
      <div class="empty-state">
        <div class="icon">📭</div>
        <p>暂无数据，请稍后再试</p>
      </div>
    `;
  }

  return todayWords.map((word, index) => `
    <div class="trending-item">
      <div class="rank ${index < 3 ? "top3" : index < 10 ? "top10" : ""}">${
    index + 1
  }</div>
      <div class="title" onclick="openWeibo('${word.url}')" title="点击打开微博">${
    escapeHtml(word.title)
  }</div>
      <button class="copy-btn" onclick="copyTitle('${
    escapeHtml(word.title).replace(/'/g, "\\'")
  }', this)">复制</button>
    </div>
  `).join("");
}

// 渲染HTML页面
async function renderHtmlPage(
  todayWords: Word[],
  today: string,
): Promise<string> {
  try {
    // 读取HTML模板
    const template = await Deno.readTextFile("./template.html");

    // 准备替换变量
    const updateTime = new Date().toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
    });
    const trendingItems = generateTrendingItems(todayWords);

    // 替换模板变量
    return template
      .replace(/{{TODAY}}/g, today)
      .replace(/{{UPDATE_TIME}}/g, updateTime)
      .replace(/{{DATA_COUNT}}/g, todayWords.length.toString())
      .replace(/{{TRENDING_ITEMS}}/g, trendingItems);
  } catch (error) {
    console.error("Failed to read template:", (error as Error).message);
    // 如果模板读取失败，返回简单的错误页面
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>微博热搜榜 - 错误</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: #ff6b6b; font-size: 18px; }
    </style>
</head>
<body>
    <h1>🔥 微博热搜榜</h1>
    <div class="error">
        <p>页面模板加载失败</p>
        <p>错误详情: ${(error as Error).message}</p>
    </div>
</body>
</html>`;
  }
}

// 创建简单的 HTTP 服务器
async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/") {
    try {
      // 获取今天的数据
      const today = format(new Date(), "yyyy-MM-dd");
      let todayWords: Word[] = [];

      try {
        todayWords = await loadFromStorage(today);
      } catch (error) {
        console.error("Failed to load from storage:", (error as Error).message);
        // 如果加载失败，返回带错误信息的HTML页面
        const errorHtml = await renderHtmlPage([], today);
        return new Response(errorHtml, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-cache",
          },
        });
      }

      // 渲染HTML页面 - 显示所有数据
      const htmlContent = await renderHtmlPage(todayWords, today);

      return new Response(htmlContent, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300", // 缓存5分钟
        },
      });
    } catch (error) {
      return new Response(`服务暂时不可用: ${(error as Error).message}`, {
        status: 500,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
  }

  // API接口：获取今日热搜数据
  if (url.pathname === "/api/trending") {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      let todayWords: Word[] = [];

      try {
        todayWords = await loadFromStorage(today);
      } catch (error) {
        console.error("Failed to load from storage:", (error as Error).message);
        return new Response(
          JSON.stringify({
            success: false,
            error: `数据加载失败: ${(error as Error).message}`,
            data: [],
          }),
          {
            headers: { "content-type": "application/json; charset=utf-8" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: todayWords,
          date: today,
          count: todayWords.length,
          updateTime: new Date().toISOString(),
        }),
        {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=300", // 缓存5分钟
          },
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `服务暂时不可用: ${(error as Error).message}`,
          data: [],
        }),
        {
          status: 500,
          headers: { "content-type": "application/json; charset=utf-8" },
        },
      );
    }
  }

  if (url.pathname === "/health") {
    return new Response(
      JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        environment: "deno-deploy",
      }),
      {
        headers: { "content-type": "application/json" },
      },
    );
  }

  if (url.pathname === "/trigger" && request.method === "POST") {
    try {
      await scrapeTrendingTopics();
      return new Response(
        JSON.stringify({
          success: true,
          message: "Scraping completed successfully",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { "content-type": "application/json" },
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        },
      );
    }
  }

  return new Response("Not Found", { status: 404 });
}

// 启动 HTTP 服务器
Deno.serve(handler);

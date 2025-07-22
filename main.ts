#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env --unstable-cron
// 统一入口文件 - Deno Deploy
import { scrapeTrendingTopics } from "./scraper.ts";
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
      <div class="rank ${index < 3 ? "top3" : index < 10 ? "top10" : ""}">${index + 1}</div>
      <div class="title" onclick="openWeibo('${word.url}')" title="点击打开微博">${escapeHtml(word.title)}</div>
      <button class="copy-btn" onclick="copyTitle('${escapeHtml(word.title).replace(/'/g, "\\'")}', this)">复制</button>
    </div>
  `).join("");
}

// 渲染HTML页面
async function renderHtmlPage(
  todayWords: Word[],
  today: string,
): Promise<string> {
  try {
    // 从 GitHub 或本地读取模板
    let template: string;

    if (Deno.env.get("DENO_DEPLOYMENT_ID")) {
      // Deno Deploy 环境：从 GitHub 获取模板
      const repoOwner = Deno.env.get("GITHUB_REPO_OWNER") || "Sean529";
      const repoName = Deno.env.get("GITHUB_REPO_NAME") || "weibo-trending-hot-search-1";
      const templateContent = await fetch(
        `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/template.html`,
      );
      if (!templateContent.ok) {
        throw new Error(`Failed to fetch template: ${templateContent.status}`);
      }
      template = await templateContent.text();
    } else {
      // 本地环境：直接读取文件
      template = await Deno.readTextFile("./template.html");
    }

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
    console.error("Failed to load template:", (error as Error).message);
    // 如果模板加载失败，返回简单的HTML页面
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>微博热搜榜 - ${today}</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .items { max-width: 600px; margin: 0 auto; text-align: left; }
        .item { padding: 10px; border-bottom: 1px solid #eee; }
    </style>
</head>
<body>
    <h1>🔥 微博热搜榜 - ${today}</h1>
    <div class="items">
        ${generateTrendingItems(todayWords)}
    </div>
</body>
</html>`;
  }
}

// 定时任务注册
try {
  Deno.cron("Weibo Trending Scraper", "0 * * * *", scrapeTrendingTopics);
} catch (error) {
  // If cron already exists, that's fine - just log and continue
  if (error instanceof TypeError && error.message.includes("already exists")) {
    console.log("⚠️ Cron job already exists, skipping creation");
  } else {
    throw error;
  }
}

// HTTP 请求处理函数
async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // GET / - 渲染微博热搜页面
  if (url.pathname === "/") {
    try {
      // 获取今天的数据
      const today = format(new Date(), "yyyy-MM-dd");
      let todayWords: Word[] = [];

      try {
        todayWords = await loadFromStorage(today);
      } catch (error) {
        console.error("Failed to load from storage:", (error as Error).message);
        // 如果加载失败，尝试使用最新的本地数据或提供示例数据
        const fallbackData: Word[] = [
          { title: "微博热搜数据加载中...", url: "/top/summary" },
          { title: "请稍后刷新页面", url: "/top/summary" },
          { title: "或检查服务配置", url: "/top/summary" },
        ];
        const errorHtml = await renderHtmlPage(fallbackData, today);
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

  // GET /api/trending - 返回今日热搜 JSON 数据
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

  // GET /health - 健康检查
  if (url.pathname === "/health") {
    return new Response(
      JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        environment: "deno-deploy",
        cron: "enabled",
      }),
      {
        headers: { "content-type": "application/json" },
      },
    );
  }

  // POST /trigger - 手动触发数据抓取
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
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        },
      );
    }
  }

  // 404 处理为默认情况
  return new Response("Not Found", { status: 404 });
}

// 启动 HTTP 服务器
Deno.serve({ port: 3080 }, handler);

// 控制台启动信息日志
console.log("🚀 Weibo Trending Scraper started on Deno Deploy");
console.log("⏰ Cron job scheduled: every hour at minute 0");
console.log("🔗 Health check: /health");
console.log("🔧 Manual trigger: POST /trigger");
console.log("🏠 Homepage: / (微博热搜榜)");

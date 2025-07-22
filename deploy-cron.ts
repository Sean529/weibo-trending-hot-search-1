#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env --unstable-cron
// Deno Deploy 专用入口文件
import { scrapeTrendingTopics } from "./main.ts";

// Deno Deploy 定时任务
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

// HTTP 服务器 (用于健康检查)
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

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

  if (url.pathname === "/trigger" && req.method === "POST") {
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

  return new Response("Weibo Trending Scraper - Deno Deploy", {
    headers: { "content-type": "text/plain" },
  });
});

console.log("🚀 Weibo Trending Scraper started on Deno Deploy");
console.log("⏰ Cron job scheduled: every hour at minute 0");
console.log("🔗 Health check: /health");
console.log("🔧 Manual trigger: POST /trigger");

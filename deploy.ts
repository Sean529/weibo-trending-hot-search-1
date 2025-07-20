// Deno Deploy 入口文件
import { scrapeTrendingTopics } from "./main.ts";

// 创建简单的 HTTP 服务器用于健康检查
async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/") {
    try {
      // 从 GitHub 获取最新的 README.md 内容
      const readmeUrl = "https://raw.githubusercontent.com/Sean529/weibo-trending-hot-search-1/main/README.md";
      const response = await fetch(readmeUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch README: ${response.statusText}`);
      }
      
      const readmeContent = await response.text();
      return new Response(readmeContent, {
        headers: { 
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "public, max-age=300" // 缓存5分钟
        },
      });
    } catch (error) {
      return new Response(`Error loading README.md: ${error.message}`, {
        status: 500,
        headers: { "content-type": "text/plain" },
      });
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

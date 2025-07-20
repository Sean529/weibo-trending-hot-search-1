// Deno Deploy 入口文件
import { scrapeTrendingTopics } from "./main.ts";
import { loadFromStorage } from "./storage.ts";
import { format } from "std/datetime/mod.ts";

// 创建简单的 HTTP 服务器用于健康检查
async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/") {
    try {
      // 获取今天的数据
      const today = format(new Date(), "yyyy-MM-dd");
      const todayWords = await loadFromStorage(today);

      // 创建简单的文本响应
      let content = `# 微博热搜榜\n\n`;
      content += `数据更新时间: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}\n\n`;
      content += `## 今日热门搜索 (${today})\n\n`;

      if (todayWords.length > 0) {
        todayWords.slice(0, 50).forEach((word, index) => {
          content += `${index + 1}. [${word.title}](https://s.weibo.com${word.url})\n`;
        });
      } else {
        content += "暂无数据，请稍后再试\n";
      }

      content += `\n---\n访问 /trigger (POST) 手动更新数据\n`;
      content += `访问 /health 查看服务状态\n`;

      return new Response(content, {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "public, max-age=300", // 缓存5分钟
        },
      });
    } catch (error) {
      return new Response(`服务暂时不可用: ${error.message}`, {
        status: 500,
        headers: { "content-type": "text/plain; charset=utf-8" },
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

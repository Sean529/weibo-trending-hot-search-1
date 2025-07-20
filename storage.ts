import type { Word } from "./types.ts";
import { createArchive, createReadme } from "./utils.ts";

// GitHub API 配置
const GITHUB_API_BASE = "https://api.github.com";
const REPO_OWNER = Deno.env.get("GITHUB_REPO_OWNER") || "justjavac";
const REPO_NAME = Deno.env.get("GITHUB_REPO_NAME") || "weibo-trending-hot-search";
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");

// 检查是否运行在 Deno Deploy 环境
const isDenoDeployment = !!Deno.env.get("DENO_DEPLOYMENT_ID");

async function githubApiRequest(endpoint: string, options: RequestInit = {}) {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN environment variable is required for GitHub API access");
  }

  const url = `${GITHUB_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "Weibo-Trending-Bot",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }

  return response.json();
}

async function getFileFromGitHub(path: string): Promise<string | null> {
  try {
    const data = await githubApiRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`);
    if (data.content) {
      // 使用 TextDecoder 处理中文字符
      const binaryString = atob(data.content.replace(/\n/g, ""));
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const decoder = new TextDecoder();
      return decoder.decode(bytes);
    }
    return null;
  } catch (_error) {
    if (_error.message.includes("404")) {
      return null; // 文件不存在
    }
    throw _error;
  }
}

async function saveFileToGitHub(path: string, content: string, message: string): Promise<void> {
  // 使用 TextEncoder 处理中文字符
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const encodedContent = btoa(String.fromCharCode(...data));

  // 获取当前文件的 SHA（如果存在）
  let sha: string | undefined;
  try {
    const existing = await githubApiRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`);
    sha = existing.sha;
  } catch (_error) {
    // 文件不存在，继续创建
  }

  await githubApiRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: encodedContent,
      sha,
    }),
  });
}

export async function loadFromStorage(date: string): Promise<Word[]> {
  if (isDenoDeployment) {
    // 在 Deno Deploy 环境中从 GitHub 加载
    const content = await getFileFromGitHub(`raw/${date}.json`);
    return content ? JSON.parse(content) : [];
  } else {
    // 本地环境从文件系统加载
    try {
      const content = await Deno.readTextFile(`raw/${date}.json`);
      return JSON.parse(content);
    } catch {
      return [];
    }
  }
}

export async function saveToStorage(date: string, words: Word[]): Promise<void> {
  const timestamp = new Date().toISOString();

  if (isDenoDeployment) {
    // 在 Deno Deploy 环境中保存到 GitHub
    const jsonContent = JSON.stringify(words, null, 2);
    const archiveContent = createArchive(words, date);
    const readmeContent = await generateUpdatedReadme(words);

    // 并行保存三个文件
    await Promise.all([
      saveFileToGitHub(`raw/${date}.json`, jsonContent, `Update trending data for ${date} - ${timestamp}`),
      saveFileToGitHub(`archives/${date}.md`, archiveContent, `Update archive for ${date} - ${timestamp}`),
      saveFileToGitHub("README.md", readmeContent, `Update README with latest trending topics - ${timestamp}`),
    ]);
  } else {
    // 本地环境保存到文件系统
    const jsonContent = JSON.stringify(words, null, 2);
    const archiveContent = createArchive(words, date);

    await Deno.writeTextFile(`raw/${date}.json`, jsonContent);
    await Deno.writeTextFile(`archives/${date}.md`, archiveContent);

    // 更新 README
    const readmeContent = await createReadme(words);
    await Deno.writeTextFile("README.md", readmeContent);
  }
}

async function generateUpdatedReadme(words: Word[]): Promise<string> {
  if (isDenoDeployment) {
    // 在 Deno Deploy 环境中从 GitHub 获取当前 README
    const currentReadme = await getFileFromGitHub("README.md");
    if (!currentReadme) {
      throw new Error("Could not fetch current README.md from GitHub");
    }

    // 使用相同的替换逻辑
    const listContent = `<!-- BEGIN -->
<!-- 最后更新时间 ${Date()} -->
${words.map((x) => `1. [${x.title}](https://s.weibo.com/${x.url})`).join("\n")}
<!-- END -->`;

    return currentReadme.replace(/<!-- BEGIN -->[\W\w]*<!-- END -->/, listContent);
  } else {
    // 本地环境直接使用 utils.ts 中的函数
    return await createReadme(words);
  }
}

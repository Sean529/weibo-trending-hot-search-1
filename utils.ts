import type { Word } from "./types.ts";

/**
 * 合并两次热门话题并根据**内容**去重，新的覆盖旧的
 *
 * via https://github.com/justjavac/weibo-trending-hot-search/issues/11#issuecomment-1428187183
 */
export function mergeWords(
  words: Word[],
  another: Word[],
): Word[] {
  const obj: Record<string, string> = {};
  for (const w of words.concat(another)) {
    obj[w.title] = w.url;
  }
  return Object.entries(obj).map(([title, url]) => ({
    url,
    title,
  }));
}

/**
 * 追加新的热搜数据到已有数据中，保留所有条目（不去重）
 */
export function appendWords(
  existingWords: Word[],
  newWords: Word[],
): Word[] {
  return [...existingWords, ...newWords];
}

/**
 * 追加新的热搜数据到已有数据中，去除重复条目
 * 保持时间顺序，如果存在相同标题和URL的条目则跳过
 */
export function appendWordsWithDedup(
  existingWords: Word[],
  newWords: Word[],
): Word[] {
  // 创建已存在条目的Set，用于快速查找
  const existingSet = new Set(
    existingWords.map((word) => `${word.title}||${word.url}`),
  );

  // 过滤掉重复的新条目
  const uniqueNewWords = newWords.filter((word) => {
    const key = `${word.title}||${word.url}`;
    return !existingSet.has(key);
  });

  return [...existingWords, ...uniqueNewWords];
}

export async function createReadme(words: Word[]): Promise<string> {
  const readme = await Deno.readTextFile("./README.md");
  return readme.replace(/<!-- BEGIN -->[\W\w]*<!-- END -->/, createList(words));
}

export function createList(words: Word[]): string {
  return `<!-- BEGIN -->
<!-- 最后更新时间 ${Date()} -->
${
    words.map((x) => `1. [${x.title}](https://s.weibo.com/${x.url})`)
      .join("\n")
  }
<!-- END -->`;
}

export function createArchive(words: Word[], date: string): string {
  return `# ${date}\n
共 ${words.length} 条\n
${createList(words)}
`;
}

import type { Word, FilterCategory } from "./types.ts";
import { 
  loadAIConfig, 
  isAIConfigValid, 
  getAPIConfig, 
  getCategoryDescriptions, 
  getFilteringConfig,
  getProcessingSettings 
} from "./ai-config.ts";

// 延迟函数
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 构建分类提示词
async function buildPrompt(title: string, category: FilterCategory): Promise<string> {
  const categoryDescriptions = await getCategoryDescriptions();
  const filteringConfig = await getFilteringConfig();

  if (filteringConfig.requireHotTopic) {
    return `请判断以下新闻标题是否同时满足以下两个条件：
1. 属于"${category}"类别（${category}包括：${categoryDescriptions[category]}）
2. 容易引发热议和广泛讨论（${filteringConfig.hotTopicCriteria}）

新闻标题："${title}"

请只回答"是"或"否"，不要其他解释。`;
  } else {
    return `请判断以下新闻标题是否属于"${category}"类别。${category}包括：${categoryDescriptions[category]}。

新闻标题："${title}"

请只回答"是"或"否"，不要其他解释。`;
  }
}

// 调用豆包AI API
async function callAI(title: string, category: FilterCategory): Promise<boolean> {
  const apiConfig = await getAPIConfig();
  const processingSettings = await getProcessingSettings();
  
  if (!apiConfig.key || apiConfig.key === "your-api-key-here") {
    console.warn("API密钥未配置，跳过AI筛选");
    return false;
  }

  const prompt = await buildPrompt(title, category);

  for (let attempt = 1; attempt <= processingSettings.maxRetries; attempt++) {
    try {
      const response = await fetch(apiConfig.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiConfig.key}`,
        },
        body: JSON.stringify({
          model: apiConfig.model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: processingSettings.temperature,
          max_tokens: processingSettings.maxTokens,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      const answer = result.choices?.[0]?.message?.content?.trim();

      if (answer === "是") {
        return true;
      } else if (answer === "否") {
        return false;
      } else {
        console.warn(`Unexpected AI response for "${title}": ${answer}`);
        return false;
      }
    } catch (error) {
      console.error(`AI filtering attempt ${attempt}/${processingSettings.maxRetries} failed for "${title}":`, error);
      
      if (attempt < processingSettings.maxRetries) {
        await delay(processingSettings.requestDelay * attempt); // 递增延迟
      }
    }
  }

  console.error(`AI filtering failed for "${title}" after ${processingSettings.maxRetries} attempts`);
  return false;
}

// 批量AI筛选
export async function filterWordsByAI(
  words: Word[],
  category: FilterCategory,
): Promise<Word[]> {
  const isValid = await isAIConfigValid();
  const processingSettings = await getProcessingSettings();
  
  if (!isValid) {
    console.warn("AI配置无效，跳过AI筛选");
    return words;
  }

  const filteredWords: Word[] = [];
  const totalWords = words.length;

  console.log(`开始AI筛选，目标类别：${category}，总计 ${totalWords} 条`);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    try {
      console.log(`[${i + 1}/${totalWords}] 正在分析: ${word.title}`);
      
      const isMatch = await callAI(word.title, category);
      
      if (isMatch) {
        const processedWord: Word = {
          ...word,
          aiCategory: category,
          processedAt: new Date().toISOString(),
        };
        filteredWords.push(processedWord);
        console.log(`✅ 匹配: ${word.title}`);
      } else {
        console.log(`❌ 不匹配: ${word.title}`);
      }

      // 添加请求间隔延迟
      if (i < words.length - 1) {
        await delay(processingSettings.requestDelay);
      }
    } catch (error) {
      console.error(`处理失败: ${word.title}`, error);
    }
  }

  console.log(`AI筛选完成，从 ${totalWords} 条中筛选出 ${filteredWords.length} 条 ${category}`);
  
  return filteredWords;
}

// 按类别筛选已有数据（用于前端显示）
export function filterWordsByCategory(
  words: Word[],
  category: FilterCategory | 'all',
): Word[] {
  if (category === 'all') {
    return words;
  }
  
  return words.filter(word => word.aiCategory === category);
}

// 检查AI配置是否有效
export { isAIConfigValid } from "./ai-config.ts";
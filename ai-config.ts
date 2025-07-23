import type { FilterCategory } from "./types.ts";

export interface AIConfig {
  api: {
    url: string;
    key: string;
    model: string;
  };
  settings: {
    temperature: number;
    maxTokens: number;
    batchSize: number;
    requestDelay: number;
    maxRetries: number;
  };
  categories: Record<FilterCategory, string>;
  filtering: {
    requireHotTopic: boolean;
    hotTopicCriteria: string;
  };
}

let cachedConfig: AIConfig | null = null;

/**
 * 加载AI配置
 * 优先级: 环境变量 > 配置文件 > 默认值
 */
export async function loadAIConfig(): Promise<AIConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  let config: AIConfig;
  
  try {
    // 尝试读取配置文件
    const configText = await Deno.readTextFile("./ai-config.json");
    config = JSON.parse(configText);
    console.log("✅ 已加载AI配置文件: ai-config.json");
  } catch (error) {
    console.warn("⚠️ 无法读取配置文件，使用默认配置:", (error as Error).message);
    
    // 默认配置
    config = {
      api: {
        url: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
        key: "your-api-key-here",
        model: "doubao-1-5-lite-32k-250115"
      },
      settings: {
        temperature: 0.1,
        maxTokens: 400,
        batchSize: 3,
        requestDelay: 500,
        maxRetries: 3
      },
      categories: {
        '社会新闻': '民生福祉、公共安全、教育文化、法律案件、社会事件、公共政策等社会类新闻',
        '娱乐新闻': '影视作品、明星动态、娱乐产业、综艺节目、音乐娱乐等娱乐类新闻',
        '科技新闻': '科技创新、数码产品、互联网发展、AI技术、科研成果等科技类新闻',
        '体育新闻': '体育赛事、运动员动态、体育产业、比赛结果、奥运会等体育类新闻',
        '财经新闻': '经济政策、金融市场、企业发展、股市行情、企业财报等财经类新闻',
      },
      filtering: {
        requireHotTopic: true,
        hotTopicCriteria: "具有争议性、社会影响力、话题性或关注度高的特征"
      }
    };
  }

  // 环境变量覆盖配置文件
  if (Deno.env.get("DOUBAO_API_URL")) {
    config.api.url = Deno.env.get("DOUBAO_API_URL")!;
    console.log("🔧 使用环境变量 DOUBAO_API_URL");
  }
  
  if (Deno.env.get("DOUBAO_API_KEY")) {
    config.api.key = Deno.env.get("DOUBAO_API_KEY")!;
    console.log("🔧 使用环境变量 DOUBAO_API_KEY");
  }
  
  if (Deno.env.get("DOUBAO_MODEL")) {
    config.api.model = Deno.env.get("DOUBAO_MODEL")!;
    console.log("🔧 使用环境变量 DOUBAO_MODEL");
  }

  // 缓存配置
  cachedConfig = config;
  
  return config;
}

/**
 * 检查AI配置是否有效
 */
export async function isAIConfigValid(): Promise<boolean> {
  const config = await loadAIConfig();
  return !!(config.api.key && config.api.key !== "your-api-key-here" && config.api.url);
}

/**
 * 获取API配置
 */
export async function getAPIConfig() {
  const config = await loadAIConfig();
  return config.api;
}

/**
 * 获取筛选设置
 */
export async function getFilteringConfig() {
  const config = await loadAIConfig();
  return config.filtering;
}

/**
 * 获取类别描述
 */
export async function getCategoryDescriptions() {
  const config = await loadAIConfig();
  return config.categories;
}

/**
 * 获取处理设置
 */
export async function getProcessingSettings() {
  const config = await loadAIConfig();
  return config.settings;
}

/**
 * 重新加载配置（清除缓存）
 */
export function reloadConfig() {
  cachedConfig = null;
  console.log("🔄 配置缓存已清除，下次访问将重新加载");
}
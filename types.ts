export type Word = {
  title: string;
  url: string;
  aiCategory?: string;
  processedAt?: string;
};

export type AIFilterConfig = {
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  batchSize: number;
  requestDelay: number;
  maxRetries: number;
};

export type FilterCategory = '社会新闻' | '娱乐新闻' | '科技新闻' | '体育新闻' | '财经新闻';

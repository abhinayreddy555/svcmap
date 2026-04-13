export type LLMTier = 'extraction' | 'generation';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  system: string;
  messages: Message[];
  tier?: LLMTier;
  maxTokens?: number;
  temperature?: number;
  /** Enable prefix/prompt caching where supported */
  enableCache?: boolean;
}

export interface CompletionResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  model: string;
}

export interface LLMProviderConfig {
  extractionModel?: string;
  generationModel?: string;
  temperature?: number;
}

export interface LLMProvider {
  readonly name: string;
  readonly models: { extraction: string; generation: string };
  readonly maxContextTokens: number;

  complete(request: CompletionRequest): Promise<CompletionResponse>;
  /** Rough token estimate — used for chunk budgeting */
  estimateTokens(text: string): number;
}

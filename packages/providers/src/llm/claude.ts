import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMProviderConfig, CompletionRequest, CompletionResponse } from './types.js';

const DEFAULT_EXTRACTION_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_GENERATION_MODEL = 'claude-opus-4-6';

export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude';
  readonly maxContextTokens = 180_000;
  readonly models: { extraction: string; generation: string };

  private client: Anthropic;

  constructor(apiKey: string, config: LLMProviderConfig = {}) {
    // maxRetries: SDK will automatically retry 429s and 5xx with exponential backoff
    this.client = new Anthropic({ apiKey, maxRetries: 4 });
    this.models = {
      extraction: config.extractionModel ?? DEFAULT_EXTRACTION_MODEL,
      generation: config.generationModel ?? DEFAULT_GENERATION_MODEL,
    };
  }

  estimateTokens(text: string): number {
    // ~4 chars per token is a conservative estimate for code content
    return Math.ceil(text.length / 4);
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const model = request.tier === 'generation' ? this.models.generation : this.models.extraction;
    const temperature = request.temperature ?? (request.tier === 'generation' ? 0.3 : 0.1);

    const systemContent = request.enableCache
      ? {
          type: 'text' as const,
          text: request.system,
          cache_control: { type: 'ephemeral' as const },
        }
      : { type: 'text' as const, text: request.system };

    const defaultMaxTokens = request.tier === 'extraction' ? 16_000 : 8_096;
    const response = await this.client.messages.create({
      model,
      max_tokens: request.maxTokens ?? defaultMaxTokens,
      temperature,
      system: [systemContent],
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const content = textBlock?.type === 'text' ? textBlock.text : '';

    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: (response.usage as any).cache_read_input_tokens ?? 0,
      cacheWriteTokens: (response.usage as any).cache_creation_input_tokens ?? 0,
      model,
    };
  }
}

import OpenAI from 'openai';
import type { LLMProvider, LLMProviderConfig, CompletionRequest, CompletionResponse } from './types.js';

const DEFAULT_EXTRACTION_MODEL = 'gpt-4o-mini';
const DEFAULT_GENERATION_MODEL = 'gpt-4o';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly maxContextTokens = 128_000;
  readonly models: { extraction: string; generation: string };

  private client: OpenAI;

  constructor(apiKey: string, config: LLMProviderConfig = {}, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL, maxRetries: 4 });
    this.models = {
      extraction: config.extractionModel ?? DEFAULT_EXTRACTION_MODEL,
      generation: config.generationModel ?? DEFAULT_GENERATION_MODEL,
    };
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const model = request.tier === 'generation' ? this.models.generation : this.models.extraction;
    const temperature = request.temperature ?? (request.tier === 'generation' ? 0.3 : 0.1);

    const response = await this.client.chat.completions.create({
      model,
      max_tokens: request.maxTokens ?? (request.tier === 'extraction' ? 16_000 : 8_096),
      temperature,
      messages: [
        { role: 'system', content: request.system },
        ...request.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const content = response.choices[0]?.message.content ?? '';
    const usage = response.usage;

    return {
      content,
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
      model,
    };
  }
}

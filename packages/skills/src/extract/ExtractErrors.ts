import { z } from 'zod';
import type { Skill, SkillContext, RawAssets } from '../types.js';
import { extractJSON } from '../types.js';
import { formatAssets, JSON_SYSTEM, jsonUserPrompt } from './prompts.js';

export const ErrorEntrySchema = z.object({
  code: z.string().describe('Error code or exception class name'),
  httpStatus: z.number().nullish().default(null),
  description: z.string(),
  whenItOccurs: z.string(),
  recoveryHint: z.string().nullish().default(null).describe('What calling services or users should do'),
  isRetryable: z.boolean().catch(false),
  category: z.enum(['validation', 'auth', 'not-found', 'conflict', 'upstream', 'internal', 'rate-limit', 'other']).catch('other'),
});

export const ErrorCatalogueSchema = z.object({
  errors: z.array(ErrorEntrySchema),
  globalErrorHandling: z.string().nullish().default(null).describe('How unhandled errors are caught and formatted'),
});
export type ErrorCatalogue = z.infer<typeof ErrorCatalogueSchema>;

const SCHEMA = JSON.stringify({
  errors: [
    { code: 'ERR_INVALID_PAYLOAD', httpStatus: 400, description: 'Request body failed schema validation', whenItOccurs: 'Any endpoint receives malformed JSON', recoveryHint: 'Fix the request body per the API schema', isRetryable: false, category: 'validation' },
    { code: 'ERR_STOCK_INSUFFICIENT', httpStatus: 409, description: 'Requested SKU quantity not available', whenItOccurs: 'POST /orders when inventory-service reports insufficient stock', recoveryHint: 'Reduce quantity or choose different SKU', isRetryable: false, category: 'conflict' },
    { code: 'ERR_UPSTREAM_TIMEOUT', httpStatus: 503, description: 'inventory-service did not respond within timeout', whenItOccurs: 'inventory-service call exceeds 3000ms', recoveryHint: 'Retry after a few seconds', isRetryable: true, category: 'upstream' },
  ],
  globalErrorHandling: 'Express error middleware in src/middleware/error.ts catches all unhandled errors and returns { error: { code, message } }',
}, null, 2);

export const ExtractErrorsSkill: Skill<RawAssets, ErrorCatalogue> = {
  name: 'ExtractErrors',
  description: 'Extract all error codes, exceptions, and error handling patterns from a service',
  tier: 'extraction',
  inputSchema: z.any() as any,
  outputSchema: ErrorCatalogueSchema as any,

  async execute(input: RawAssets, ctx: SkillContext): Promise<ErrorCatalogue> {
    const content = formatAssets(input, ['error', 'route', 'source']);
    const response = await ctx.llm.complete({
      system: JSON_SYSTEM,
      tier: 'extraction',
      enableCache: true,
      messages: [{
        role: 'user',
        content: jsonUserPrompt(SCHEMA, content,
          `Extract ALL error codes, custom exceptions, and error handling patterns from this service.
Look for: custom error classes, error code constants, throw statements, HTTP status code assignments.
For each error: describe when it occurs, what HTTP status code it maps to, whether it is retryable, and what callers should do.
Also describe the global error handling middleware/handler if present.`),
      }],
    });

    return ErrorCatalogueSchema.parse(JSON.parse(extractJSON(response.content)));
  },
};

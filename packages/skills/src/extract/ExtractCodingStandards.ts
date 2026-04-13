import { z } from 'zod';
import type { Skill, SkillContext, RawAssets } from '../types.js';
import { extractJSON } from '../types.js';
import { formatAssets, JSON_SYSTEM, jsonUserPrompt } from './prompts.js';

export const CodingStandardsSchema = z.object({
  architecturePattern: z.string().nullable().describe('MVC, Clean Architecture, Hexagonal, etc.'),
  layerStructure: z.array(z.object({
    layer: z.string(),
    directory: z.string(),
    responsibility: z.string(),
    canCall: z.array(z.string()),
  })),
  namingConventions: z.object({
    files: z.string().nullish().default(null),
    classes: z.string().nullish().default(null),
    functions: z.string().nullish().default(null),
    constants: z.string().nullish().default(null),
    databaseColumns: z.string().nullish().default(null),
  }),
  errorHandlingApproach: z.string().nullish().default(null),
  loggingApproach: z.string().nullish().default(null),
  authPattern: z.string().nullish().default(null),
  testingApproach: z.string().nullish().default(null),
  notablePatterns: z.array(z.object({
    name: z.string(),
    description: z.string(),
    example: z.string().nullable().describe('Brief code example or file path'),
  })),
  antiPatterns: z.array(z.string()).describe('Patterns seen in the code that should be avoided'),
  keyInternalLibraries: z.array(z.object({
    name: z.string(),
    purpose: z.string(),
    path: z.string().nullable(),
  })),
});
export type CodingStandards = z.infer<typeof CodingStandardsSchema>;

const SCHEMA = JSON.stringify({
  architecturePattern: 'Layered Architecture (Routes → Services → Repositories)',
  layerStructure: [
    { layer: 'Routes', directory: 'src/routes/', responsibility: 'HTTP request parsing and response shaping only', canCall: ['Services'] },
    { layer: 'Services', directory: 'src/services/', responsibility: 'Business logic', canCall: ['Repositories', 'Clients'] },
    { layer: 'Repositories', directory: 'src/repositories/', responsibility: 'DB access only', canCall: [] },
  ],
  namingConventions: { files: 'camelCase.ts', classes: 'PascalCase', functions: 'camelCase', constants: 'UPPER_SNAKE_CASE', databaseColumns: 'snake_case' },
  errorHandlingApproach: 'Custom error classes extending AppError; all errors propagate to Express error middleware',
  loggingApproach: 'Structured JSON via winston; always include traceId from request context',
  authPattern: 'JWT validated by auth middleware; userId extracted into req.user',
  testingApproach: 'Unit tests for services (mocked repos); integration tests with real DB using testcontainers',
  notablePatterns: [{ name: 'Repository Pattern', description: 'All DB access via typed repository classes', example: 'src/repositories/OrderRepository.ts' }],
  antiPatterns: ['Directly importing DB client in route handlers', 'Catching and swallowing errors without logging'],
  keyInternalLibraries: [{ name: 'EventBus', purpose: 'Kafka publish/subscribe abstraction', path: 'src/lib/EventBus.ts' }],
}, null, 2);

export const ExtractCodingStandardsSkill: Skill<RawAssets, CodingStandards> = {
  name: 'ExtractCodingStandards',
  description: 'Extract architecture patterns, naming conventions, and coding practices from a service codebase',
  tier: 'extraction',
  inputSchema: z.any() as any,
  outputSchema: CodingStandardsSchema as any,

  async execute(input: RawAssets, ctx: SkillContext): Promise<CodingStandards> {
    const content = formatAssets(input, ['source', 'route', 'schema', 'config', 'test']);
    const response = await ctx.llm.complete({
      system: JSON_SYSTEM,
      tier: 'extraction',
      enableCache: true,
      messages: [{
        role: 'user',
        content: jsonUserPrompt(SCHEMA, content,
          `Analyse the code structure and extract the coding standards and patterns used in this service.
Identify: the architectural pattern (MVC, clean arch, hexagonal), directory/layer structure and their rules,
naming conventions for files/classes/functions, error handling approach, logging patterns, auth pattern,
testing strategy, and key internal utility libraries.
Also note any anti-patterns visible in the code.`),
      }],
    });

    return CodingStandardsSchema.parse(JSON.parse(extractJSON(response.content)));
  },
};

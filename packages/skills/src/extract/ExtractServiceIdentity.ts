import { z } from 'zod';
import type { Skill, SkillContext, RawAssets } from '../types.js';
import { extractJSON } from '../types.js';
import { formatAssets, JSON_SYSTEM, jsonUserPrompt } from './prompts.js';

export const ServiceIdentitySchema = z.object({
  name: z.string(),
  type: z.enum(['api', 'ui', 'batch', 'worker', 'library']).catch('api'),
  primaryLanguage: z.string().catch('unknown'),
  framework: z.string().nullish().default(null),
  runtime: z.string().nullish().default(null),
  purpose: z.string().catch(''),
  entryPoints: z.array(z.object({ file: z.string(), description: z.string() })).catch([]),
  keyAbstractions: z.array(z.string()).catch([]).describe('3-7 most important classes, modules, or patterns'),
  notResponsibleFor: z.array(z.string()).catch([]).describe('What this service explicitly does NOT handle'),
  testingApproach: z.string().nullish().default(null),
});
export type ServiceIdentity = z.infer<typeof ServiceIdentitySchema>;

const SCHEMA = JSON.stringify({
  name: 'service-name',
  type: 'api | ui | batch | worker | library',
  primaryLanguage: 'TypeScript',
  framework: 'Express | FastAPI | null',
  runtime: 'Node.js 20 | Python 3.12 | null',
  purpose: 'Short description of what this service does and why it exists',
  entryPoints: [{ file: 'src/server.ts', description: 'Express HTTP server bootstrap' }],
  keyAbstractions: ['OrderRepository', 'PaymentClient', 'EventBus'],
  notResponsibleFor: ['payment processing (delegates to payment-service)', 'sending emails'],
  testingApproach: 'Unit tests with Jest; integration tests against real DB',
}, null, 2);

export const ExtractServiceIdentitySkill: Skill<RawAssets, ServiceIdentity> = {
  name: 'ExtractServiceIdentity',
  description: 'Extract service purpose, type, language, framework, entry points and key abstractions',
  tier: 'extraction',
  inputSchema: z.any() as any,
  outputSchema: ServiceIdentitySchema as any,

  async execute(input: RawAssets, ctx: SkillContext): Promise<ServiceIdentity> {
    const content = formatAssets(input, ['entry-point', 'dependency-manifest', 'doc', 'config', 'source']);
    const response = await ctx.llm.complete({
      system: JSON_SYSTEM,
      tier: 'extraction',
      enableCache: true,
      messages: [{
        role: 'user',
        content: jsonUserPrompt(SCHEMA, content,
          `Analyse this repository and extract the service identity information.
Determine what type of service this is (api/ui/batch/worker/library), its primary language and framework,
its core purpose, key entry points, and the most important abstractions in the codebase.`),
      }],
    });

    const parsed = ServiceIdentitySchema.parse(JSON.parse(extractJSON(response.content)));
    return parsed;
  },
};

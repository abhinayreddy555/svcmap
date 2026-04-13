import { z } from 'zod';
import type { Skill, SkillContext, RawAssets } from '../types.js';
import { extractJSON } from '../types.js';
import { formatAssets, JSON_SYSTEM, jsonUserPrompt } from './prompts.js';

export const ConfigEntrySchema = z.object({
  key: z.string(),
  description: z.string(),
  exampleValue: z.string().nullable(),
  required: z.boolean(),
  defaultValue: z.string().nullable(),
  category: z.enum(['database', 'auth', 'service-url', 'feature-flag', 'observability', 'infra', 'other']).catch('other'),
  sensitivityNote: z.string().nullish().default(null).describe('e.g. "contains credentials — never log"'),
});

export const ServiceConfigSchema = z.object({
  configEntries: z.array(ConfigEntrySchema),
  featureFlags: z.array(z.object({
    key: z.string(),
    description: z.string(),
    type: z.enum(['boolean', 'string', 'number']).catch('string'),
    defaultValue: z.string().nullish().default(null),
  })),
  deploymentNotes: z.string().nullish().default(null).describe('Key deployment considerations (health check port, required secrets, etc.)'),
});
export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

const SCHEMA = JSON.stringify({
  configEntries: [
    { key: 'DATABASE_URL', description: 'PostgreSQL connection string', exampleValue: 'postgresql://user:pass@host:5432/orders', required: true, defaultValue: null, category: 'database', sensitivityNote: 'contains credentials — never log' },
    { key: 'INVENTORY_SERVICE_URL', description: 'Base URL for inventory-service', exampleValue: 'http://inventory-service:3001', required: true, defaultValue: null, category: 'service-url', sensitivityNote: null },
    { key: 'ENABLE_PAYMENT', description: 'Feature flag to enable payment processing', exampleValue: 'true', required: false, defaultValue: 'true', category: 'feature-flag', sensitivityNote: null },
  ],
  featureFlags: [{ key: 'ENABLE_PAYMENT', description: 'Enables Stripe payment integration', type: 'boolean', defaultValue: 'true' }],
  deploymentNotes: 'Requires DATABASE_URL and STRIPE_SECRET_KEY secrets. Health check on GET /health.',
}, null, 2);

export const ExtractConfigSkill: Skill<RawAssets, ServiceConfig> = {
  name: 'ExtractConfig',
  description: 'Extract environment variables, feature flags, and deployment configuration from a service',
  tier: 'extraction',
  inputSchema: z.any() as any,
  outputSchema: ServiceConfigSchema as any,

  async execute(input: RawAssets, ctx: SkillContext): Promise<ServiceConfig> {
    const content = formatAssets(input, ['config', 'infra', 'ci', 'entry-point']);
    const response = await ctx.llm.complete({
      system: JSON_SYSTEM,
      tier: 'extraction',
      enableCache: true,
      messages: [{
        role: 'user',
        content: jsonUserPrompt(SCHEMA, content,
          `Extract all configuration variables and feature flags from this service.
Look at: .env files, .env.example, application.yml, config.ts/js, settings.py, Dockerfile ENV declarations, k8s ConfigMaps.
For each env var: describe what it controls, whether it is required, its default value, and whether it contains sensitive data.
Identify feature flags separately (boolean env vars that toggle behaviour).`),
      }],
    });

    return ServiceConfigSchema.parse(JSON.parse(extractJSON(response.content)));
  },
};

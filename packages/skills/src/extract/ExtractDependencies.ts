import { z } from 'zod';
import type { Skill, SkillContext, RawAssets } from '../types.js';
import { extractJSON, extractWithChunks } from '../types.js';
import { formatAllAssets, JSON_SYSTEM, jsonUserPrompt } from './prompts.js';

export const DependencySchema = z.object({
  target: z.string().describe('Service or system name'),
  type: z.enum(['rest', 'grpc', 'graphql', 'kafka', 'rabbitmq', 'sqs', 'database', 'cache', 'external-api', 'other']).catch('other'),
  direction: z.enum(['outbound', 'inbound']).catch('outbound'),
  endpoint: z.string().nullish().default(null).describe('Specific endpoint, topic, or queue name'),
  purpose: z.string().catch('unknown'),
  timeoutMs: z.number().nullish().default(null),
  retries: z.number().nullish().default(null),
  isExternal: z.boolean().catch(false).describe('true if this is a 3rd-party service (Stripe, SendGrid, etc.)'),
});

export const DependenciesSchema = z.object({
  outbound: z.array(DependencySchema),
  databases: z.array(z.object({
    name: z.string(),
    type: z.enum(['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'sqlite', 'other']).catch('other'),
    purpose: z.string().catch('unknown'),
    isShared: z.boolean().catch(false).describe('true if multiple services access the same DB'),
  })),
  thirdParty: z.array(z.object({
    name: z.string(),
    category: z.string().catch('other').describe('payment, email, auth, observability, storage, etc.'),
    sdkOrPackage: z.string().nullish().default(null),
    purpose: z.string().catch('unknown'),
  })),
});
export type Dependencies = z.infer<typeof DependenciesSchema>;

const SCHEMA = JSON.stringify({
  outbound: [{
    target: 'inventory-service', type: 'rest', direction: 'outbound',
    endpoint: 'GET /inventory/{sku}', purpose: 'Check stock availability before creating order',
    timeoutMs: 3000, retries: 2, isExternal: false,
  }],
  databases: [{
    name: 'orders-db', type: 'postgresql',
    purpose: 'Primary datastore for orders and order items', isShared: false,
  }],
  thirdParty: [{
    name: 'Stripe', category: 'payment',
    sdkOrPackage: 'stripe', purpose: 'Process payments and handle webhook events',
  }],
}, null, 2);

export const ExtractDependenciesSkill: Skill<RawAssets, Dependencies> = {
  name: 'ExtractDependencies',
  description: 'Extract all outbound service calls, database connections, and third-party integrations',
  tier: 'extraction',
  inputSchema: z.any() as any,
  outputSchema: DependenciesSchema as any,

  async execute(input: RawAssets, ctx: SkillContext): Promise<Dependencies> {
    const content = formatAllAssets(input, ['source', 'config', 'dependency-manifest', 'route', 'event', 'schema']);

    const instruction = `Extract ALL dependencies this service has on other systems.
Look for: HTTP client calls (fetch, axios, requests, HttpClient), database connections, queue/topic consumers and producers,
SDK imports (stripe, sendgrid, auth0, etc.), gRPC client stubs, GraphQL client calls.
For each dependency, identify: what is being called, why, with what timeout/retry config.`;

    const parse = (raw: string) => DependenciesSchema.parse(JSON.parse(extractJSON(raw)));

    return extractWithChunks(content, ctx, {
      tier: 'extraction',
      mapPrompt: (chunk) => ({
        system: JSON_SYSTEM,
        user: jsonUserPrompt(SCHEMA, chunk,
          `${instruction}\n\nNOTE: This is a PARTIAL view — extract only what is visible here.`),
      }),
      reducePrompt: (partials) => ({
        system: JSON_SYSTEM,
        user: `You received ${partials.length} partial dependency extractions from different portions of the same codebase.
Merge them into one complete result. Rules:
- outbound: combine all, deduplicate by target+endpoint (keep the most detailed entry).
- databases: combine all, deduplicate by name.
- thirdParty: combine all, deduplicate by name.
Output schema (output ONLY this JSON, nothing else):
${SCHEMA}

Partial results:
${partials.map((p, i) => `--- Part ${i + 1} ---\n${p}`).join('\n\n')}`,
      }),
      parse,
    });
  },
};

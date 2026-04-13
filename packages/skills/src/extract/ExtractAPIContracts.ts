import { z } from 'zod';
import type { Skill, SkillContext, RawAssets } from '../types.js';
import { extractJSON, extractWithChunks } from '../types.js';
import { formatAllAssets, JSON_SYSTEM, jsonUserPrompt } from './prompts.js';

export const EndpointSchema = z.object({
  method: z.string(),
  path: z.string(),
  purpose: z.string(),
  auth: z.string().nullish().default(null).describe('Auth mechanism: JWT, API key, none, etc.'),
  requestBody: z.string().nullish().default(null).describe('Brief description of request body shape'),
  responseBody: z.string().nullish().default(null).describe('Brief description of response shape'),
  // LLM sometimes returns status codes as strings ("200") — coerce to number
  statusCodes: z.array(z.object({
    code: z.union([z.number(), z.string()]).transform((v) => Number(v)),
    meaning: z.string(),
  })).catch([]),
  tags: z.array(z.string()).catch([]),
});

// gRPC services: LLM may return strings ("CartService") or objects ({ name, methods })
const GrpcServiceSchema = z.union([
  z.string(),
  z.object({ name: z.string(), methods: z.array(z.string()).catch([]) })
    .transform((o) => o.name),
]).catch('unknown');

export const APIContractsSchema = z.object({
  baseUrl: z.string().nullish().default(null),
  authMechanism: z.string().nullish().default(null).describe('Global auth mechanism for this service'),
  endpoints: z.array(EndpointSchema).catch([]),
  events: z.array(z.object({
    direction: z.enum(['publishes', 'subscribes']).catch('publishes'),
    topic: z.string(),
    eventName: z.string().nullish().default(null),
    description: z.string(),
  })).catch([]),
  graphqlTypes: z.array(z.string()).catch([]).describe('Top-level GraphQL types if applicable'),
  grpcServices: z.array(GrpcServiceSchema).catch([]).describe('gRPC service names if applicable'),
});
export type APIContracts = z.infer<typeof APIContractsSchema>;

const SCHEMA = JSON.stringify({
  baseUrl: '/api/v1 or null',
  authMechanism: 'JWT Bearer | API Key | null',
  endpoints: [{
    method: 'POST', path: '/orders', purpose: 'Create a new order',
    auth: 'JWT', requestBody: '{ userId, items[], shippingAddress }',
    responseBody: '{ orderId, status, createdAt }',
    statusCodes: [{ code: 201, meaning: 'Order created' }, { code: 400, meaning: 'Invalid payload' }],
    tags: ['orders'],
  }],
  events: [{ direction: 'publishes', topic: 'orders-topic', eventName: 'order.created', description: 'Fired after order is persisted' }],
  graphqlTypes: [],
  grpcServices: [],
}, null, 2);

export const ExtractAPIContractsSkill: Skill<RawAssets, APIContracts> = {
  name: 'ExtractAPIContracts',
  description: 'Extract all API endpoints, events, and messaging contracts from a service',
  tier: 'extraction',
  inputSchema: z.any() as any,
  outputSchema: APIContractsSchema as any,

  async execute(input: RawAssets, ctx: SkillContext): Promise<APIContracts> {
    const content = formatAllAssets(input, ['api-spec', 'route', 'event', 'entry-point']);

    const instruction = `Extract ALL API endpoints, messaging events, and communication contracts from this service.
Include REST endpoints, GraphQL types, gRPC service definitions, Kafka/queue topics published or consumed.
For each endpoint include method, path, auth requirement, request/response shape, and HTTP status codes.`;

    const parse = (raw: string) => APIContractsSchema.parse(JSON.parse(extractJSON(raw)));

    return extractWithChunks(content, ctx, {
      tier: 'extraction',
      mapPrompt: (chunk) => ({
        system: JSON_SYSTEM,
        user: jsonUserPrompt(SCHEMA, chunk,
          `${instruction}\n\nNOTE: This is a PARTIAL view — extract only what is visible here.`),
      }),
      reducePrompt: (partials) => ({
        system: JSON_SYSTEM,
        user: `You received ${partials.length} partial API contract extractions from different portions of the same codebase.
Merge them into one complete result. Rules:
- baseUrl and authMechanism: take the first non-null value found across parts.
- endpoints: combine all, deduplicate by method+path (keep the most detailed entry).
- events: combine all, deduplicate by direction+topic.
- graphqlTypes and grpcServices: union all values, deduplicate.
Output schema (output ONLY this JSON, nothing else):
${SCHEMA}

Partial results:
${partials.map((p, i) => `--- Part ${i + 1} ---\n${p}`).join('\n\n')}`,
      }),
      parse,
    });
  },
};

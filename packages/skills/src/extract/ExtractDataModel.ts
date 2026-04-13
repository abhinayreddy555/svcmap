import { z } from 'zod';
import type { Skill, SkillContext, RawAssets } from '../types.js';
import { extractJSON, extractWithChunks } from '../types.js';
import { formatAllAssets, JSON_SYSTEM, jsonUserPrompt } from './prompts.js';

export const FieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  nullable: z.boolean(),
  description: z.string().nullable(),
  isIndex: z.boolean(),
  isForeignKey: z.boolean(),
  referencesEntity: z.string().nullable(),
});

export const EntitySchema = z.object({
  name: z.string(),
  description: z.string(),
  fields: z.array(FieldSchema),
  primaryKey: z.string(),
  uniqueConstraints: z.array(z.string()),
  relationships: z.array(z.object({
    type: z.enum(['one-to-one', 'one-to-many', 'many-to-many', 'many-to-one']),
    targetEntity: z.string(),
    description: z.string(),
  })),
});

export const DtoFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
  description: z.string().nullable(),
  validationRules: z.string().nullable().describe('e.g. "min:1, maxLength:100, email format"'),
});

export const DtoObjectSchema = z.object({
  name: z.string(),
  kind: z.enum(['request', 'response', 'event-payload', 'domain-object', 'config-object', 'other']),
  description: z.string().nullable(),
  usedIn: z.array(z.string()).describe('Endpoint paths, event names, or module names that use this object'),
  fields: z.array(DtoFieldSchema),
});
export type DtoObject = z.infer<typeof DtoObjectSchema>;

export const DataModelSchema = z.object({
  entities: z.array(EntitySchema),
  enums: z.array(z.object({ name: z.string(), values: z.array(z.string()) })),
  dtoObjects: z.array(DtoObjectSchema),
});
export type DataModel = z.infer<typeof DataModelSchema>;

const SCHEMA = JSON.stringify({
  entities: [{
    name: 'Order',
    description: 'Represents a customer purchase order',
    primaryKey: 'id',
    fields: [
      { name: 'id', type: 'UUID', nullable: false, description: 'Primary key', isIndex: true, isForeignKey: false, referencesEntity: null },
      { name: 'userId', type: 'UUID', nullable: false, description: null, isIndex: true, isForeignKey: true, referencesEntity: null },
      { name: 'status', type: 'OrderStatus', nullable: false, description: 'State machine field', isIndex: true, isForeignKey: false, referencesEntity: null },
    ],
    uniqueConstraints: [],
    relationships: [{ type: 'one-to-many', targetEntity: 'OrderItem', description: 'An order has many line items' }],
  }],
  enums: [{ name: 'OrderStatus', values: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] }],
  dtoObjects: [{
    name: 'CreateOrderRequest',
    kind: 'request',
    description: 'Request body for POST /orders',
    usedIn: ['POST /orders'],
    fields: [
      { name: 'userId', type: 'UUID', required: true, description: null, validationRules: 'must be valid UUID' },
      { name: 'items', type: 'OrderItem[]', required: true, description: 'Line items for the order', validationRules: 'min 1 item' },
      { name: 'shippingAddress', type: 'Address', required: true, description: null, validationRules: null },
    ],
  }, {
    name: 'OrderResponse',
    kind: 'response',
    description: 'Response shape for GET /orders/:id and POST /orders',
    usedIn: ['GET /orders/:id', 'POST /orders'],
    fields: [
      { name: 'id', type: 'UUID', required: true, description: null, validationRules: null },
      { name: 'status', type: 'OrderStatus', required: true, description: null, validationRules: null },
      { name: 'createdAt', type: 'ISO8601 string', required: true, description: null, validationRules: null },
    ],
  }],
}, null, 2);

export const ExtractDataModelSkill: Skill<RawAssets, DataModel> = {
  name: 'ExtractDataModel',
  description: 'Extract entities, fields, relationships, and enums from schema definitions and ORM models',
  tier: 'extraction',
  inputSchema: z.any() as any,
  outputSchema: DataModelSchema,

  async execute(input: RawAssets, ctx: SkillContext): Promise<DataModel> {
    const content = formatAllAssets(input, ['schema', 'migration', 'source']);

    const instruction = `Extract the complete data model from this service. This has two parts:

PART 1 — Database entities:
Look at: Prisma schemas, TypeORM entities, SQLAlchemy models, Sequelize models, Hibernate entities, GORM structs, migration files, SQL CREATE TABLE statements.
For each entity: extract ALL fields with exact types and constraints, primary/foreign keys, indexes, and relationships.
Be thorough — do not summarise or omit fields.

PART 2 — DTOs and transfer objects:
Extract ALL data transfer objects and domain objects that are NOT database-backed:
- TypeScript interfaces or types used as API request or response bodies (look in route/handler files and dedicated types/dto directories)
- Go structs used in handler functions for request body parsing or response marshaling
- Python Pydantic models or dataclasses used for API contracts
- Domain objects or value objects that represent business concepts without a DB table
For each DTO: classify its kind (request/response/event-payload/domain-object/config-object), note which endpoints or events use it, extract all fields with types and required/optional status, and include any validation rules (decorators, struct tags, validator annotations).`;

    const parse = (raw: string) => DataModelSchema.parse(JSON.parse(extractJSON(raw)));

    return extractWithChunks(content, ctx, {
      tier: 'extraction',
      mapPrompt: (chunk) => ({
        system: JSON_SYSTEM,
        user: jsonUserPrompt(SCHEMA, chunk,
          `${instruction}\n\nNOTE: This is a PARTIAL view — extract only what is visible here.`),
      }),
      reducePrompt: (partials) => ({
        system: JSON_SYSTEM,
        user: `You received ${partials.length} partial data model extractions from different portions of the same codebase.
Merge them into one complete result. Rules:
- entities: combine all, deduplicate by name (keep the entry with the most fields).
- enums: combine all, deduplicate by name (merge values arrays).
- dtoObjects: combine all, deduplicate by name (keep the most detailed entry).
Output schema (output ONLY this JSON, nothing else):
${SCHEMA}

Partial results:
${partials.map((p, i) => `--- Part ${i + 1} ---\n${p}`).join('\n\n')}`,
      }),
      parse,
    });
  },
};

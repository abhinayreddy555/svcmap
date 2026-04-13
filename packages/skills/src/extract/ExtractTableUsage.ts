import { z } from 'zod';
import type { Skill, SkillContext, RawAssets } from '../types.js';
import { extractJSON } from '../types.js';
import { formatAssets, JSON_SYSTEM, jsonUserPrompt } from './prompts.js';

export const TableColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
  nullable: z.boolean(),
  description: z.string().nullable(),
  isKey: z.boolean(),
});

export const TableUsageSchema = z.object({
  tableName: z.string(),
  database: z.string().nullable(),
  ownershipType: z.enum(['owns', 'reads-only', 'reads-via-replica']),
  description: z.string(),
  columns: z.array(TableColumnSchema),
  indexes: z.array(z.string()),
  featureUsage: z.array(z.object({
    feature: z.string().describe('API endpoint or scenario name'),
    operation: z.enum(['INSERT', 'SELECT', 'UPDATE', 'DELETE', 'UPSERT']),
    description: z.string().nullable(),
  })),
});

export const TableMapSchema = z.object({
  tables: z.array(TableUsageSchema),
  crossServiceReads: z.array(z.object({
    table: z.string(),
    database: z.string().nullable(),
    ownerService: z.string().nullable().describe('Best guess at which service owns this table'),
    accessMethod: z.string().describe('direct DB connection, read replica, etc.'),
    reason: z.string(),
  })),
});
export type TableMap = z.infer<typeof TableMapSchema>;

const SCHEMA = JSON.stringify({
  tables: [{
    tableName: 'orders',
    database: 'orders-db',
    ownershipType: 'owns',
    description: 'Primary table storing all customer orders',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, description: 'Primary key', isKey: true },
      { name: 'status', type: 'VARCHAR(20)', nullable: false, description: 'Order state machine status', isKey: false },
    ],
    indexes: ['idx_orders_user_id', 'idx_orders_status'],
    featureUsage: [
      { feature: 'POST /orders', operation: 'INSERT', description: 'Create new order' },
      { feature: 'PATCH /orders/:id', operation: 'UPDATE', description: 'Update order status' },
    ],
  }],
  crossServiceReads: [],
}, null, 2);

export const ExtractTableUsageSkill: Skill<RawAssets, TableMap> = {
  name: 'ExtractTableUsage',
  description: 'Extract database tables owned/used by a service, their schemas, and which features use each table',
  tier: 'extraction',
  inputSchema: z.any() as any,
  outputSchema: TableMapSchema,

  async execute(input: RawAssets, ctx: SkillContext): Promise<TableMap> {
    const content = formatAssets(input, ['schema', 'migration', 'source', 'config']);
    const response = await ctx.llm.complete({
      system: JSON_SYSTEM,
      tier: 'extraction',
      enableCache: true,
      messages: [{
        role: 'user',
        content: jsonUserPrompt(SCHEMA, content,
          `Extract ALL database tables that this service uses.
Distinguish between tables it OWNS (creates migrations for, writes to) vs tables it only READS.
For each table: extract column names and types, indexes, and which features/endpoints use each table and how (INSERT/SELECT/UPDATE/DELETE).
Look at: Prisma schema, migration files, ORM models, repository classes, SQL queries.`),
      }],
    });

    return TableMapSchema.parse(JSON.parse(extractJSON(response.content)));
  },
};

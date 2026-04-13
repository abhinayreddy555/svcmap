import { z } from 'zod';
import type { Skill, SkillContext, RawAssets } from '../types.js';
import { extractJSON, extractWithChunks } from '../types.js';
import { formatAllAssets, JSON_SYSTEM, jsonUserPrompt } from './prompts.js';

export const ModuleNodeSchema = z.object({
  path: z.string().describe('File path relative to repo root'),
  layer: z.enum([
    'entry-point', 'route', 'middleware', 'controller',
    'service', 'repository', 'model', 'client', 'util', 'config', 'other',
  ]),
  imports: z.array(z.string()).describe('Internal file paths this module imports — exclude node_modules and stdlib'),
  exports: z.array(z.string()).describe('Key class/function names exported from this module'),
});

export const ModuleGraphSchema = z.object({
  nodes: z.array(ModuleNodeSchema),
  detectedLayers: z.array(z.string()).describe(
    'Architecture layers in order from external-facing to internal, e.g. ["route","service","repository","model"]',
  ),
  circularDependencies: z.array(z.array(z.string())).describe(
    'Any detected circular import cycles — each entry is an array of file paths forming the cycle',
  ),
});
export type ModuleGraph = z.infer<typeof ModuleGraphSchema>;

const SCHEMA = JSON.stringify({
  nodes: [
    {
      path: 'src/server.ts',
      layer: 'entry-point',
      imports: ['src/routes/index.ts', 'src/middleware/auth.ts'],
      exports: ['startServer'],
    },
    {
      path: 'src/routes/orders.ts',
      layer: 'route',
      imports: ['src/services/OrderService.ts', 'src/middleware/validate.ts'],
      exports: ['ordersRouter'],
    },
    {
      path: 'src/services/OrderService.ts',
      layer: 'service',
      imports: ['src/repositories/OrderRepository.ts', 'src/clients/PaymentClient.ts'],
      exports: ['OrderService'],
    },
    {
      path: 'src/repositories/OrderRepository.ts',
      layer: 'repository',
      imports: ['src/models/Order.ts'],
      exports: ['OrderRepository'],
    },
    {
      path: 'src/models/Order.ts',
      layer: 'model',
      imports: [],
      exports: ['Order', 'OrderStatus'],
    },
    {
      path: 'src/clients/PaymentClient.ts',
      layer: 'client',
      imports: [],
      exports: ['PaymentClient'],
    },
  ],
  detectedLayers: ['entry-point', 'route', 'middleware', 'service', 'repository', 'model', 'client'],
  circularDependencies: [],
}, null, 2);

export const ExtractModuleGraphSkill: Skill<RawAssets, ModuleGraph> = {
  name: 'ExtractModuleGraph',
  description: 'Extract the internal module dependency graph — which files import which, and what architectural layer each belongs to',
  tier: 'extraction',
  inputSchema: z.any() as any,
  outputSchema: ModuleGraphSchema,

  async execute(input: RawAssets, ctx: SkillContext): Promise<ModuleGraph> {
    const content = formatAllAssets(input, ['entry-point', 'route', 'source', 'event', 'error', 'schema']);

    const instruction = `Analyse the import/require/use statements across all source files and build an internal module dependency graph.

Rules:
- Only include INTERNAL imports (file paths within this repo). Exclude node_modules, stdlib, and language built-ins.
- For each file, assign it to the most appropriate architectural layer based on its role and location.
- Extract the key exported names (classes, functions, interfaces) — focus on the 1-5 most important ones.
- Look for circular imports (A imports B, B imports A) — these are architectural issues worth flagging.
- For the detectedLayers array, list layers in order from external-facing (routes) to internal (models/db).`;

    const parse = (raw: string) => ModuleGraphSchema.parse(JSON.parse(extractJSON(raw)));

    return extractWithChunks(content, ctx, {
      tier: 'extraction',
      mapPrompt: (chunk) => ({
        system: JSON_SYSTEM,
        user: jsonUserPrompt(SCHEMA, chunk,
          `${instruction}\n\nNOTE: This is a PARTIAL view — map every file you can see in this portion. Focus on architecturally significant files.`),
      }),
      reducePrompt: (partials) => ({
        system: JSON_SYSTEM,
        user: `You received ${partials.length} partial module graph extractions from different portions of the same codebase.
Merge them into one complete graph. Rules:
- nodes: combine all, deduplicate by path (keep entry with most imports/exports detail).
- detectedLayers: union all layer lists, preserving the logical order from external-facing to internal.
- circularDependencies: union all detected cycles, deduplicate identical cycles.
Output schema (output ONLY this JSON, nothing else):
${SCHEMA}

Partial results:
${partials.map((p, i) => `--- Part ${i + 1} ---\n${p}`).join('\n\n')}`,
      }),
      parse,
    });
  },
};

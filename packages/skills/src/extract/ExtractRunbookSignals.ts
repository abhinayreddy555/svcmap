import { z } from 'zod';
import type { Skill, SkillContext, RawAssets } from '../types.js';
import { extractJSON } from '../types.js';
import { formatAssets, JSON_SYSTEM, jsonUserPrompt } from './prompts.js';

export const RunbookSignalsSchema = z.object({
  healthCheckEndpoint: z.string().nullable(),
  healthCheckDescription: z.string().nullable(),
  metricsEndpoint: z.string().nullable(),
  startupProcedure: z.array(z.string()).describe('Steps to start the service'),
  shutdownBehaviour: z.string().nullable().describe('How the service handles SIGTERM/graceful shutdown'),
  deploymentPlatform: z.string().nullable().describe('Kubernetes, ECS, Azure App Service, etc.'),
  scalingNotes: z.string().nullable(),
  commonFailureModes: z.array(z.object({
    symptom: z.string(),
    likelyCause: z.string(),
    immediateAction: z.string(),
    investigationSteps: z.array(z.string()),
  })),
  rollbackSteps: z.array(z.string()),
  usefulCommands: z.array(z.object({
    description: z.string(),
    command: z.string(),
  })),
  environmentNotes: z.string().nullable().describe('Key differences between environments (prod vs staging)'),
});
export type RunbookSignals = z.infer<typeof RunbookSignalsSchema>;

const SCHEMA = JSON.stringify({
  healthCheckEndpoint: 'GET /health',
  healthCheckDescription: 'Returns 200 if DB connection is healthy, 503 with reason if degraded',
  metricsEndpoint: 'GET /metrics',
  startupProcedure: ['Run DB migrations: npm run db:migrate', 'Start server: npm start'],
  shutdownBehaviour: 'On SIGTERM: stop accepting connections, drain in-flight requests (30s), close DB pool',
  deploymentPlatform: 'Kubernetes',
  scalingNotes: 'Stateless; horizontal scaling safe. Min 2 replicas for HA.',
  commonFailureModes: [{
    symptom: '503 on all endpoints',
    likelyCause: 'DB connection pool exhausted or DB unreachable',
    immediateAction: 'Check /health endpoint body for specific reason; restart pod if pool exhausted',
    investigationSteps: ['Check pg_stat_activity for long-running queries', 'Check pod logs for connection errors'],
  }],
  rollbackSteps: ['kubectl set image deployment/svc svc=image:prev-tag', 'kubectl rollout status deployment/svc'],
  usefulCommands: [{ description: 'Watch pod logs', command: 'kubectl logs -f deploy/order-service -n production' }],
  environmentNotes: 'Prod uses RDS Aurora; staging uses RDS single instance. Connection pool max differs.',
}, null, 2);

export const ExtractRunbookSignalsSkill: Skill<RawAssets, RunbookSignals> = {
  name: 'ExtractRunbookSignals',
  description: 'Extract operational signals — health checks, startup, failure modes, rollback steps — for generating a runbook',
  tier: 'extraction',
  inputSchema: z.any() as any,
  outputSchema: RunbookSignalsSchema,

  async execute(input: RawAssets, ctx: SkillContext): Promise<RunbookSignals> {
    const content = formatAssets(input, ['infra', 'ci', 'config', 'entry-point', 'doc']);
    const response = await ctx.llm.complete({
      system: JSON_SYSTEM,
      tier: 'extraction',
      enableCache: true,
      messages: [{
        role: 'user',
        content: jsonUserPrompt(SCHEMA, content,
          `Extract operational information for building a service runbook.
Look at: Dockerfiles (startup commands, health checks), k8s manifests (probes, resource limits), CI/CD pipelines,
README operational sections, health check endpoint implementations.
For failure modes: think about what would cause the service to degrade or fail, based on its dependencies and deployment config.
For rollback: extract any rollback scripts or procedures mentioned in CI/CD or ops docs.`),
      }],
    });

    return RunbookSignalsSchema.parse(JSON.parse(extractJSON(response.content)));
  },
};

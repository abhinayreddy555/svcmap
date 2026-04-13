import { z } from 'zod';
import type { Skill, SkillContext } from '../types.js';

export interface ServiceDataSummary {
  name: string;
  type: string;
  databases: Array<{ name: string; type: string; isShared: boolean }>;
  outboundDependencies: Array<{
    target: string;
    type: string;
    endpoint: string | null;
    isExternal: boolean;
  }>;
  events: Array<{ direction: string; topic: string }>;
  thirdParty: Array<{ name: string; category: string }>;
}

export interface DataFlowInput {
  productName: string;
  productSlug: string;
  services: ServiceDataSummary[];
}

export const GenerateDataFlowSkill: Skill<DataFlowInput, string> = {
  name: 'GenerateDataFlow',
  description: 'Generate a product-level DATAFLOW.md — event flows, data ownership, and cross-service call graph',
  tier: 'generation',
  inputSchema: z.any() as any,
  outputSchema: z.string(),

  async execute(input: DataFlowInput, ctx: SkillContext): Promise<string> {
    const { llm } = ctx;

    const response = await llm.complete({
      system: `You are a senior engineering architect writing a data flow document for a product knowledge base.
Write in clean GitHub-flavored Markdown. Use Mermaid diagrams throughout.
Be factual — only describe what is present in the provided data. Do not invent integrations.
This document is used by engineers debugging data issues and AI agents doing impact analysis.`,
      tier: 'generation',
      messages: [{
        role: 'user',
        content: buildDataFlowPrompt(input),
      }],
      maxTokens: 12_000,
    });

    return response.content;
  },
};

function buildDataFlowPrompt(input: DataFlowInput): string {
  // Build internal edges (service → service, excluding external)
  const internalEdges: string[] = [];
  const eventEdges: string[] = [];
  const externalDeps: Map<string, string[]> = new Map();

  for (const svc of input.services) {
    for (const dep of svc.outboundDependencies) {
      if (dep.isExternal) {
        const list = externalDeps.get(dep.target) ?? [];
        list.push(svc.name);
        externalDeps.set(dep.target, list);
      } else {
        const label = dep.type !== 'rest' ? dep.type.toUpperCase() : dep.endpoint ?? 'REST';
        internalEdges.push(`    ${svc.name} -->|"${label}"| ${dep.target}`);
      }
    }
    for (const evt of svc.events) {
      if (evt.direction === 'publishes') {
        eventEdges.push(`    ${svc.name} -->|publishes| ${evt.topic}[(${evt.topic})]`);
      } else {
        eventEdges.push(`    ${evt.topic}[(${evt.topic})] -->|consumes| ${svc.name}`);
      }
    }
  }

  // Collect all databases
  const dbOwnership: Array<{ db: string; type: string; owner: string; isShared: boolean }> = [];
  for (const svc of input.services) {
    for (const db of svc.databases) {
      dbOwnership.push({ db: db.name, type: db.type, owner: svc.name, isShared: db.isShared });
    }
  }

  return `# Product: ${input.productName}

## Services
${JSON.stringify(input.services, null, 2)}

## Pre-computed graph edges (use these directly in Mermaid diagrams)

Internal service calls:
${internalEdges.length > 0 ? internalEdges.join('\n') : '    (no direct service-to-service calls detected)'}

Event / message flows:
${eventEdges.length > 0 ? eventEdges.join('\n') : '    (no event flows detected)'}

Database ownership:
${JSON.stringify(dbOwnership, null, 2)}

External integrations:
${JSON.stringify(Object.fromEntries(externalDeps), null, 2)}

---

Write DATAFLOW.md with these exact sections:

1. # Data Flow — ${input.productName}
2. ## TL;DR for Agents
   - 3-5 bullets: number of internal service calls, number of event topics, number of databases, key external integrations, most critical data path
3. ## Service Call Graph
   - A Mermaid \`graph LR\` showing every service-to-service call. Label each arrow with the protocol/method.
   - Style each node by type: API services in blue (\`fill:#4a90d9\`), UI in purple, workers/batch in orange.
   - Use the pre-computed internal edges above.
4. ## Event & Message Flows
   - If no events exist, say so clearly.
   - Otherwise: a Mermaid \`graph LR\` showing which services publish to which topics and which services consume from which topics.
   - Below the diagram: a table with columns — Topic | Publisher(s) | Consumer(s) | Purpose
5. ## Data Ownership
   - A Mermaid \`graph LR\` showing which service owns which database (arrow from service to DB, label with DB type).
   - Below: a table — Database | Type | Owner Service | Shared? | Purpose
   - Call out any shared databases (accessed by multiple services) as a risk.
6. ## External Integrations
   - Table: Integration | Category | Used by Service(s) | Purpose
   - If none detected, say so.
7. ## Critical Data Paths
   - 3-5 bulleted descriptions of the most important data flows end-to-end (e.g. "A checkout: frontend → orders → payment → [order confirmed event] → shipping")
8. ## See Also
   - Links to PRODUCT.md and each service's DEPENDENCIES.md`;
}

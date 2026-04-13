import { z } from 'zod';
import type { Skill, SkillContext } from '../types.js';
import type { ServiceIdentity } from '../extract/ExtractServiceIdentity.js';
import type { APIContracts } from '../extract/ExtractAPIContracts.js';
import type { Dependencies } from '../extract/ExtractDependencies.js';
import type { Scenarios } from '../extract/ExtractScenarios.js';
import type { DataModel } from '../extract/ExtractDataModel.js';
import type { ServiceConfig } from '../extract/ExtractConfig.js';
import type { ErrorCatalogue } from '../extract/ExtractErrors.js';
import type { TableMap } from '../extract/ExtractTableUsage.js';
import type { CodingStandards } from '../extract/ExtractCodingStandards.js';
import type { RunbookSignals } from '../extract/ExtractRunbookSignals.js';
import type { ModuleGraph } from '../extract/ExtractModuleGraph.js';
import type { BusinessRules } from '../extract/ExtractBusinessRules.js';

export interface ServiceExtractions {
  serviceName: string;
  productName: string;
  repo: string;
  identity?: ServiceIdentity;
  api?: APIContracts;
  dependencies?: Dependencies;
  scenarios?: Scenarios;
  dataModel?: DataModel;
  config?: ServiceConfig;
  errors?: ErrorCatalogue;
  tableMap?: TableMap;
  codingStandards?: CodingStandards;
  runbookSignals?: RunbookSignals;
  moduleGraph?: ModuleGraph;
  businessRules?: BusinessRules;
  /** User-supplied extra docs content */
  extraDocs?: string;
}

export interface GeneratedDocument {
  filename: string;
  content: string;
  generatedAt: string;
  model: string;
}

export type DocType =
  | 'OVERVIEW'
  | 'API'
  | 'SCENARIOS'
  | 'DEPENDENCIES'
  | 'DATA_MODEL'
  | 'TABLE_MAP'
  | 'CONFIG'
  | 'ERRORS'
  | 'CODING_STANDARDS'
  | 'RUNBOOK'
  | 'ARCHITECTURE'
  | 'BUSINESS_RULES';

export const GenerateDocumentInputSchema = z.object({
  docType: z.enum(['OVERVIEW', 'API', 'SCENARIOS', 'DEPENDENCIES', 'DATA_MODEL', 'TABLE_MAP', 'CONFIG', 'ERRORS', 'CODING_STANDARDS', 'RUNBOOK', 'ARCHITECTURE', 'BUSINESS_RULES']),
  extractions: z.any(),
});

export const GenerateDocumentSkill: Skill<
  { docType: DocType; extractions: ServiceExtractions },
  GeneratedDocument
> = {
  name: 'GenerateDocument',
  description: 'Generate a structured Markdown document from extracted service data',
  tier: 'generation',
  inputSchema: GenerateDocumentInputSchema as any,
  outputSchema: z.any() as any,

  async execute(input, ctx): Promise<GeneratedDocument> {
    const { docType, extractions } = input;
    const { llm } = ctx;

    const system = buildSystemPrompt(docType);
    const user = buildUserPrompt(docType, extractions);

    const response = await llm.complete({
      system,
      tier: 'generation',
      enableCache: true,
      messages: [{ role: 'user', content: user }],
      maxTokens: 20_000,
    });

    return {
      filename: `${docType}.md`,
      content: response.content,
      generatedAt: new Date().toISOString(),
      model: response.model,
    };
  },
};

// ─── System prompts per doc type ────────────────────────────────────────────

function buildSystemPrompt(docType: DocType): string {
  const audienceMap: Record<DocType, string> = {
    OVERVIEW: 'engineers and AI agents who need to understand a service quickly',
    API: 'engineers integrating with or debugging this API, and AI agents answering API questions',
    SCENARIOS: 'engineers debugging or extending the service, and AI agents investigating bugs',
    DEPENDENCIES: 'engineers understanding service topology, and AI agents doing impact analysis',
    DATA_MODEL: 'engineers working with the database layer, and AI agents answering data questions',
    TABLE_MAP: 'engineers and DBAs understanding which features touch which tables',
    CONFIG: 'engineers deploying or debugging configuration, and DevOps agents',
    ERRORS: 'engineers handling errors in calling services, and AI agents investigating incidents',
    CODING_STANDARDS: 'engineers contributing to this service, and AI agents generating or reviewing code',
    RUNBOOK: 'on-call engineers and AI agents responding to incidents or performing deployments',
    ARCHITECTURE: 'engineers understanding internal code structure, and AI agents generating or reviewing code',
    BUSINESS_RULES: 'engineers implementing features or fixing bugs, and AI agents reasoning about allowed state transitions, permissions, and business constraints',
  };

  return `You are a technical documentation expert writing for ${audienceMap[docType]}.

Write in clean GitHub-flavored Markdown.
ALWAYS start the document with a "## TL;DR for Agents" section containing 3-5 bullet points.
The TL;DR must be written so an agent can decide in 2 seconds if this document is relevant to its task.
Use tables for structured data. Use code blocks for file paths, error codes, and commands.
Be factual and precise. Use the provided structured data — do not invent information.
Cross-reference related documents using relative Markdown links (e.g. [SCENARIOS.md](SCENARIOS.md)).
End every document with a "## See Also" section with 2-4 relevant links.`;
}

// ─── User prompts per doc type ───────────────────────────────────────────────

function buildUserPrompt(docType: DocType, ex: ServiceExtractions): string {
  const header = `# Context
Service: ${ex.serviceName}
Product: ${ex.productName}
Repo: ${ex.repo}
${ex.extraDocs ? `\n## User-Provided Documentation\n${ex.extraDocs.slice(0, 4000)}\n` : ''}`;

  switch (docType) {
    case 'OVERVIEW': return buildOverviewPrompt(header, ex);
    case 'API': return buildAPIPrompt(header, ex);
    case 'SCENARIOS': return buildScenariosPrompt(header, ex);
    case 'DEPENDENCIES': return buildDepsPrompt(header, ex);
    case 'DATA_MODEL': return buildDataModelPrompt(header, ex);
    case 'TABLE_MAP': return buildTableMapPrompt(header, ex);
    case 'CONFIG': return buildConfigPrompt(header, ex);
    case 'ERRORS': return buildErrorsPrompt(header, ex);
    case 'CODING_STANDARDS': return buildStandardsPrompt(header, ex);
    case 'RUNBOOK': return buildRunbookPrompt(header, ex);
    case 'ARCHITECTURE': return buildArchitecturePrompt(header, ex);
    case 'BUSINESS_RULES': return buildBusinessRulesPrompt(header, ex);
  }
}

function buildOverviewPrompt(header: string, ex: ServiceExtractions): string {
  return `${header}

## Extracted Data
${JSON.stringify(ex.identity, null, 2)}

## Dependencies Summary
${JSON.stringify({ outbound: ex.dependencies?.outbound?.slice(0, 5), databases: ex.dependencies?.databases }, null, 2)}

Write an OVERVIEW.md with these exact sections (in this order):
1. # {Service Name} (H1 title with one-line tagline as blockquote)
2. ## TL;DR for Agents (3-5 bullets: what it does, key dependencies, entry point for bugs, database ownership)
3. ## Service Identity (table: Type, Language, Framework, Runtime, Repo, Primary Database, Deployed on)
4. ## Responsibilities (bulleted: what it owns, then "This service does NOT handle:" subsection)
5. ## Entry Points (table: entry point file, description)
6. ## Key Abstractions (brief description of the 3-7 most important classes/modules)
7. ## What an Agent Needs to Know to Work on This Service (short guide: where to start, key patterns)
8. ## Related Documents (links to API.md, SCENARIOS.md, DEPENDENCIES.md, TABLE_MAP.md, RUNBOOK.md)
9. ## See Also`;
}

function buildAPIPrompt(header: string, ex: ServiceExtractions): string {
  return `${header}

## Extracted API Contracts
${JSON.stringify(ex.api, null, 2)}

Write an API.md with these exact sections:
1. # API Reference — {Service Name}
2. ## TL;DR for Agents (total endpoint count, auth mechanism, most important 3 endpoints, any rate limits)
3. ## Authentication
   - How to authenticate (token format, header name, scope required)
   - What happens on auth failure (HTTP status + error body)
   - Any endpoints that are public (no auth required) — call these out explicitly
4. ## Base URL (table per environment if known, otherwise note "derived from config")
5. One section per endpoint group, then one subsection per endpoint: ### {METHOD} {path}
   - **Purpose** — one sentence
   - **Auth required** — role/scope/ownership check if applicable
   - **Rate limit** — if known
   - **Request** — table of body fields (field, type, required, description) + example JSON
   - **Response** — success shape as JSON example, then errors table (status | code | when | retryable)
   - **Side effects** — DB writes, events emitted, external calls triggered
6. ## gRPC / GraphQL (if applicable: service definition, type list)
7. ## Events (topics published/subscribed, payload shape, ordering guarantees)
8. ## Deprecations & Versioning (any deprecated endpoints, migration path)
9. ## See Also`;
}

function buildScenariosPrompt(header: string, ex: ServiceExtractions): string {
  return `${header}

## Extracted Scenarios
${JSON.stringify(ex.scenarios, null, 2)}

Write a SCENARIOS.md with these exact sections:

1. # Scenarios — {Service Name}
2. ## TL;DR for Agents
   - Total scenario count, tested vs untested count, most critical scenario, most common failure mode, whether any scenarios involve state transitions
3. ## How to Read This Document (2-3 sentences)
4. ## Scenario Index
   - Table: Name | Trigger | Tags | Tested By — so an agent can scan and pick the relevant scenario
5. One section per scenario: ## Scenario: {Name}
   - **Trigger** — exact HTTP method+path or event name
   - **Preconditions** — bulleted list of required pre-state
   - **Entry Point** — code reference as inline code
   - ### Sequence Diagram
     A Mermaid \`sequenceDiagram\` block. Actors: the service itself plus each distinct callsExternal.
     Each step becomes a message. For steps with stateChange, add a Note: \`Note over ServiceName: order.status PENDING→PROCESSING\`
     \`\`\`mermaid
     sequenceDiagram
         participant Client
         participant OrderService
         participant InventoryService
         participant DB
         Client->>OrderService: POST /orders
         OrderService->>InventoryService: reserve stock
         InventoryService-->>OrderService: 200 reserved
         OrderService->>DB: INSERT order (status=PENDING)
         Note over OrderService: order.status: NEW → PENDING
         OrderService-->>Client: 201 { orderId }
     \`\`\`
   - ### Steps
     Numbered list. For each step:
     - Bold the description
     - On the next line: \`📍 file:functionName\` — function signature in inline code if available
     - If branchCondition is set: italicise it as _"when: {condition}"_
     - If codeSnippet is set: render it in a code block with language tag
     - If stateChange is set: render as > **State change:** \`entity.field: FROM → TO\`
   - ### Success Outcome (code block showing response shape if HTTP, or event payload if async)
   - ### Failure Modes (table: Condition | Outcome | Error Code | Retryable)
   - ### Side Effects (bulleted)
   - ### Test Coverage (one line: Tested by \`{testedBy}\` or ⚠️ **Not covered by tests**)
6. ## See Also`;
}

function buildDepsPrompt(header: string, ex: ServiceExtractions): string {
  return `${header}

## Extracted Dependencies
${JSON.stringify(ex.dependencies, null, 2)}

Write a DEPENDENCIES.md with these exact sections:
1. # Dependencies — {Service Name}
2. ## TL;DR for Agents
   - N outbound internal service calls, N databases, N third-party integrations
   - Which dependencies have circuit breakers vs none (risk indicator)
   - Most critical dependency (single point of failure if any)
3. ## Outbound Service Calls
   - Table: Target | Type | Endpoint/Topic | Purpose | Timeout | Retries | Circuit Breaker | Auth Method
   - One subsection per dependency with: fallback behavior paragraph, failure impact
4. ## Databases & Storage
   - Table: Name | Type | Ownership | Purpose
   - Note which are shared across services (coordination risk)
5. ## Third-Party Integrations
   - Table: Name | Category | SDK/Package | Purpose | Has Fallback
6. ## Inbound Callers
   - See [DEPENDENCY_GRAPH.md](DEPENDENCY_GRAPH.md) for the full bidirectional call graph.
   - Note any inbound contracts this service must not break (stable API surface).
7. ## Resilience Assessment
   - Bulleted summary: which dependencies are protected (circuit breaker + retry), which are unprotected single points of failure
   - Recommendation for any unprotected critical paths
8. ## See Also
   - [DEPENDENCY_GRAPH.md](DEPENDENCY_GRAPH.md) — visual graph with inbound callers and impact analysis
   - [RUNBOOK.md](RUNBOOK.md) — what to do when a dependency goes down`;
}

function buildDataModelPrompt(header: string, ex: ServiceExtractions): string {
  return `${header}

## Extracted Data Model
${JSON.stringify(ex.dataModel, null, 2)}

Write a DATA_MODEL.md with these exact sections:
1. # Data Model — {Service Name}
2. ## TL;DR for Agents (entity count, DTO count, most important entity, key relationships)
3. ## Database Entities
   - One subsection per entity: ### {EntityName}
   - A description sentence
   - A field table with columns: Field | Type | Nullable | Index | FK → | Description
   - A relationships paragraph
4. ## Enums (one table per enum: Value | Description — infer descriptions from context if not explicit)
5. ## Key Relationships (diagram or bulleted summary of the most important cross-entity joins)
6. ## DTOs & Transfer Objects
   - One subsection per DTO: ### {DtoName} \`[request]\` / \`[response]\` / \`[event-payload]\` / \`[domain-object]\`
   - "Used in:" line listing endpoints or events
   - A field table with columns: Field | Type | Required | Validation Rules | Description
7. ## See Also`;
}

function buildTableMapPrompt(header: string, ex: ServiceExtractions): string {
  return `${header}

## Extracted Table Usage
${JSON.stringify(ex.tableMap, null, 2)}

Write a TABLE_MAP.md with these exact sections:
1. # Table Map — {Service Name}
2. ## TL;DR for Agents (N tables owned, N tables read-only, most critical table)
3. ## Tables Owned (one subsection per owned table with column table, indexes, feature usage table)
4. ## Tables Read From Other Services (table: table name, owning service, access method, reason)
5. ## See Also (link to product DATABASE_CATALOG.md)`;
}

function buildConfigPrompt(header: string, ex: ServiceExtractions): string {
  return `${header}

## Extracted Config
${JSON.stringify(ex.config, null, 2)}

Write a CONFIG.md with these exact sections:
1. # Configuration — {Service Name}
2. ## TL;DR for Agents (required secrets count, notable feature flags, deployment notes)
3. ## Environment Variables (table: key, required, default, category, description, sensitivity note)
4. ## Feature Flags (table: key, type, default, description)
5. ## Deployment Notes (paragraph)
6. ## See Also`;
}

function buildErrorsPrompt(header: string, ex: ServiceExtractions): string {
  return `${header}

## Extracted Error Catalogue
${JSON.stringify(ex.errors, null, 2)}

Write an ERRORS.md with these exact sections:
1. # Error Catalogue — {Service Name}
2. ## TL;DR for Agents (total error codes, most common, which are retryable)
3. ## Global Error Handling (paragraph describing the error middleware)
4. ## Error Reference (table: code, HTTP status, category, retryable, description, when it occurs, recovery hint)
5. ## See Also`;
}

function buildStandardsPrompt(header: string, ex: ServiceExtractions): string {
  return `${header}

## Extracted Coding Standards
${JSON.stringify(ex.codingStandards, null, 2)}

Write a CODING_STANDARDS.md with these exact sections:
1. # Coding Standards — {Service Name}
2. ## TL;DR for Agents (architecture pattern, key rule, most important convention for code gen)
3. ## Architecture Pattern (description + diagram as ASCII or description)
4. ## Layer Structure (table: layer, directory, responsibility, can call)
5. ## Naming Conventions (table per category: files, classes, functions, constants, DB columns)
6. ## Error Handling (paragraph)
7. ## Logging (paragraph)
8. ## Authentication (paragraph)
9. ## Testing Approach (paragraph)
10. ## Notable Patterns (one subsection per pattern with example)
11. ## Anti-Patterns to Avoid (bulleted list)
12. ## See Also`;
}

function buildRunbookPrompt(header: string, ex: ServiceExtractions): string {
  // Surface dependency failure modes to enrich runbook
  const unprotectedDeps = ex.dependencies?.outbound?.filter(d => !d.circuitBreaker) ?? [];
  const criticalDbs = ex.dependencies?.databases ?? [];

  return `${header}

## Extracted Runbook Signals
${JSON.stringify(ex.runbookSignals, null, 2)}

## Service Identity
${JSON.stringify({ type: ex.identity?.type, databases: criticalDbs }, null, 2)}

## Unprotected Dependencies (no circuit breaker — single point of failure risk)
${JSON.stringify(unprotectedDeps.map(d => ({ target: d.target, type: d.type, fallback: d.fallbackBehavior })), null, 2)}

## Known Failure Modes from Scenarios
${JSON.stringify(ex.scenarios?.scenarios?.flatMap(s => s.failureModes).slice(0, 20) ?? [], null, 2)}

Write a RUNBOOK.md with these exact sections:
1. # Runbook — {Service Name}
2. ## TL;DR for Agents
   - Health check endpoint, readiness vs liveness distinction if present
   - Is a restart safe? (stateless/stateful)
   - Most common failure mode and its immediate fix
   - Which unprotected dependencies are the highest risk
3. ## Quick Reference
   - Table: health endpoint, metrics endpoint, log location, restart command, deployment platform
4. ## Startup Procedure (numbered steps with expected log line or signal that each step succeeded)
5. ## Graceful Shutdown (SIGTERM handling, drain timeout, in-flight request behaviour)
6. ## Common Failure Modes
   - One subsection per failure mode: ### {Symptom}
   - **Symptom** — what is observable (log message, metric spike, HTTP error)
   - **Likely Cause** — 2-3 bullet ranked by probability
   - **Immediate Action** — one command or action to take right now
   - **Investigation Steps** — numbered, with exact commands (kubectl logs, curl health check, DB query)
   - **Resolution** — how to fix it
   - **Post-resolution** — what to verify it's fixed
   - Include failure modes for each unprotected dependency listed above
7. ## Dependency Failure Playbook
   - One subsection per critical dependency: ### If {dependency} is down
   - What this service does (fails fast / degrades / uses fallback)
   - How to verify the dependency status
   - When to escalate vs wait
8. ## Rollback Procedure (numbered steps)
9. ## Useful Commands (code blocks with descriptions — health check, log tailing, DB connection test)
10. ## Escalation (table: situation | action | who | when to escalate)
11. ## See Also`;
}

function buildBusinessRulesPrompt(header: string, ex: ServiceExtractions): string {
  const br = ex.businessRules;

  // Pre-build Mermaid stateDiagram blocks so the LLM has structured hints
  const stateDiagramHints = (br?.stateMachines ?? []).map((sm) => {
    const lines = [`stateDiagram-v2`, `  [*] --> ${sm.initialState ?? sm.states[0]}`];
    for (const t of sm.transitions) {
      const label = t.trigger.length > 40 ? t.trigger.slice(0, 37) + '…' : t.trigger;
      lines.push(`  ${t.from} --> ${t.to} : ${label}`);
    }
    for (const s of sm.terminalStates) lines.push(`  ${s} --> [*]`);
    return `### ${sm.entity} (field: \`${sm.statusField}\`)\n\`\`\`mermaid\n${lines.join('\n')}\n\`\`\``;
  }).join('\n\n');

  return `${header}

## Extracted Business Rules
${JSON.stringify(br, null, 2)}

## Pre-built State Diagram Hints (use these as the basis for the Mermaid blocks)
${stateDiagramHints || '(no state machines detected)'}

Write a BUSINESS_RULES.md with these exact sections:

1. # Business Rules — {Service Name}
2. ## TL;DR for Agents
   - How many state machines, how many rules, key permission model, most critical constraint an agent must not violate
3. ## State Machines
   - One subsection per state machine: ### {Entity} State Machine
   - A \`stateDiagram-v2\` Mermaid block showing all states and transitions with labels.
     Use the pre-built hints above as the starting point — enrich with guard conditions in [brackets] on arrows.
     Example: \`PENDING --> CANCELLED : cancel() [window < 30min]\`
   - A **Transitions Reference** table with columns: From | To | Trigger | Guards | Side Effects | Code Ref
   - A **Terminal States** note explaining what happens in each terminal state
4. ## Business Rules
   - Group rules by category (validation, business-constraint, state-guard, idempotency, etc.)
   - For each rule: name as ### heading, then a table with: Category | Condition | Outcome | Error Code | Code Ref
   - End with a **Quick Reference** table listing all rules: Name | Category | Condition | Code Ref
5. ## Permission Matrix
   - A table: Resource | Action | Allowed Roles | Additional Conditions | Denial Behavior
   - A paragraph summarising the auth model (JWT / RBAC / ABAC / ownership-based)
6. ## Calculations & Formulas
   - One subsection per calculation: ### {Name}
   - Formula in a code block, then inputs/output/precision as a table
7. ## What an Agent Must Know
   - 5-8 bullets: the rules most likely to cause a bug if violated, the state transition an agent must check before acting,
     the permission check an agent must replicate before generating code that touches protected resources
8. ## See Also
   - Links to SCENARIOS.md (for where rules are exercised), ERRORS.md (for error codes), DATA_MODEL.md (for entity fields)`;
}

function buildArchitecturePrompt(header: string, ex: ServiceExtractions): string {
  return `${header}

## Extracted Module Graph
${JSON.stringify(ex.moduleGraph, null, 2)}

## Service Identity (for context)
${JSON.stringify({ type: ex.identity?.type, framework: ex.identity?.framework, language: ex.identity?.primaryLanguage }, null, 2)}

Write an ARCHITECTURE.md with these exact sections:

1. # Architecture — {Service Name}
2. ## TL;DR for Agents
   - 3-5 bullets: architectural pattern (layered/hexagonal/etc), number of layers, key modules, any circular dependencies, entry point for code changes
3. ## Layer Architecture
   - A Mermaid \`graph TD\` showing layers from top (external-facing) to bottom (internal/data).
   - Each layer is a subgraph containing the key files/modules in that layer.
   - Arrows show the allowed dependency direction (top → bottom only in a clean architecture).
   - Example format:
     \`\`\`mermaid
     graph TD
       subgraph "Entry Point"
         main["main.go"]
       end
       subgraph "Routes / Transport"
         router["transport.go"]
       end
       subgraph "Service Layer"
         svc["service.go"]
       end
       subgraph "Repository"
         repo["db.go"]
       end
       main --> router --> svc --> repo
     \`\`\`
4. ## Module Dependency Graph
   - A Mermaid \`graph LR\` showing the 15-20 most architecturally important modules and the actual import edges between them.
   - Use the nodes[].imports data to draw edges. Each node is a file path (use the filename only for readability).
   - Highlight any violations (e.g. a route importing a repository directly) with a red edge: \`A -->|"⚠ violation"| B\`
5. ## Layer Descriptions
   - Table: Layer | Directories/Files | Responsibility | May import from
6. ## Circular Dependencies
   - If circularDependencies is empty: state "No circular dependencies detected."
   - Otherwise: one subsection per cycle with the file chain and a recommended fix.
7. ## Key Design Patterns
   - 2-4 paragraphs on notable patterns visible in the module graph (dependency injection, factory pattern, middleware chain, etc.)
8. ## See Also`;
}

import type { SvcMapConfig } from '@svcmap/config';

interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Array<{ name: string; description: string; required: boolean }>;
}

interface PromptRegistry {
  list(): MCPPrompt[];
  get(name: string, args: Record<string, string>): Array<{ role: string; content: { type: string; text: string } }>;
}

export function registerPrompts(_config: SvcMapConfig): PromptRegistry {
  const prompts: MCPPrompt[] = [
    {
      name: 'investigate-bug',
      description: 'Structured bug investigation using service scenarios and error catalogue',
      arguments: [
        { name: 'service', description: 'Service name where the bug is observed', required: true },
        { name: 'symptom', description: 'What error or behaviour is observed', required: true },
      ],
    },
    {
      name: 'explain-feature',
      description: 'Explain how a feature works end-to-end across services',
      arguments: [
        { name: 'feature', description: 'Feature name or description (e.g. "order placement")', required: true },
      ],
    },
    {
      name: 'onboard-service',
      description: 'Generate a comprehensive onboarding guide for a service',
      arguments: [
        { name: 'service', description: 'Service name to onboard into', required: true },
      ],
    },
    {
      name: 'impact-analysis',
      description: 'Analyse the blast radius of a change to a service or API',
      arguments: [
        { name: 'service', description: 'Service being changed', required: true },
        { name: 'change', description: 'Description of the change', required: true },
      ],
    },
    {
      name: 'review-pr',
      description: 'Code review prompt enriched with service coding standards',
      arguments: [
        { name: 'service', description: 'Service the PR is for', required: true },
        { name: 'diff', description: 'The PR diff or description of changes', required: false },
      ],
    },
  ];

  return {
    list: () => prompts,

    get(name, args) {
      switch (name) {
        case 'investigate-bug':
          return [{
            role: 'user',
            content: {
              type: 'text',
              text: `You are investigating a bug in **${args.service}**.

Symptom: ${args.symptom}

Use the svcmap knowledge base to investigate:
1. Call \`get_service_doc\` with service="${args.service}" doc="SCENARIOS" to find which scenario matches this symptom
2. Call \`get_service_doc\` with service="${args.service}" doc="ERRORS" to check error codes
3. Call \`get_service_doc\` with service="${args.service}" doc="DEPENDENCIES" to check if upstream services could be causing this
4. Call \`get_service_doc\` with service="${args.service}" doc="RUNBOOK" for immediate mitigation steps

Based on your findings, produce:
- Root cause hypothesis
- Code locations to investigate (with file references from SCENARIOS.md)
- Immediate mitigation steps
- Upstream/downstream impact assessment`,
            },
          }];

        case 'explain-feature':
          return [{
            role: 'user',
            content: {
              type: 'text',
              text: `Explain how **${args.feature}** works end-to-end.

Use the svcmap knowledge base:
1. Call \`search_index\` with query="${args.feature}" to find relevant services and documents
2. For each relevant service, call \`get_service_doc\` with doc="SCENARIOS" to find the relevant scenario
3. Review the product DATA_FLOW.md if it exists

Produce a clear explanation covering:
- Which services are involved and in what order
- The complete data flow step by step (with code file references)
- What is stored in the database and where
- What events/messages are produced
- What can go wrong at each step`,
            },
          }];

        case 'onboard-service':
          return [{
            role: 'user',
            content: {
              type: 'text',
              text: `Create a comprehensive onboarding guide for an engineer joining the **${args.service}** team.

Gather context using the knowledge base:
1. \`get_service_doc\` service="${args.service}" doc="OVERVIEW"
2. \`get_service_doc\` service="${args.service}" doc="SCENARIOS"
3. \`get_service_doc\` service="${args.service}" doc="CODING_STANDARDS"
4. \`get_service_doc\` service="${args.service}" doc="DEPENDENCIES"

Produce a structured onboarding guide:
1. What this service does (1-2 paragraphs)
2. Key things to know before touching the code
3. The 3 most important scenarios to understand
4. Architecture and code organisation
5. How to run locally and run tests
6. Common gotchas and anti-patterns to avoid
7. Links to all knowledge base documents`,
            },
          }];

        case 'impact-analysis':
          return [{
            role: 'user',
            content: {
              type: 'text',
              text: `Perform an impact analysis for this change:

Service: **${args.service}**
Change: ${args.change}

Use the knowledge base:
1. \`get_service_doc\` service="${args.service}" doc="DEPENDENCIES" — who calls this service (inbound) and what it calls (outbound)
2. \`get_service_doc\` service="${args.service}" doc="API" — which API contracts might be affected
3. \`get_service_doc\` service="${args.service}" doc="TABLE_MAP" — which tables are affected

Produce:
- Direct impact: what changes in this service
- Blast radius: which other services/consumers are affected and how
- Data impact: which tables/data are affected
- Breaking change assessment: is this backwards compatible?
- Recommended rollout strategy`,
            },
          }];

        case 'review-pr':
          return [{
            role: 'user',
            content: {
              type: 'text',
              text: `Review this PR for **${args.service}** against the service's coding standards.

${args.diff ? `Changes:\n${args.diff}\n` : ''}

First, load the coding standards:
\`get_service_doc\` service="${args.service}" doc="CODING_STANDARDS"

Review against:
1. Architecture layer rules (is code in the right layer?)
2. Naming conventions
3. Error handling approach
4. Anti-patterns to avoid
5. Testing requirements

Produce a structured review with: ✅ follows standards, ⚠️ concerns, ❌ violations`,
            },
          }];

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    },
  };
}

import { z } from 'zod';
import type { Skill, SkillContext } from '../types.js';

export interface ServiceOverviewInput {
  name: string;
  type: string;
  primaryLanguage: string;
  framework: string | null;
  purpose: string;
  outboundServices: string[];
}

export interface ProductOverviewInput {
  productName: string;
  productSlug: string;
  productDescription: string;
  services: ServiceOverviewInput[];
}

export const GenerateProductOverviewSkill: Skill<ProductOverviewInput, string> = {
  name: 'GenerateProductOverview',
  description: 'Generate a product-level PRODUCT.md — architecture overview, service map, dependency graph, debugging guide',
  tier: 'generation',
  inputSchema: z.any() as any,
  outputSchema: z.string(),

  async execute(input: ProductOverviewInput, ctx: SkillContext): Promise<string> {
    const { llm } = ctx;

    const response = await llm.complete({
      system: `You are a senior engineering architect writing a product-level knowledge document for both human engineers and AI agents.
Write in clean GitHub-flavored Markdown. Be factual — only describe what is present in the provided data.
This is the top-level "bible page" for the product: it must give a complete architectural picture without requiring the reader to open any service-level doc.
Use Mermaid diagrams where specified. Use tables for structured data.`,
      tier: 'generation',
      messages: [{
        role: 'user',
        content: buildProductOverviewPrompt(input),
      }],
      maxTokens: 10_000,
    });

    return response.content;
  },
};

function buildProductOverviewPrompt(input: ProductOverviewInput): string {
  const serviceData = JSON.stringify(input.services, null, 2);

  // Build the dependency edges for the Mermaid diagram
  const edges: string[] = [];
  for (const svc of input.services) {
    for (const dep of svc.outboundServices) {
      // Only draw edges to services that exist in this product
      const isInternal = input.services.some((s) => s.name === dep || dep.includes(s.name) || s.name.includes(dep));
      if (isInternal) {
        edges.push(`    ${svc.name} --> ${dep}`);
      }
    }
  }
  const mermaidHint = edges.length > 0
    ? `Known internal service dependencies (use these for the Mermaid graph):\n${edges.join('\n')}`
    : `No cross-service dependencies were detected automatically — draw the graph from the outboundServices data.`;

  return `# Product: ${input.productName}
Description: ${input.productDescription}

## Services
${serviceData}

## Dependency Hint
${mermaidHint}

Write PRODUCT.md with these exact sections in this order:

1. # ${input.productName} (H1 title with one-line tagline as blockquote)
2. ## TL;DR for Agents
   - 4-6 bullets: what the product does, how many services, primary languages, the most critical service, where most bugs will originate, which service owns auth/identity
3. ## What This Product Does
   - 2-4 paragraph description of the product's purpose, users, and core value
4. ## Service Map
   - Table with columns: Service | Type | Language / Framework | Purpose | Start here when...
   - "Start here when..." should be a practical debugging hint (e.g. "cart items wrong", "payment failing")
5. ## Service Dependency Graph
   - A Mermaid \`graph LR\` diagram showing which services call which other services.
   - Use the outboundServices data to draw arrows. Label each arrow if the relationship purpose is clear.
   - Example format:
     \`\`\`mermaid
     graph LR
         frontend --> catalogue
         frontend --> carts
         orders --> payment
         orders --> shipping
     \`\`\`
6. ## Technology Stack
   - Table: Language | Framework | Services using it
7. ## Debugging Entry Points
   - Table: Symptom | First service to check | Why
   - Cover at least 5-8 common product-level symptoms
8. ## How the Services Fit Together
   - 2-3 paragraphs describing the overall request flow from a user action to backend completion
   - Mention which services are on the critical path
9. ## See Also
   - Links to INDEX.md and each service's OVERVIEW.md (use relative paths: services/{name}/OVERVIEW.md)`;
}

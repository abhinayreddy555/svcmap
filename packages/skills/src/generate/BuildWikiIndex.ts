import { z } from 'zod';
import type { Skill, SkillContext } from '../types.js';

export interface ServiceSummary {
  name: string;
  type: string;
  stack: string;
  purpose: string;
  docsPath: string;
}

export interface ProductSummary {
  name: string;
  slug: string;
  description: string;
  services: ServiceSummary[];
  docsPath: string;
  lastUpdated: string;
}

export const BuildWikiIndexSkill: Skill<ProductSummary[], string> = {
  name: 'BuildWikiIndex',
  description: 'Build the root INDEX.md semantic router for the knowledge base',
  tier: 'generation',
  inputSchema: z.any() as any,
  outputSchema: z.string(),

  async execute(products: ProductSummary[], ctx: SkillContext): Promise<string> {
    const { llm } = ctx;

    const response = await llm.complete({
      system: `You are building a navigation index for an engineering knowledge base.
Write clean GitHub-flavored Markdown. Be concise but descriptive.
The index must help both humans and AI agents navigate to the right document quickly.
Each entry must have: a link, a type tag, technology tags, and a one-line description of what question that doc answers.`,
      tier: 'generation',
      messages: [{
        role: 'user',
        content: `Generate INDEX.md — the root semantic router for this knowledge base.

Products and services:
${JSON.stringify(products, null, 2)}

Write INDEX.md with this structure:
1. # svcmap Knowledge Base — Index  (H1)
2. > For agents: Start here. Navigate directly to the document that matches your query. (blockquote)
3. ## Products  (one subsection per product)
   - Product header with description
   - Table of services: name (linked), type tag, stack tags, "Read this when..." column
   - Links to product-level docs: PRODUCT.md, DATA_FLOW.md, API_SURFACE.md, DEPENDENCIES.md, DATABASE_CATALOG.md, CODING_STANDARDS.md
4. ## Quick Reference  (cross-cutting lookups)
   - Table: Topic, Document, "Use when..."
5. ## Meta
   - Last generated timestamp
   - How to regenerate
   - How to add a new service`,
      }],
      maxTokens: 6000,
    });

    return response.content;
  },
};

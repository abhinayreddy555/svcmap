import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { SvcMapConfig } from '@svcmap/config';
import { registerResources } from './resources.js';
import { registerTools } from './tools.js';
import { registerPrompts } from './prompts.js';

export interface MCPServerOptions {
  knowledgeDir: string;
  config: SvcMapConfig;
}

export async function startMCPServer(options: MCPServerOptions): Promise<void> {
  const { knowledgeDir, config } = options;

  const server = new Server(
    {
      name: 'svcmap',
      version: '0.1.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
      },
    },
  );

  // ── Resources — static MD files ───────────────────────────────────────────
  const resources = await registerResources(knowledgeDir, config);
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: resources.list(),
  }));
  server.setRequestHandler(ReadResourceRequestSchema, async (req) => ({
    contents: await resources.read(req.params.uri),
  }));

  // ── Tools — active queries ────────────────────────────────────────────────
  const tools = registerTools(knowledgeDir, config);
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.list(),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const result = await tools.call(req.params.name, req.params.arguments ?? {});
    return { content: result };
  });

  // ── Prompts — pre-built agent templates ──────────────────────────────────
  const prompts = registerPrompts(config);
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: prompts.list(),
  }));
  server.setRequestHandler(GetPromptRequestSchema, async (req) => ({
    messages: prompts.get(req.params.name, req.params.arguments ?? {}),
  }));

  // ── Start stdio transport ─────────────────────────────────────────────────
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Server runs until stdin closes
}

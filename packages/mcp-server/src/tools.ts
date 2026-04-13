import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import type { SvcMapConfig } from '@svcmap/config';

interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
}

interface ToolRegistry {
  list(): MCPTool[];
  call(name: string, args: Record<string, unknown>): Promise<Array<{ type: string; text: string }>>;
}

export function registerTools(knowledgeDir: string, config: SvcMapConfig): ToolRegistry {
  const tools: MCPTool[] = [
    {
      name: 'find_service',
      description: 'Find a service by name or keyword. Returns the service overview and links to its docs.',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Service name or keyword' } },
        required: ['query'],
      },
    },
    {
      name: 'get_service_doc',
      description: 'Get a specific document for a service (OVERVIEW, API, SCENARIOS, DEPENDENCIES, TABLE_MAP, CONFIG, ERRORS, CODING_STANDARDS, RUNBOOK)',
      inputSchema: {
        type: 'object',
        properties: {
          service: { type: 'string' },
          doc: { type: 'string', enum: ['OVERVIEW', 'API', 'SCENARIOS', 'DEPENDENCIES', 'TABLE_MAP', 'CONFIG', 'ERRORS', 'CODING_STANDARDS', 'RUNBOOK', 'DATA_MODEL'] },
        },
        required: ['service', 'doc'],
      },
    },
    {
      name: 'list_services',
      description: 'List all services in the knowledge base with their types and purposes',
      inputSchema: {
        type: 'object',
        properties: { product: { type: 'string', description: 'Filter by product slug (optional)' } },
      },
    },
    {
      name: 'get_table',
      description: 'Find which service owns a database table and which features use it',
      inputSchema: {
        type: 'object',
        properties: { table_name: { type: 'string', description: 'Table name to look up' } },
        required: ['table_name'],
      },
    },
    {
      name: 'search_index',
      description: 'Search the knowledge base index for documents matching a query',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
    {
      name: 'get_dependencies',
      description: 'Get dependency information for a service (what it calls and what calls it)',
      inputSchema: {
        type: 'object',
        properties: {
          service: { type: 'string' },
          direction: { type: 'string', enum: ['outbound', 'inbound', 'both'], default: 'both' },
        },
        required: ['service'],
      },
    },
  ];

  return {
    list: () => tools,

    async call(name, args) {
      switch (name) {
        case 'find_service': return findService(knowledgeDir, config, String(args.query));
        case 'get_service_doc': return getServiceDoc(knowledgeDir, config, String(args.service), String(args.doc));
        case 'list_services': return listServices(knowledgeDir, config);
        case 'get_table': return getTable(knowledgeDir, config, String(args.table_name));
        case 'search_index': return searchIndex(knowledgeDir, String(args.query));
        case 'get_dependencies': return getDependencies(knowledgeDir, config, String(args.service), String(args.direction ?? 'both'));
        default: throw new Error(`Unknown tool: ${name}`);
      }
    },
  };
}

// ─── Tool implementations ─────────────────────────────────────────────────────

async function findService(knowledgeDir: string, config: SvcMapConfig, query: string) {
  const slug = config.product.slug;
  const servicesDir = path.join(knowledgeDir, 'products', slug, 'services');
  if (!fs.existsSync(servicesDir)) return [{ type: 'text', text: 'No services found. Run `svcmap generate` first.' }];

  const serviceDirs = await fs.readdir(servicesDir);
  const q = query.toLowerCase();
  const matches = serviceDirs.filter((s) => s.toLowerCase().includes(q));

  if (matches.length === 0) return [{ type: 'text', text: `No service found matching "${query}"` }];

  const results: string[] = [];
  for (const svc of matches) {
    const overviewPath = path.join(servicesDir, svc, 'OVERVIEW.md');
    if (fs.existsSync(overviewPath)) {
      const content = await fs.readFile(overviewPath, 'utf8');
      // Return first 80 lines (TL;DR + Service Identity sections)
      const preview = content.split('\n').slice(0, 80).join('\n');
      results.push(`## ${svc}\n\n${preview}`);
    }
  }

  return [{ type: 'text', text: results.join('\n\n---\n\n') }];
}

async function getServiceDoc(knowledgeDir: string, config: SvcMapConfig, service: string, doc: string) {
  const slug = config.product.slug;
  const filePath = path.join(knowledgeDir, 'products', slug, 'services', service, `${doc}.md`);

  if (!fs.existsSync(filePath)) {
    return [{ type: 'text', text: `Document not found: ${service}/${doc}.md. Run \`svcmap generate\` first.` }];
  }

  const content = await fs.readFile(filePath, 'utf8');
  return [{ type: 'text', text: content }];
}

async function listServices(knowledgeDir: string, config: SvcMapConfig) {
  const slug = config.product.slug;
  const servicesDir = path.join(knowledgeDir, 'products', slug, 'services');

  if (!fs.existsSync(servicesDir)) {
    return [{ type: 'text', text: 'No services found. Run `svcmap generate` first.' }];
  }

  const services = await fs.readdir(servicesDir);
  const lines = [`# Services in ${config.product.name}\n`];
  lines.push(`| Service | Docs Available |`);
  lines.push(`|---------|---------------|`);

  for (const svc of services) {
    const svcDir = path.join(servicesDir, svc);
    const docs = (await fs.readdir(svcDir)).filter((f) => f.endsWith('.md')).map((f) => f.replace('.md', ''));
    lines.push(`| [${svc}](products/${slug}/services/${svc}/OVERVIEW.md) | ${docs.join(', ')} |`);
  }

  return [{ type: 'text', text: lines.join('\n') }];
}

async function getTable(knowledgeDir: string, config: SvcMapConfig, tableName: string) {
  const slug = config.product.slug;
  const tableMaps = await glob(`products/${slug}/services/*/TABLE_MAP.md`, {
    cwd: knowledgeDir,
    absolute: true,
  });

  const results: string[] = [];
  const q = tableName.toLowerCase();

  for (const filePath of tableMaps) {
    const content = await fs.readFile(filePath, 'utf8');
    if (content.toLowerCase().includes(q)) {
      const svcName = path.basename(path.dirname(filePath));
      // Extract relevant section
      const lines = content.split('\n');
      const tableIdx = lines.findIndex((l) => l.toLowerCase().includes(q));
      if (tableIdx >= 0) {
        const section = lines.slice(Math.max(0, tableIdx - 2), tableIdx + 30).join('\n');
        results.push(`**Found in ${svcName}/TABLE_MAP.md:**\n\n${section}`);
      }
    }
  }

  if (results.length === 0) {
    return [{ type: 'text', text: `Table "${tableName}" not found in any service TABLE_MAP.md` }];
  }

  return [{ type: 'text', text: results.join('\n\n---\n\n') }];
}

async function searchIndex(knowledgeDir: string, query: string) {
  const indexPath = path.join(knowledgeDir, 'INDEX.md');
  if (!fs.existsSync(indexPath)) {
    return [{ type: 'text', text: 'INDEX.md not found. Run `svcmap generate` first.' }];
  }

  const index = await fs.readFile(indexPath, 'utf8');
  const q = query.toLowerCase();
  const lines = index.split('\n');
  const relevant = lines.filter((l) => l.toLowerCase().includes(q));

  if (relevant.length === 0) {
    return [{ type: 'text', text: `No results in INDEX.md for "${query}". Try \`find_service\` instead.` }];
  }

  return [{ type: 'text', text: `# Search results for "${query}"\n\n${relevant.join('\n')}` }];
}

async function getDependencies(knowledgeDir: string, config: SvcMapConfig, service: string, direction: string) {
  const slug = config.product.slug;
  const filePath = path.join(knowledgeDir, 'products', slug, 'services', service, 'DEPENDENCIES.md');

  if (!fs.existsSync(filePath)) {
    return [{ type: 'text', text: `DEPENDENCIES.md not found for service "${service}"` }];
  }

  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split('\n');

  if (direction === 'both') return [{ type: 'text', text: content }];

  // Filter to relevant section
  const section = direction === 'outbound' ? 'Outbound Calls' : 'Inbound Calls';
  const startIdx = lines.findIndex((l) => l.includes(section));
  if (startIdx < 0) return [{ type: 'text', text: content }];

  // Find next H2 after the section
  const endIdx = lines.findIndex((l, i) => i > startIdx && l.startsWith('## '));
  const sectionLines = endIdx > 0 ? lines.slice(startIdx, endIdx) : lines.slice(startIdx);

  return [{ type: 'text', text: sectionLines.join('\n') }];
}

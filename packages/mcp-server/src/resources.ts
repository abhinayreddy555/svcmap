import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import type { SvcMapConfig } from '@svcmap/config';

interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

interface ResourceRegistry {
  list(): MCPResource[];
  read(uri: string): Promise<Array<{ uri: string; mimeType: string; text: string }>>;
}

/** URI scheme: knowledge://{product}/{...path} */
const SCHEME = 'knowledge://';

function pathToUri(knowledgeDir: string, filePath: string): string {
  const rel = path.relative(knowledgeDir, filePath).replace(/\\/g, '/');
  return `${SCHEME}${rel}`;
}

function uriToPath(knowledgeDir: string, uri: string): string {
  const rel = uri.replace(SCHEME, '');
  return path.join(knowledgeDir, rel);
}

function describeResource(rel: string): string {
  const parts = rel.split('/');
  const filename = parts[parts.length - 1].replace('.md', '');
  const service = parts.includes('services') ? parts[parts.indexOf('services') + 1] : null;

  const descriptions: Record<string, string> = {
    'INDEX': 'Root wiki index — semantic router for the entire knowledge base',
    'PRODUCT': `Product overview — high-level description, capabilities, and service inventory`,
    'DATA_FLOW': `End-to-end data flows and sequence narratives`,
    'API_SURFACE': `Aggregated API reference across all services`,
    'DEPENDENCIES': `Service dependency graph and external integrations`,
    'DATABASE_CATALOG': `All databases and tables with feature cross-reference`,
    'CODING_STANDARDS': `Cross-service coding patterns and conventions`,
    'OVERVIEW': service ? `${service} — what it does, responsibilities, entry points` : 'Service overview',
    'API': service ? `${service} — API endpoints and contracts` : 'API reference',
    'SCENARIOS': service ? `${service} — execution scenario walkthroughs` : 'Scenarios',
    'DATA_MODEL': service ? `${service} — data model and entities` : 'Data model',
    'TABLE_MAP': service ? `${service} — tables owned and used` : 'Table map',
    'CONFIG': service ? `${service} — configuration and feature flags` : 'Configuration',
    'ERRORS': service ? `${service} — error codes and recovery hints` : 'Error catalogue',
    'RUNBOOK': service ? `${service} — operational runbook` : 'Runbook',
  };

  return descriptions[filename] ?? `${rel}`;
}

export async function registerResources(
  knowledgeDir: string,
  _config: SvcMapConfig,
): Promise<ResourceRegistry> {
  // Scan all .md files in the knowledge base
  const mdFiles = await glob('**/*.md', {
    cwd: knowledgeDir,
    absolute: true,
    ignore: ['meta/**'],
  });

  const resourceMap = new Map<string, string>(); // uri → filePath
  for (const filePath of mdFiles) {
    const uri = pathToUri(knowledgeDir, filePath);
    resourceMap.set(uri, filePath);
  }

  return {
    list(): MCPResource[] {
      return Array.from(resourceMap.entries()).map(([uri, filePath]) => {
        const rel = path.relative(knowledgeDir, filePath).replace(/\\/g, '/');
        return {
          uri,
          name: path.basename(filePath, '.md'),
          description: describeResource(rel),
          mimeType: 'text/markdown',
        };
      });
    },

    async read(uri: string) {
      const filePath = uriToPath(knowledgeDir, uri);
      if (!resourceMap.has(uri) || !fs.existsSync(filePath)) {
        throw new Error(`Resource not found: ${uri}`);
      }
      const text = await fs.readFile(filePath, 'utf8');
      return [{ uri, mimeType: 'text/markdown', text }];
    },
  };
}

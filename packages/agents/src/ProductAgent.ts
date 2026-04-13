import path from 'path';
import fs from 'fs-extra';
import pLimit from 'p-limit';
import type { LLMProvider, GitProvider } from '@svcmap/providers';
import type { Logger } from '@svcmap/skills';
import { BuildWikiIndexSkill, GenerateProductOverviewSkill, GenerateDataFlowSkill } from '@svcmap/skills';
import type { ProductSummary } from '@svcmap/skills';
import { ServiceAgent } from './ServiceAgent.js';
import type { ServiceAgentConfig, ServiceAgentResult } from './ServiceAgent.js';

export interface ProductAgentConfig {
  productName: string;
  productSlug: string;
  productDescription: string;
  outputDir: string;
  services: ServiceAgentConfig[];
  /** Max concurrent service agents (default: 3) */
  parallelism?: number;
  /** Write raw extraction JSON */
  saveExtractions?: boolean;
}

export interface ProductAgentResult {
  productName: string;
  success: boolean;
  serviceResults: ServiceAgentResult[];
  totalDocs: number;
  indexPath: string;
  durationMs: number;
}

export class ProductAgent {
  private config: ProductAgentConfig;
  private llm: LLMProvider;
  private git?: GitProvider;
  private logger: Logger;

  constructor(config: ProductAgentConfig, llm: LLMProvider, git?: GitProvider, logger?: Logger) {
    this.config = config;
    this.llm = llm;
    this.git = git;
    this.logger = logger ?? consoleLogger();
  }

  async run(): Promise<ProductAgentResult> {
    const start = Date.now();
    const { productName, productSlug, outputDir, parallelism = 3 } = this.config;
    const productDir = path.join(outputDir, 'products', productSlug);

    this.logger.info(`\n🗺  svcmap — ${productName}`);
    this.logger.info(`Output: ${outputDir}`);
    this.logger.info(`Services: ${this.config.services.length}\n`);

    await fs.ensureDir(productDir);

    const limit = pLimit(parallelism);
    const extractedDir = this.config.saveExtractions
      ? path.join(outputDir, 'meta', 'extracted')
      : undefined;

    // ── Run all ServiceAgents (rate-limited in parallel) ─────────────────────
    const serviceResults = await Promise.all(
      this.config.services.map((svcConfig) =>
        limit(async () => {
          this.logger.info(`▶ ${svcConfig.serviceName}`);
          const agent = new ServiceAgent(
            {
              ...svcConfig,
              outputDir: productDir,
              extractedDir,
            },
            this.llm,
            this.git,
          );
          const result = await agent.run();
          if (result.success) {
            this.logger.info(`✓ ${svcConfig.serviceName} — ${result.generatedDocs.length} docs`);
          } else {
            const errKeys = Object.keys(result.errors).join(', ');
            this.logger.warn(`✗ ${svcConfig.serviceName} — partial (${Object.keys(result.errors).length} errors: ${errKeys})`);
          }
          return result;
        }),
      ),
    );

    const indexCtx = { llm: this.llm, logger: this.logger };

    // ── Generate product-level PRODUCT.md ────────────────────────────────────
    this.logger.info('\nGenerating product overview...');
    try {
      const productOverviewContent = await GenerateProductOverviewSkill.execute(
        {
          productName,
          productSlug,
          productDescription: this.config.productDescription,
          services: serviceResults.map((r) => ({
            name: r.serviceName,
            type: r.extractedSummary?.type ?? 'service',
            primaryLanguage: r.extractedSummary?.primaryLanguage ?? 'unknown',
            framework: r.extractedSummary?.framework ?? null,
            purpose: r.extractedSummary?.purpose ?? '',
            outboundServices: r.extractedSummary?.outboundServices ?? [],
          })),
        },
        indexCtx,
      );
      await fs.writeFile(path.join(productDir, 'PRODUCT.md'), productOverviewContent);
      this.logger.info('✓ PRODUCT.md');
    } catch (err) {
      this.logger.warn(`PRODUCT.md failed: ${err}`);
    }

    // ── Build root INDEX.md ───────────────────────────────────────────────────
    this.logger.info('\nBuilding wiki index...');
    const productSummary: ProductSummary = {
      name: productName,
      slug: productSlug,
      description: this.config.productDescription,
      docsPath: `products/${productSlug}`,
      lastUpdated: new Date().toISOString(),
      services: this.config.services.map((s) => ({
        name: s.serviceName,
        type: 'service',
        stack: `${s.org}/${s.repo}`,
        purpose: '',
        docsPath: `products/${productSlug}/services/${s.serviceName}`,
      })),
    };
    const indexContent = await BuildWikiIndexSkill.execute([productSummary], indexCtx);
    const indexPath = path.join(outputDir, 'INDEX.md');
    await fs.writeFile(indexPath, indexContent);
    this.logger.info('✓ INDEX.md');

    // ── Generate product-level DATAFLOW.md ───────────────────────────────────
    this.logger.info('\nGenerating data flow diagram...');
    try {
      const dataFlowContent = await GenerateDataFlowSkill.execute(
        {
          productName,
          productSlug,
          services: serviceResults
            .filter((r) => r.extractedSummary)
            .map((r) => ({
              name: r.serviceName,
              type: r.extractedSummary!.type,
              databases: r.extractedSummary!.databases,
              outboundDependencies: r.extractedSummary!.outboundDependencies,
              events: r.extractedSummary!.events,
              thirdParty: r.extractedSummary!.thirdParty,
            })),
        },
        indexCtx,
      );
      await fs.writeFile(path.join(productDir, 'DATAFLOW.md'), dataFlowContent);
      this.logger.info('✓ DATAFLOW.md');
    } catch (err) {
      this.logger.warn(`DATAFLOW.md failed: ${err}`);
    }

    // ── Compute inbound dependency map (invert outbound calls) ───────────────
    // After all services run, we know who calls whom. Invert to get inbound callers.
    const inboundMap: Record<string, string[]> = {};
    const allServiceNames = this.config.services.map((s) => s.serviceName);
    for (const r of serviceResults) {
      for (const dep of r.extractedSummary?.outboundDependencies ?? []) {
        if (!dep.isExternal) {
          // fuzzy-match dep.target against known service names
          const matched = allServiceNames.find(
            (sn) => sn.toLowerCase() === dep.target.toLowerCase() ||
              sn.toLowerCase().includes(dep.target.toLowerCase()) ||
              dep.target.toLowerCase().includes(sn.toLowerCase()),
          );
          if (matched && matched !== r.serviceName) {
            if (!inboundMap[matched]) inboundMap[matched] = [];
            if (!inboundMap[matched].includes(r.serviceName)) inboundMap[matched].push(r.serviceName);
          }
        }
      }
    }

    // ── Generate DEPENDENCY_GRAPH.md per service (template-based, no LLM) ───
    this.logger.info('\nGenerating dependency graphs...');
    for (const r of serviceResults) {
      try {
        const serviceDir = path.join(productDir, 'services', r.serviceName);
        if (!await fs.pathExists(serviceDir)) continue;

        const graphContent = buildDependencyGraphDoc({
          serviceName: r.serviceName,
          productName,
          outboundDependencies: r.extractedSummary?.outboundDependencies ?? [],
          inboundServices: inboundMap[r.serviceName] ?? [],
          databases: r.extractedSummary?.databases ?? [],
          events: r.extractedSummary?.events ?? [],
          thirdParty: r.extractedSummary?.thirdParty ?? [],
        });
        await fs.writeFile(path.join(serviceDir, 'DEPENDENCY_GRAPH.md'), graphContent);
        this.logger.info(`  ✓ ${r.serviceName}/DEPENDENCY_GRAPH.md`);
      } catch (err) {
        this.logger.warn(`  DEPENDENCY_GRAPH failed for ${r.serviceName}: ${err}`);
      }
    }

    // ── Write checksums ───────────────────────────────────────────────────────
    const checksums: Record<string, string> = {};
    const crawlStatsServices: Record<string, { filesCrawled: number; crawledChars: number }> = {};
    for (const r of serviceResults) {
      checksums[r.serviceName] = r.headSha;
      if (r.crawlStats) crawlStatsServices[r.serviceName] = r.crawlStats;
    }
    await fs.ensureDir(path.join(outputDir, 'meta'));
    await fs.writeJson(path.join(outputDir, 'meta', 'checksums.json'), checksums, { spaces: 2 });
    await fs.writeJson(
      path.join(outputDir, 'meta', 'crawl_stats.json'),
      { generated: new Date().toISOString(), services: crawlStatsServices },
      { spaces: 2 },
    );

    const totalDocs = serviceResults.reduce((sum, r) => sum + r.generatedDocs.length, 0) + 1;
    const durationMs = Date.now() - start;

    this.logger.info(`\n✅ Done — ${totalDocs} documents in ${(durationMs / 1000).toFixed(1)}s`);
    this.logger.info(`Knowledge base: ${outputDir}/`);

    return {
      productName,
      success: serviceResults.every((r) => r.success),
      serviceResults,
      totalDocs,
      indexPath,
      durationMs,
    };
  }
}

function consoleLogger(): Logger {
  return {
    info: (msg) => console.log(msg),
    warn: (msg) => console.warn(`WARN: ${msg}`),
    error: (msg, err) => console.error(`ERROR: ${msg}`, err ?? ''),
    debug: (msg) => process.env.SVCMAP_DEBUG ? console.log(`DEBUG: ${msg}`) : undefined,
  };
}

// ─── Dependency graph doc builder (template-based, no LLM) ───────────────────

interface DependencyGraphInput {
  serviceName: string;
  productName: string;
  outboundDependencies: Array<{ target: string; type: string; endpoint: string | null; isExternal: boolean }>;
  inboundServices: string[];
  databases: Array<{ name: string; type: string; isShared: boolean }>;
  events: Array<{ direction: string; topic: string }>;
  thirdParty: Array<{ name: string; category: string }>;
}

function mermaidId(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_');
}

function buildDependencyGraphDoc(opts: DependencyGraphInput): string {
  const { serviceName, productName, outboundDependencies, inboundServices, databases, events, thirdParty } = opts;

  const internalOut = outboundDependencies.filter((d) => !d.isExternal);
  const externalOut = outboundDependencies.filter((d) => d.isExternal);
  const publishes = events.filter((e) => e.direction === 'publishes');
  const subscribes = events.filter((e) => e.direction === 'subscribes');
  // deduplicate third-party vs already-listed external outbound
  const extraThirdParty = thirdParty.filter(
    (t) => !externalOut.find((e) => e.target.toLowerCase() === t.name.toLowerCase()),
  );

  const self = mermaidId(serviceName);
  const lines: string[] = ['graph LR'];

  // self node
  lines.push(`  ${self}["⬡ ${serviceName}"]:::self`);

  // inbound callers
  for (const caller of inboundServices) {
    const id = mermaidId(caller);
    lines.push(`  ${id}["${caller}"]:::internal`);
    lines.push(`  ${id} -->|calls| ${self}`);
  }

  // internal outbound
  for (const dep of internalOut) {
    const id = mermaidId(dep.target);
    const label = dep.endpoint ? dep.endpoint.slice(0, 28) : dep.type;
    lines.push(`  ${id}["${dep.target}"]:::internal`);
    lines.push(`  ${self} -->|"${label}"| ${id}`);
  }

  // databases
  for (const db of databases) {
    const id = mermaidId(db.name);
    lines.push(`  ${id}[("${db.name}")]:::database`);
    lines.push(`  ${self} -->|${db.isShared ? 'shared' : 'owns'}| ${id}`);
  }

  // external outbound
  for (const dep of externalOut) {
    const id = mermaidId(dep.target);
    lines.push(`  ${id}["☁ ${dep.target}"]:::external`);
    lines.push(`  ${self} -->|"${dep.type}"| ${id}`);
  }

  // extra third-party (SDK-only, not in outbound list)
  for (const tp of extraThirdParty) {
    const id = mermaidId(tp.name);
    lines.push(`  ${id}["☁ ${tp.name}"]:::external`);
    lines.push(`  ${self} -.->|"${tp.category}"| ${id}`);
  }

  // events
  for (const ev of publishes) {
    const id = mermaidId(ev.topic);
    lines.push(`  ${id}[/"${ev.topic}"/]:::event`);
    lines.push(`  ${self} -->|publishes| ${id}`);
  }
  for (const ev of subscribes) {
    const id = mermaidId(ev.topic);
    lines.push(`  ${id}[/"${ev.topic}"/]:::event`);
    lines.push(`  ${id} -->|consumed by| ${self}`);
  }

  lines.push('  classDef self     fill:#1f3a5f,stroke:#58a6ff,color:#e6edf3,font-weight:bold');
  lines.push('  classDef internal fill:#1a3a22,stroke:#3fb950,color:#e6edf3');
  lines.push('  classDef database fill:#2d1f4e,stroke:#bc8cff,color:#e6edf3');
  lines.push('  classDef external fill:#3a2a1a,stroke:#ffa657,color:#e6edf3');
  lines.push('  classDef event    fill:#0d2233,stroke:#58a6ff,color:#8b949e');

  const allExternal = [
    ...externalOut.map((d) => d.target),
    ...extraThirdParty.map((t) => t.name),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const now = new Date().toISOString();

  // ── impact analysis ────────────────────────────────────────────────────────
  const downstreamImpact = inboundServices.length > 0
    ? `If **${serviceName}** becomes unavailable, these services are directly impacted: ${inboundServices.map((s) => `**${s}**`).join(', ')}.`
    : `No inbound callers detected within this product. This service may be externally facing or a leaf node.`;

  const upstreamRisk = internalOut.length > 0
    ? `This service depends on: ${internalOut.map((d) => `**${d.target}**`).join(', ')}. Outages in any of these propagate here.`
    : '';

  // ── tables ─────────────────────────────────────────────────────────────────
  const inboundTable = inboundServices.length === 0
    ? '_No inbound callers detected from within this product._'
    : `| Caller | Relationship |\n|---|---|\n${inboundServices.map((s) => `| **${s}** | calls ${serviceName} |`).join('\n')}`;

  const outboundTable = internalOut.length === 0
    ? '_No outbound internal service calls detected._'
    : `| Target | Type | Endpoint / Topic |\n|---|---|---|\n${internalOut.map((d) => `| **${d.target}** | \`${d.type}\` | \`${d.endpoint ?? '—'}\` |`).join('\n')}`;

  const dbTable = databases.length === 0
    ? '_No database connections detected._'
    : `| Database | Type | Ownership |\n|---|---|---|\n${databases.map((d) => `| **${d.name}** | \`${d.type}\` | ${d.isShared ? '🔶 Shared' : '🟢 Owned'} |`).join('\n')}`;

  const eventsSection = publishes.length + subscribes.length === 0
    ? '_No event topics detected._'
    : `| Direction | Topic |\n|---|---|\n${[
        ...publishes.map((e) => `| 📤 publishes | \`${e.topic}\` |`),
        ...subscribes.map((e) => `| 📥 subscribes | \`${e.topic}\` |`),
      ].join('\n')}`;

  const externalTable = allExternal.length === 0
    ? '_No external API calls detected._'
    : `| Service | Source |\n|---|---|\n${[
        ...externalOut.map((d) => `| ☁ **${d.target}** | outbound \`${d.type}\` call |`),
        ...extraThirdParty.map((t) => `| ☁ **${t.name}** | SDK — ${t.category} |`),
      ].join('\n')}`;

  return `<!-- generated: ${now} | source: dependency-graph -->
# Dependency Graph — ${serviceName}

## TL;DR for Agents
- **Inbound callers:** ${inboundServices.length === 0 ? 'none detected (leaf / external-facing)' : inboundServices.join(', ')}
- **Outbound internal:** ${internalOut.length === 0 ? 'none' : internalOut.map((d) => d.target).join(', ')}
- **Databases:** ${databases.length === 0 ? 'none' : databases.map((d) => `${d.name} (${d.isShared ? 'shared' : 'owned'})`).join(', ')}
- **Publishes:** ${publishes.length === 0 ? 'none' : publishes.map((e) => e.topic).join(', ')}
- **Subscribes:** ${subscribes.length === 0 ? 'none' : subscribes.map((e) => e.topic).join(', ')}
- **External APIs:** ${allExternal.length === 0 ? 'none' : allExternal.join(', ')}

---

## Full Dependency Graph

\`\`\`mermaid
${lines.join('\n')}
\`\`\`

> **Legend:** Blue = this service · Green = internal services · Purple = databases · Orange = external / third-party · Teal = event topics

---

## Inbound Callers

${inboundTable}

---

## Outbound Internal Calls

${outboundTable}

---

## Databases & Storage

${dbTable}

---

## Events

${eventsSection}

---

## External APIs & Third-Party

${externalTable}

---

## Impact Analysis

### If ${serviceName} goes down

${downstreamImpact}

${upstreamRisk}

### If ${serviceName}'s API contract changes

Inbound callers that must be updated: ${inboundServices.length > 0 ? inboundServices.join(', ') : 'none detected — safe to change without coordinating internally'}.

### Change blast radius checklist

- [ ] API contract changed → notify inbound callers: ${inboundServices.join(', ') || 'none'}
- [ ] Database schema changed → review [TABLE_MAP.md](TABLE_MAP.md) for shared tables
- [ ] Event schema changed → check all subscribers listed above
- [ ] New external dependency added → update [DEPENDENCIES.md](DEPENDENCIES.md)
- [ ] Run \`svcmap status\` after changes to detect stale docs

---

## See Also
- [DEPENDENCIES.md](DEPENDENCIES.md) — full dependency details with timeout, retry, and circuit breaker config
- [API.md](API.md) — API contract (breaking changes affect inbound callers above)
- [RUNBOOK.md](RUNBOOK.md) — what to do when this service or its dependencies go down
- [../DATAFLOW.md](../DATAFLOW.md) — product-level event and data flow
- [../PRODUCT.md](../PRODUCT.md) — full service map for ${productName}
`;
}

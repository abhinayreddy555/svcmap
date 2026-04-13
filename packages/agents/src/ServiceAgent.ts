import path from 'path';
import fs from 'fs-extra';
import pLimit from 'p-limit';
import type { LLMProvider, GitProvider } from '@svcmap/providers';
import type { Logger, RawAssets } from '@svcmap/skills';
import {
  CrawlRepoSkill,
  ExtractServiceIdentitySkill,
  ExtractAPIContractsSkill,
  ExtractDependenciesSkill,
  ExtractScenariosSkill,
  ExtractDataModelSkill,
  ExtractConfigSkill,
  ExtractErrorsSkill,
  ExtractTableUsageSkill,
  ExtractCodingStandardsSkill,
  ExtractRunbookSignalsSkill,
  ExtractModuleGraphSkill,
  ExtractBusinessRulesSkill,
  GenerateDocumentSkill,
} from '@svcmap/skills';
import type { ServiceExtractions, DocType } from '@svcmap/skills';

export interface ServiceAgentConfig {
  serviceName: string;
  productName: string;
  org: string;
  repo: string;
  branch: string;
  outputDir: string;
  excludePaths?: string[];
  includePaths?: string[];
  extraDocsContent?: string;
  /** Which doc types to generate (default: all) */
  docTypes?: DocType[];
  /** Path to write raw extraction JSON (undefined = skip) */
  extractedDir?: string;
}

export interface ServiceAgentResult {
  serviceName: string;
  success: boolean;
  generatedDocs: string[];
  headSha: string;
  errors: Record<string, string>;
  tokenUsage: { input: number; output: number };
  /** Lightweight summary for product-level overview and data flow generation */
  extractedSummary?: {
    type: string;
    primaryLanguage: string;
    framework: string | null;
    purpose: string;
    outboundServices: string[];
    outboundDependencies: Array<{ target: string; type: string; endpoint: string | null; isExternal: boolean }>;
    databases: Array<{ name: string; type: string; isShared: boolean }>;
    events: Array<{ direction: string; topic: string }>;
    thirdParty: Array<{ name: string; category: string }>;
  };
  /** Raw crawl metrics for benchmark reporting */
  crawlStats?: {
    filesCrawled: number;
    crawledChars: number;
  };
}

const ALL_DOC_TYPES: DocType[] = [
  'OVERVIEW', 'API', 'SCENARIOS', 'DEPENDENCIES',
  'DATA_MODEL', 'TABLE_MAP', 'CONFIG', 'ERRORS',
  'CODING_STANDARDS', 'RUNBOOK', 'ARCHITECTURE', 'BUSINESS_RULES',
];

export class ServiceAgent {
  private ctx: { llm: LLMProvider; git?: GitProvider; logger: Logger };
  private config: ServiceAgentConfig;

  constructor(
    config: ServiceAgentConfig,
    llm: LLMProvider,
    git?: GitProvider,
    logger?: Logger,
  ) {
    this.config = config;
    this.ctx = {
      llm,
      git,
      logger: logger ?? consoleLogger(config.serviceName),
    };
  }

  async run(): Promise<ServiceAgentResult> {
    const { serviceName, productName, org, repo, branch, outputDir } = this.config;
    const log = this.ctx.logger;
    const errors: Record<string, string> = {};
    const generatedDocs: string[] = [];
    let tokenInput = 0;
    let tokenOutput = 0;

    // ── Step 1: Crawl ────────────────────────────────────────────────────────
    log.info('Crawling repository...');
    let rawAssets: RawAssets;
    try {
      rawAssets = await CrawlRepoSkill.execute(
        { org, repo, branch, excludePaths: this.config.excludePaths, includePaths: this.config.includePaths },
        this.ctx,
      );
    } catch (err) {
      log.error('Crawl failed', err);
      return { serviceName, success: false, generatedDocs: [], headSha: '', errors: { crawl: String(err) }, tokenUsage: { input: 0, output: 0 } };
    }

    // ── Step 2: Extraction skills — rate-limited concurrency ─────────────────
    // Run one extraction skill at a time (sequential).
    // On the basic Anthropic tier (50K TPM), even 2 concurrent chunked skills
    // can produce 40K+ token bursts. Sequential execution keeps us well under
    // the limit. Services themselves are also run sequentially via ProductAgent
    // parallelism: 1 in the config default.
    log.info('Running extraction passes...');
    const extractLimit = pLimit(1);
    const [identity, api, dependencies, scenarios, dataModel, config, catalogue, tableMap, standards, runbook, moduleGraph, businessRules] =
      await Promise.all([
        extractLimit(() => runSkill('identity', () => ExtractServiceIdentitySkill.execute(rawAssets, this.ctx), errors, log)),
        extractLimit(() => runSkill('api', () => ExtractAPIContractsSkill.execute(rawAssets, this.ctx), errors, log)),
        extractLimit(() => runSkill('dependencies', () => ExtractDependenciesSkill.execute(rawAssets, this.ctx), errors, log)),
        extractLimit(() => runSkill('scenarios', () => ExtractScenariosSkill.execute(rawAssets, this.ctx), errors, log)),
        extractLimit(() => runSkill('dataModel', () => ExtractDataModelSkill.execute(rawAssets, this.ctx), errors, log)),
        extractLimit(() => runSkill('config', () => ExtractConfigSkill.execute(rawAssets, this.ctx), errors, log)),
        extractLimit(() => runSkill('errors', () => ExtractErrorsSkill.execute(rawAssets, this.ctx), errors, log)),
        extractLimit(() => runSkill('tableMap', () => ExtractTableUsageSkill.execute(rawAssets, this.ctx), errors, log)),
        extractLimit(() => runSkill('standards', () => ExtractCodingStandardsSkill.execute(rawAssets, this.ctx), errors, log)),
        extractLimit(() => runSkill('runbook', () => ExtractRunbookSignalsSkill.execute(rawAssets, this.ctx), errors, log)),
        extractLimit(() => runSkill('moduleGraph', () => ExtractModuleGraphSkill.execute(rawAssets, this.ctx), errors, log)),
        extractLimit(() => runSkill('businessRules', () => ExtractBusinessRulesSkill.execute(rawAssets, this.ctx), errors, log)),
      ]);

    const extractions: ServiceExtractions = {
      serviceName,
      productName,
      repo: `${org}/${repo}`,
      identity: identity ?? undefined,
      api: api ?? undefined,
      dependencies: dependencies ?? undefined,
      scenarios: scenarios ?? undefined,
      dataModel: dataModel ?? undefined,
      config: config ?? undefined,
      errors: catalogue ?? undefined,
      tableMap: tableMap ?? undefined,
      codingStandards: standards ?? undefined,
      runbookSignals: runbook ?? undefined,
      moduleGraph: moduleGraph ?? undefined,
      businessRules: businessRules ?? undefined,
      extraDocs: this.config.extraDocsContent,
    };

    // ── Step 3: Optionally persist raw extractions ───────────────────────────
    if (this.config.extractedDir) {
      const extractedPath = path.join(this.config.extractedDir, serviceName);
      await fs.ensureDir(extractedPath);
      await fs.writeJson(path.join(extractedPath, 'extractions.json'), extractions, { spaces: 2 });
    }

    // ── Step 4: Generate documents ───────────────────────────────────────────
    const serviceOutDir = path.join(outputDir, 'services', serviceName);
    await fs.ensureDir(serviceOutDir);

    const docTypes = this.config.docTypes ?? ALL_DOC_TYPES;
    log.info(`Generating ${docTypes.length} documents...`);

    for (const docType of docTypes) {
      try {
        const doc = await GenerateDocumentSkill.execute({ docType, extractions }, this.ctx);
        const filePath = path.join(serviceOutDir, doc.filename);
        await fs.writeFile(filePath, addGeneratedHeader(doc.content, doc.generatedAt, doc.model, rawAssets.headSha));
        generatedDocs.push(filePath);
        log.info(`  ✓ ${doc.filename}`);
      } catch (err) {
        errors[`generate_${docType}`] = String(err);
        log.error(`  ✗ ${docType}.md failed`, err);
      }
    }

    // ── Step 5: Write per-service INDEX.md ───────────────────────────────────
    try {
      const indexContent = buildServiceIndex(serviceName, productName, extractions.repo, docTypes, extractions);
      await fs.writeFile(path.join(serviceOutDir, 'INDEX.md'), indexContent);
      generatedDocs.push(path.join(serviceOutDir, 'INDEX.md'));
      log.info('  ✓ INDEX.md');
    } catch (err) {
      log.warn(`  INDEX.md failed: ${err}`);
    }

    // Build lightweight summary for product-level overview and data flow
    const extractedSummary = identity ? {
      type: identity.type,
      primaryLanguage: identity.primaryLanguage,
      framework: identity.framework,
      purpose: identity.purpose,
      outboundServices: dependencies?.outbound?.filter((d) => !d.isExternal).map((d) => d.target) ?? [],
      outboundDependencies: dependencies?.outbound?.map((d) => ({
        target: d.target,
        type: d.type,
        endpoint: d.endpoint,
        isExternal: d.isExternal,
      })) ?? [],
      databases: dependencies?.databases?.map((d) => ({
        name: d.name,
        type: d.type,
        isShared: d.isShared,
      })) ?? [],
      events: api?.events?.map((e) => ({
        direction: e.direction,
        topic: e.topic,
      })) ?? [],
      thirdParty: dependencies?.thirdParty?.map((t) => ({
        name: t.name,
        category: t.category,
      })) ?? [],
    } : undefined;

    const crawlStats = {
      filesCrawled: rawAssets.files.length,
      crawledChars: rawAssets.files.reduce((s, f) => s + f.content.length, 0),
    };

    return {
      serviceName,
      success: Object.keys(errors).length === 0,
      generatedDocs,
      headSha: rawAssets.headSha,
      errors,
      tokenUsage: { input: tokenInput, output: tokenOutput },
      extractedSummary,
      crawlStats,
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function runSkill<T>(
  name: string,
  fn: () => Promise<T>,
  errors: Record<string, string>,
  logger?: Logger,
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    const msg = String(err);
    errors[name] = msg;
    // Surface the first 200 chars of the error so it's visible in logs without needing SVCMAP_DEBUG
    const snippet = msg.length > 200 ? `${msg.slice(0, 200)}…` : msg;
    logger?.warn(`  extraction[${name}] failed: ${snippet}`);
    return null;
  }
}

function addGeneratedHeader(content: string, generatedAt: string, model: string, sha: string): string {
  return `<!-- generated: ${generatedAt} | model: ${model} | sha: ${sha.slice(0, 8)} -->\n\n${content}`;
}

function consoleLogger(prefix: string): Logger {
  return {
    info: (msg) => console.log(`  [${prefix}] ${msg}`),
    warn: (msg) => console.warn(`  [${prefix}] WARN: ${msg}`),
    error: (msg, err) => console.error(`  [${prefix}] ERROR: ${msg}`, err ?? ''),
    debug: (msg) => process.env.SVCMAP_DEBUG ? console.log(`  [${prefix}] DEBUG: ${msg}`) : undefined,
  };
}

// ─── Per-service INDEX.md builder (template-based, no LLM) ───────────────────

const DOC_META: Record<string, { desc: string; startHereIf: string }> = {
  'OVERVIEW':         { desc: 'Purpose, type, language, entry points, key abstractions', startHereIf: "You're new to this service" },
  'API':              { desc: 'All endpoints, auth, request/response shapes, events', startHereIf: 'You need to call this service or debug an endpoint' },
  'SCENARIOS':        { desc: 'End-to-end execution flows with Mermaid sequence diagrams and code-level detail', startHereIf: "You're investigating a bug or tracing a feature" },
  'BUSINESS_RULES':   { desc: 'State machines, permission matrix, calculation formulas, constraints', startHereIf: 'You need to understand allowed transitions or permissions' },
  'DATA_MODEL':       { desc: 'DB entities, DTOs, validation rules, request/response objects', startHereIf: "You're working with the database layer or data contracts" },
  'TABLE_MAP':        { desc: 'Which tables this service owns vs reads, per-feature usage', startHereIf: "You're planning a schema change or need table ownership" },
  'DEPENDENCIES':     { desc: 'Outbound calls, databases, third-party with timeout/retry/circuit-breaker', startHereIf: 'You need to understand what this service depends on' },
  'DEPENDENCY_GRAPH': { desc: 'Visual bidirectional graph: inbound callers, outbound calls, events, impact analysis', startHereIf: "You're assessing blast radius of a change" },
  'ARCHITECTURE':     { desc: 'Layer diagram, module dependency graph, circular dependency detection', startHereIf: "You're reviewing or modifying the internal code structure" },
  'CONFIG':           { desc: 'Environment variables, feature flags, deployment notes', startHereIf: "You're deploying or configuring this service" },
  'ERRORS':           { desc: 'Error catalogue with HTTP status, retryability, recovery hints', startHereIf: "You're handling errors from this service" },
  'CODING_STANDARDS': { desc: 'Architecture patterns, layer rules, naming conventions, anti-patterns', startHereIf: "You're contributing code to this service" },
  'RUNBOOK':          { desc: 'Health checks, startup/shutdown, failure modes, rollback, escalation', startHereIf: "You're on-call or doing a deployment" },
};

function buildServiceIndex(
  serviceName: string,
  productName: string,
  repo: string,
  docTypes: DocType[],
  ex: ServiceExtractions,
): string {
  const identity = ex.identity;
  const now = new Date().toISOString();

  const docRows = [
    ...docTypes.map((dt) => {
      const meta = DOC_META[dt];
      return `| [${dt}.md](${dt}.md) | ${meta?.desc ?? '—'} | ${meta?.startHereIf ?? '—'} |`;
    }),
    `| [DEPENDENCY_GRAPH.md](DEPENDENCY_GRAPH.md) | ${DOC_META['DEPENDENCY_GRAPH'].desc} | ${DOC_META['DEPENDENCY_GRAPH'].startHereIf} |`,
  ].join('\n');

  const quickFacts = identity ? `## Quick Facts

| Property | Value |
|---|---|
| Type | \`${identity.type}\` |
| Language | ${identity.primaryLanguage} |
| Framework | ${identity.framework ?? '—'} |
| Repo | [${repo}](https://github.com/${repo}) |
| Databases | ${ex.dependencies?.databases?.map((d) => d.name).join(', ') || '—'} |
| Outbound calls | ${ex.dependencies?.outbound?.filter((d) => !d.isExternal).map((d) => d.target).join(', ') || 'none'} |

` : '';

  return `<!-- generated: ${now} -->
# ${serviceName} — Service Index

> **Product:** ${productName}${identity ? ` · ${identity.type} · ${identity.primaryLanguage}${identity.framework ? ` · ${identity.framework}` : ''}` : ''}

${identity?.purpose ? `${identity.purpose}\n\n` : ''}${quickFacts}## Documents

| Document | Contents | Start here if... |
|---|---|---|
${docRows}

## See Also
- [../PRODUCT.md](../PRODUCT.md) — full service map for ${productName}
- [../DATAFLOW.md](../DATAFLOW.md) — product-level event and data flows
- [../../INDEX.md](../../INDEX.md) — knowledge base root index
`;
}

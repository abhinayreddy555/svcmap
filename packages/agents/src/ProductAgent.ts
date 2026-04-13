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

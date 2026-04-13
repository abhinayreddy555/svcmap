import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { findConfigPath, loadConfig } from '../config/schema.js';

interface CrawlStats {
  generated: string;
  services: Record<string, { filesCrawled: number; crawledChars: number }>;
}

interface BenchmarkRow {
  service: string;
  filesCrawled: number;
  rawTokens: number;
  docsGenerated: number;
  docsTotalTokens: number;
  avgQueryTokens: number;
  reductionPct: number;
}

const CHARS_PER_TOKEN = 4; // rough LLM token estimate

// Typical token cost per question without structured docs:
// agent must read a focused subset of the codebase — estimate 30% of crawled content
const RAW_RELEVANCE_FACTOR = 0.30;

// Typical token cost per question with svcmap: one focused doc section
// Average SCENARIOS.md or API.md is ~4K tokens; agent usually reads 1-2 docs per question
const AVG_DOCS_PER_QUERY = 1.5;

function countTokens(chars: number): number {
  return Math.round(chars / CHARS_PER_TOKEN);
}

function formatNum(n: number): string {
  return n.toLocaleString();
}

function formatK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

function bar(pct: number, width = 20): string {
  const filled = Math.round((pct / 100) * width);
  return chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(width - filled));
}

export function benchmarkCommand(): Command {
  return new Command('benchmark')
    .description('Compare token usage: answering questions from raw source code vs svcmap docs')
    .option('--config <path>', 'Path to svcmap.config.yaml')
    .option('--json', 'Output raw JSON instead of formatted report')
    .action(async (opts) => {
      const configPath = opts.config ?? findConfigPath();
      let config;
      try {
        config = loadConfig(configPath ?? undefined);
      } catch (err) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }

      const outputDir = path.resolve(config.knowledge_base.output_dir);
      const metaDir = path.join(outputDir, 'meta');
      const crawlStatsPath = path.join(metaDir, 'crawl_stats.json');

      if (!fs.existsSync(crawlStatsPath)) {
        console.error(chalk.red('No crawl_stats.json found. Run `svcmap generate` first.'));
        process.exit(1);
      }

      const crawlStats: CrawlStats = await fs.readJson(crawlStatsPath);
      const productDir = path.join(outputDir, 'products', config.product.slug);

      const rows: BenchmarkRow[] = [];

      for (const [serviceName, stats] of Object.entries(crawlStats.services)) {
        const serviceDocDir = path.join(productDir, 'services', serviceName);
        if (!fs.existsSync(serviceDocDir)) continue;

        // Sum all generated doc sizes
        const docFiles = await fs.readdir(serviceDocDir);
        const mdFiles = docFiles.filter((f) => f.endsWith('.md'));
        let docsTotalChars = 0;
        for (const f of mdFiles) {
          const content = await fs.readFile(path.join(serviceDocDir, f), 'utf8');
          docsTotalChars += content.length;
        }

        const rawTokens = countTokens(stats.crawledChars);
        const perQueryRaw = Math.round(rawTokens * RAW_RELEVANCE_FACTOR);
        const docsTotalTokens = countTokens(docsTotalChars);
        const avgQueryTokens = Math.round((docsTotalTokens / Math.max(mdFiles.length, 1)) * AVG_DOCS_PER_QUERY);
        const reductionPct = Math.round((1 - avgQueryTokens / perQueryRaw) * 100);

        rows.push({
          service: serviceName,
          filesCrawled: stats.filesCrawled,
          rawTokens: perQueryRaw,
          docsGenerated: mdFiles.length,
          docsTotalTokens,
          avgQueryTokens,
          reductionPct,
        });
      }

      if (opts.json) {
        console.log(JSON.stringify({ generated: crawlStats.generated, services: rows }, null, 2));
        return;
      }

      // ── Formatted report ──────────────────────────────────────────────────────
      const totalRaw = rows.reduce((s, r) => s + r.rawTokens, 0);
      const totalDocs = rows.reduce((s, r) => s + r.docsTotalTokens, 0);
      const totalDocCount = rows.reduce((s, r) => s + r.docsGenerated, 0);
      const avgReduction = rows.length ? Math.round(rows.reduce((s, r) => s + r.reductionPct, 0) / rows.length) : 0;
      const avgQueryWithout = rows.length ? Math.round(rows.reduce((s, r) => s + r.rawTokens, 0) / rows.length) : 0;
      const avgQueryWith = rows.length ? Math.round(rows.reduce((s, r) => s + r.avgQueryTokens, 0) / rows.length) : 0;

      // Claude Sonnet pricing: $3/MTok input
      const COST_PER_TOKEN = 3 / 1_000_000;
      const costWithout = avgQueryWithout * COST_PER_TOKEN;
      const costWith = avgQueryWith * COST_PER_TOKEN;
      const dailySavings100 = (costWithout - costWith) * 100;

      const width = 70;
      const line = chalk.dim('─'.repeat(width));

      console.log(chalk.bold(`\nsvcmap Benchmark Report — ${config.product.name}`));
      console.log(chalk.dim(`Generated: ${crawlStats.generated.slice(0, 10)} | ${rows.length} services | ${totalDocCount} documents\n`));

      console.log(line);
      console.log(chalk.bold('Per-service breakdown\n'));
      console.log(
        chalk.dim(
          `${'Service'.padEnd(32)} ${'Files'.padStart(5)} ${'Raw tokens/Q'.padStart(13)} ${'Doc tokens/Q'.padStart(13)} ${'Reduction'.padStart(10)}`,
        ),
      );
      console.log(chalk.dim('─'.repeat(width)));

      for (const r of rows) {
        const reduction = `${r.reductionPct}%`;
        console.log(
          `${r.service.padEnd(32)} ${String(r.filesCrawled).padStart(5)} ${formatK(r.rawTokens).padStart(13)} ${formatK(r.avgQueryTokens).padStart(13)} ${chalk.green(reduction.padStart(10))}`,
        );
      }

      console.log(line);
      console.log(chalk.bold('\nPer-question token comparison (average across services)\n'));

      const pctBarWidth = 30;
      console.log(`  Without svcmap  ${bar(100, pctBarWidth)} ${formatK(avgQueryWithout).padStart(7)} tokens`);
      console.log(`  With svcmap     ${bar(100 - avgReduction, pctBarWidth)} ${formatK(avgQueryWith).padStart(7)} tokens   ${chalk.green(`${avgReduction}% fewer`)}`);

      console.log(line);
      console.log(chalk.bold('\nKnowledge base size\n'));
      console.log(`  Raw code crawled:        ~${formatK(rows.reduce((s, r) => s + r.rawTokens / RAW_RELEVANCE_FACTOR, 0))} tokens across ${rows.length} services`);
      console.log(`  Generated documentation: ~${formatK(totalDocs)} tokens total  (${totalDocCount} docs)`);
      console.log(`  Tokens served per query: ~${formatK(avgQueryWith)} tokens  (${AVG_DOCS_PER_QUERY} docs avg)`);

      console.log(line);
      console.log(chalk.bold('\nCost estimate  (Claude Sonnet · $3 / M input tokens)\n'));
      console.log(`  Without svcmap (per question):          $${costWithout.toFixed(4)}`);
      console.log(`  With svcmap (per question):             $${costWith.toFixed(4)}`);
      console.log(`  Savings at 100 questions/day:           ${chalk.green(`$${dailySavings100.toFixed(2)}/day  (~$${(dailySavings100 * 30).toFixed(0)}/month`)}`);

      console.log(line);
      console.log(chalk.bold('\nAdditional benefits\n'));
      console.log('  Accuracy      Structured docs with cross-references reduce hallucination');
      console.log('                vs agents guessing from incomplete file reads');
      console.log('  Latency       Pre-generated docs answer in <1s vs 15-30s repo scan');
      console.log('  Freshness     svcmap status detects stale docs so agents know when');
      console.log('                to trust cached answers');
      console.log('  Privacy       Agents read structured docs, not raw source — no accidental');
      console.log('                secret or credential leakage in context windows\n');
    });
}

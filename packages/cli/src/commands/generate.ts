import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { config as loadDotenv } from 'dotenv';
import { loadConfig, findConfigPath } from '../config/schema.js';
import { ClaudeProvider, OpenAIProvider, GitHubProvider } from '@svcmap/providers';
import { ProductAgent } from '@svcmap/agents';
import type { ServiceAgentConfig } from '@svcmap/agents';
import type { DocType } from '@svcmap/skills';

export function generateCommand(): Command {
  return new Command('generate')
    .description('Generate the full knowledge base for all configured services')
    .option('--config <path>', 'Path to svcmap.config.yaml')
    .option('--service <name>', 'Generate docs for a single service only')
    .option('--dry-run', 'Show what would be generated without writing files')
    .option('--save-extractions', 'Persist raw extraction JSON to meta/extracted/')
    .action(async (opts) => {
      // Load env from knowledge/meta/.env if present
      const configPath = opts.config ?? findConfigPath();
      if (configPath) {
        const envPath = path.join(path.dirname(configPath), '.env');
        if (fs.existsSync(envPath)) loadDotenv({ path: envPath });
      }
      loadDotenv(); // also load root .env

      let config;
      try {
        config = loadConfig(opts.config);
      } catch (err) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }

      if (opts.dryRun) {
        console.log(chalk.yellow('[dry-run] Would generate:'));
        for (const [name, svc] of Object.entries(config.services)) {
          console.log(`  • ${name} (${svc.repo}@${svc.branch})`);
        }
        return;
      }

      // ── Build LLM provider ──────────────────────────────────────────────────
      const llmCfg = config.llm;
      let llm;
      try {
        if (llmCfg.provider === 'claude') {
          const key = process.env.ANTHROPIC_API_KEY;
          if (!key) throw new Error('ANTHROPIC_API_KEY not set. Add it to your .env file.');
          if (key.includes('...') || key === 'sk-ant-...') throw new Error('ANTHROPIC_API_KEY looks like a placeholder. Replace it with a real key from https://console.anthropic.com');
          llm = new ClaudeProvider(key, {
            extractionModel: llmCfg.extraction_model,
            generationModel: llmCfg.generation_model,
          });
        } else if (llmCfg.provider === 'openai') {
          const key = process.env.OPENAI_API_KEY;
          if (!key) throw new Error('OPENAI_API_KEY not set. Add it to your .env file.');
          llm = new OpenAIProvider(key, {
            extractionModel: llmCfg.extraction_model,
            generationModel: llmCfg.generation_model,
          });
        } else {
          throw new Error(`LLM provider '${llmCfg.provider}' is not yet implemented`);
        }
      } catch (err) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }

      // ── Build Git provider ──────────────────────────────────────────────────
      let git;
      try {
        if (config.provider.git === 'github') {
          const token = process.env.GITHUB_TOKEN;
          if (!token) throw new Error('GITHUB_TOKEN not set. Add it to your .env file.');
          if (token.includes('...') || token === 'ghp_...') throw new Error('GITHUB_TOKEN looks like a placeholder. Create a real token at https://github.com/settings/tokens (no scopes needed for public repos)');
          git = new GitHubProvider(token);
        } else {
          throw new Error(`Git provider '${config.provider.git}' is not yet implemented`);
        }
      } catch (err) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }

      // ── Build enabled doc types ──────────────────────────────────────────────
      const docCfg = config.generation?.documents?.service ?? {};
      const docTypeMap: Record<string, DocType> = {
        overview: 'OVERVIEW', api: 'API', scenarios: 'SCENARIOS',
        dependencies: 'DEPENDENCIES', data_model: 'DATA_MODEL', table_map: 'TABLE_MAP',
        config: 'CONFIG', errors: 'ERRORS', coding_standards: 'CODING_STANDARDS',
        runbook: 'RUNBOOK', architecture: 'ARCHITECTURE', business_rules: 'BUSINESS_RULES',
      };
      const enabledDocTypes = Object.entries(docTypeMap)
        .filter(([key]) => (docCfg as any)[key] !== false)
        .map(([, val]) => val);

      // ── Filter services ──────────────────────────────────────────────────────
      let serviceEntries = Object.entries(config.services);
      if (opts.service) {
        serviceEntries = serviceEntries.filter(([name]) => name === opts.service);
        if (serviceEntries.length === 0) {
          console.error(chalk.red(`Service '${opts.service}' not found in config`));
          process.exit(1);
        }
      }

      const outputDir = path.resolve(config.knowledge_base.output_dir);

      // ── Build ServiceAgent configs ───────────────────────────────────────────
      const serviceConfigs: ServiceAgentConfig[] = serviceEntries.map(([name, svc]) => {
        const [org, repo] = svc.repo.split('/');
        return {
          serviceName: name,
          productName: config.product.name,
          org,
          repo,
          branch: svc.branch,
          outputDir,
          excludePaths: svc.exclude_paths,
          includePaths: svc.include_paths,
          docTypes: enabledDocTypes,
        };
      });

      // ── Run ProductAgent ─────────────────────────────────────────────────────
      const agent = new ProductAgent(
        {
          productName: config.product.name,
          productSlug: config.product.slug,
          productDescription: config.product.description,
          outputDir,
          services: serviceConfigs,
          parallelism: config.generation?.parallelism ?? 3,
          saveExtractions: opts.saveExtractions,
        },
        llm,
        git,
      );

      const result = await agent.run();
      process.exit(result.success ? 0 : 1);
    });
}

import { Command } from 'commander';
import { input, select, confirm } from '@inquirer/prompts';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { writeConfig, parseGitHubUrl } from '../config/schema.js';
import type { SvcMapConfig } from '../config/schema.js';

export function initCommand(): Command {
  return new Command('init')
    .description('Bootstrap a new svcmap knowledge base for a product')
    .option('--config <path>', 'Path to write the config file')
    .action(async (opts) => {
      console.log(chalk.bold('\n🗺  svcmap init — Knowledge Base Setup\n'));

      const productName = await input({
        message: 'Product name?',
        validate: (v) => v.length > 0 || 'Required',
      });

      const productSlug = await input({
        message: 'Product slug (lowercase, hyphens only)?',
        default: productName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        validate: (v) => /^[a-z0-9-]+$/.test(v) || 'Must be lowercase with hyphens only',
      });

      const productDescription = await input({
        message: 'One-line product description?',
        validate: (v) => v.length > 0 || 'Required',
      });

      console.log(chalk.dim('  Tip: for monorepos paste the GitHub tree URL of each service subdirectory'));
      console.log(chalk.dim('       e.g. https://github.com/org/monorepo/tree/main/services/payment\n'));

      const reposRaw = await input({
        message: 'Repository URLs (comma-separated):',
        validate: (v) => {
          if (!v.trim()) return 'Provide at least one repository URL';
          try {
            v.split(',').forEach((r) => parseGitHubUrl(r.trim()));
            return true;
          } catch (e) {
            return (e as Error).message;
          }
        },
      });

      const repos = reposRaw.split(',').map((r) => r.trim()).filter(Boolean).map(parseGitHubUrl);

      const outputChoice = await select({
        message: 'Where should the knowledge base be stored?',
        choices: [
          { value: 'local', name: './knowledge/ (in this folder)' },
          { value: 'custom', name: 'Custom path' },
        ],
      });

      let outputDir = './knowledge';
      if (outputChoice === 'custom') {
        outputDir = await input({ message: 'Output directory path?', default: './knowledge' });
      }

      const llmProvider = await select({
        message: 'LLM provider?',
        choices: [
          { value: 'claude', name: 'Claude (Anthropic) — recommended' },
          { value: 'openai', name: 'OpenAI' },
        ],
      });

      const hasExtraDocs = await confirm({
        message: 'Do you have existing docs to include? (OpenAPI specs, ADRs, READMEs)',
        default: false,
      });

      // Build services config — each repo (or monorepo subdirectory) becomes a named service entry
      const services: SvcMapConfig['services'] = {};
      for (const parsed of repos) {
        const entry: SvcMapConfig['services'][string] = {
          repo: parsed.orgRepo,
          branch: parsed.branch ?? 'main',
        };
        if (parsed.includePath) {
          entry.include_paths = [`${parsed.includePath}/`];
        }
        services[parsed.suggestedName] = entry;
      }

      const configPath = opts.config ?? path.join(outputDir, 'meta', 'svcmap.config.yaml');

      const config: SvcMapConfig = {
        version: '1',
        product: { name: productName, slug: productSlug, description: productDescription },
        knowledge_base: { output_dir: outputDir, commit_to_repo: false, gitignore_extracted: true },
        provider: { git: 'github' },
        llm: { provider: llmProvider as 'claude' | 'openai', temperature: 0.2 },
        services,
        generation: {
          parallelism: 3,
          retry_attempts: 2,
          documents: {
            service: {
              overview: true, api: true, scenarios: true, dependencies: true,
              data_model: true, table_map: true, config: true, errors: true,
              coding_standards: true, runbook: true, architecture: true, business_rules: true,
            },
          },
        },
      };

      writeConfig(config, configPath);

      // Write .env template
      const envPath = path.join(path.dirname(configPath), '.env');
      if (!fs.existsSync(envPath)) {
        const envKey = llmProvider === 'claude' ? 'ANTHROPIC_API_KEY=sk-ant-...' : 'OPENAI_API_KEY=sk-...';
        fs.writeFileSync(envPath, `${envKey}\nGITHUB_TOKEN=ghp_...\n`, 'utf8');
      }

      // Add .gitignore entry
      const gitignorePath = '.gitignore';
      if (fs.existsSync(gitignorePath)) {
        const existing = fs.readFileSync(gitignorePath, 'utf8');
        if (!existing.includes('meta/.env')) {
          fs.appendFileSync(gitignorePath, '\n# svcmap\nknowledge/meta/.env\nknowledge/meta/extracted/\n');
        }
      }

      console.log(chalk.green('\n✓ Config written to:'), configPath);
      console.log(chalk.green('✓ .env template at:'), envPath);
      console.log(chalk.dim(`\n  Services configured:`));
      for (const parsed of repos) {
        const pathNote = parsed.includePath ? chalk.dim(` (${parsed.includePath}/)`) : '';
        console.log(chalk.dim(`    • ${parsed.suggestedName}  →  github.com/${parsed.orgRepo}${pathNote}`));
      }
      console.log(chalk.yellow('\nNext steps:'));
      console.log(`  1. Edit ${chalk.cyan(envPath)} — add your API keys`);
      if (hasExtraDocs) {
        console.log(`  2. Add ${chalk.cyan('extra_docs')} paths in ${configPath}`);
        console.log(`  3. ${chalk.bold('node svcmap.js generate')}`);
      } else {
        console.log(`  2. ${chalk.bold('node svcmap.js generate')}`);
      }
      console.log(`  3. ${chalk.bold('node svcmap.js serve')}  — start the MCP server\n`);
    });
}

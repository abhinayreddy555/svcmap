import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { config as loadDotenv } from 'dotenv';
import { loadConfig, findConfigPath } from '../config/schema.js';
import { GitHubProvider } from '@svcmap/providers';

export function statusCommand(): Command {
  return new Command('status')
    .description('Show which services have stale documentation (behind latest commit)')
    .option('--config <path>', 'Path to svcmap.config.yaml')
    .action(async (opts) => {
      const configPath = opts.config ?? findConfigPath();
      if (configPath) {
        const envPath = path.join(path.dirname(configPath), '.env');
        if (fs.existsSync(envPath)) loadDotenv({ path: envPath });
      }
      loadDotenv();

      let config;
      try {
        config = loadConfig(opts.config);
      } catch (err) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }

      const outputDir = path.resolve(config.knowledge_base.output_dir);
      const checksumsPath = path.join(outputDir, 'meta', 'checksums.json');

      if (!fs.existsSync(checksumsPath)) {
        console.log(chalk.yellow('No checksums found. Run `svcmap generate` first.'));
        return;
      }

      const checksums: Record<string, string> = await fs.readJson(checksumsPath);

      let git;
      try {
        if (config.provider.git === 'github') {
          const token = process.env.GITHUB_TOKEN;
          if (!token) throw new Error('GITHUB_TOKEN not set');
          git = new GitHubProvider(token);
        } else {
          throw new Error('Only GitHub is supported for status checks currently');
        }
      } catch (err) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }

      console.log(chalk.bold(`\n🗺  svcmap status — ${config.product.name}\n`));
      console.log(`${'Service'.padEnd(28)} ${'Stored SHA'.padEnd(12)} ${'Current SHA'.padEnd(12)} Status`);
      console.log('─'.repeat(70));

      for (const [name, svc] of Object.entries(config.services)) {
        const storedSha = checksums[name];
        const [org, repo] = svc.repo.split('/');
        try {
          const currentSha = await git.getHeadSha(org, repo, svc.branch);
          const stored = storedSha?.slice(0, 8) ?? 'none';
          const current = currentSha.slice(0, 8);
          const upToDate = storedSha && currentSha.startsWith(storedSha.slice(0, 8));
          const statusIcon = upToDate ? chalk.green('✓ up-to-date') : chalk.yellow('⚠ stale');
          console.log(`${name.padEnd(28)} ${stored.padEnd(12)} ${current.padEnd(12)} ${statusIcon}`);
        } catch {
          console.log(`${name.padEnd(28)} ${(storedSha?.slice(0, 8) ?? 'none').padEnd(12)} ${'error'.padEnd(12)} ${chalk.red('✗ could not check')}`);
        }
      }
      console.log();
    });
}

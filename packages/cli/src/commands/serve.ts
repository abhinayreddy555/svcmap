import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { config as loadDotenv } from 'dotenv';
import { loadConfig, findConfigPath } from '../config/schema.js';

export function serveCommand(): Command {
  return new Command('serve')
    .description('Start the svcmap MCP server')
    .option('--config <path>', 'Path to svcmap.config.yaml')
    .option('--knowledge-dir <path>', 'Path to knowledge base directory')
    .option('--port <number>', 'HTTP port for SSE transport (default: stdio only)', '0')
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

      const knowledgeDir = opts.knowledgeDir
        ? path.resolve(opts.knowledgeDir)
        : path.resolve(config.knowledge_base.output_dir);

      if (!fs.existsSync(knowledgeDir)) {
        console.error(chalk.red(`Knowledge directory not found: ${knowledgeDir}`));
        console.error(chalk.yellow('Run `svcmap generate` first.'));
        process.exit(1);
      }

      // Dynamically import the MCP server to avoid loading it unless needed
      const { startMCPServer } = await import('@svcmap/mcp-server');
      await startMCPServer({ knowledgeDir, config });
    });
}

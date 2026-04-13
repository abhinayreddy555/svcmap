#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { generateCommand } from './commands/generate.js';
import { statusCommand } from './commands/status.js';
import { serveCommand } from './commands/serve.js';
import { benchmarkCommand } from './commands/benchmark.js';

const program = new Command();

program
  .name('svcmap')
  .description('Knowledge server for your engineering products — generate living docs from git repos')
  .version('0.1.0');

program.addCommand(initCommand());
program.addCommand(generateCommand());
program.addCommand(statusCommand());
program.addCommand(serveCommand());
program.addCommand(benchmarkCommand());

program.parse(process.argv);

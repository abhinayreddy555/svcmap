export * from './llm/types.js';
export * from './llm/claude.js';
export * from './llm/openai.js';
export * from './git/types.js';
export * from './git/github.js';

export function createLLMProvider(
  providerName: 'claude' | 'openai',
  config?: { extractionModel?: string; generationModel?: string },
) {
  switch (providerName) {
    case 'claude': {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error('ANTHROPIC_API_KEY environment variable not set');
      const { ClaudeProvider } = require('./llm/claude.js');
      return new ClaudeProvider(key, config);
    }
    case 'openai': {
      const key = process.env.OPENAI_API_KEY;
      if (!key) throw new Error('OPENAI_API_KEY environment variable not set');
      const { OpenAIProvider } = require('./llm/openai.js');
      return new OpenAIProvider(key, config);
    }
    default:
      throw new Error(`Unknown LLM provider: ${providerName}`);
  }
}

export function createGitProvider(providerName: 'github' | 'azure-devops') {
  switch (providerName) {
    case 'github': {
      const token = process.env.GITHUB_TOKEN;
      if (!token) throw new Error('GITHUB_TOKEN environment variable not set');
      const { GitHubProvider } = require('./git/github.js');
      return new GitHubProvider(token);
    }
    default:
      throw new Error(`Git provider not yet implemented: ${providerName}`);
  }
}

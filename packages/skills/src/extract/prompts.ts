import type { RawAssets, FileCategory } from '../types.js';

/** Per-file content cap to prevent a single massive file consuming an entire chunk */
const MAX_FILE_CHARS = 50_000;

/**
 * Format ALL matching files with no total budget cap.
 * Used by chunked extraction skills — the caller splits this into LLM-sized chunks.
 * Individual files are still capped at MAX_FILE_CHARS to skip generated/binary-like content.
 */
export function formatAllAssets(assets: RawAssets, categories: FileCategory[]): string {
  const relevant = assets.files.filter((f) => categories.includes(f.category));
  const header = `# Repository: ${assets.repo} (${assets.branch})\n`;
  const blocks = relevant.map(
    (f) => `\n### ${f.path}\n\`\`\`\n${f.content.slice(0, MAX_FILE_CHARS)}\n\`\`\`\n`,
  );
  return header + blocks.join('');
}

/** Filter assets to given categories and format as LLM-readable text */
export function formatAssets(assets: RawAssets, categories: FileCategory[], maxChars = 80_000): string {
  const relevant = assets.files.filter((f) => categories.includes(f.category));
  const chunks: string[] = [`# Repository: ${assets.repo} (${assets.branch})\n`];
  let total = chunks[0].length;

  for (let i = 0; i < relevant.length; i++) {
    const file = relevant[i];
    // Distribute remaining budget evenly across remaining files.
    // Floor at 2 KB so short files don't starve subsequent ones.
    // Cap at 16 KB so one giant file can't consume the whole budget.
    const filesRemaining = relevant.length - i;
    const perFileBudget = Math.min(16_000, Math.max(2_000, Math.floor((maxChars - total) / filesRemaining)));
    const block = `\n### ${file.path}\n\`\`\`\n${file.content.slice(0, perFileBudget)}\n\`\`\`\n`;
    if (total + block.length > maxChars) break;
    chunks.push(block);
    total += block.length;
  }
  return chunks.join('');
}

export const JSON_SYSTEM = `You are a senior software architect analysing a codebase.
Output ONLY valid JSON matching the schema provided. No prose, no markdown, no explanation.
If information is not present in the code, use null or empty arrays — never hallucinate.
Be precise and factual. Infer from what is explicitly in the code.`;

export function jsonUserPrompt(schema: string, content: string, instruction: string): string {
  return `${instruction}

Output schema (output ONLY this JSON, nothing else):
${schema}

Code to analyse:
${content}`;
}

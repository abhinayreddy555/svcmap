// Types & utilities
export * from './types.js';

// Crawl skills
export * from './crawl/CrawlRepo.js';

// Extraction skills
export * from './extract/ExtractServiceIdentity.js';
export * from './extract/ExtractAPIContracts.js';
export * from './extract/ExtractDependencies.js';
export * from './extract/ExtractScenarios.js';
export * from './extract/ExtractDataModel.js';
export * from './extract/ExtractConfig.js';
export * from './extract/ExtractErrors.js';
export * from './extract/ExtractTableUsage.js';
export * from './extract/ExtractCodingStandards.js';
export * from './extract/ExtractRunbookSignals.js';
export * from './extract/ExtractModuleGraph.js';
export * from './extract/ExtractBusinessRules.js';

// Generation skills
export * from './generate/GenerateDocument.js';
export * from './generate/BuildWikiIndex.js';
export * from './generate/GenerateProductOverview.js';
export * from './generate/GenerateDataFlow.js';

// Skill registry
export const ALL_EXTRACTION_SKILLS = [
  'ExtractServiceIdentity',
  'ExtractAPIContracts',
  'ExtractDependencies',
  'ExtractScenarios',
  'ExtractDataModel',
  'ExtractConfig',
  'ExtractErrors',
  'ExtractTableUsage',
  'ExtractCodingStandards',
  'ExtractRunbookSignals',
] as const;

export const ALL_DOC_TYPES = [
  'OVERVIEW',
  'API',
  'SCENARIOS',
  'DEPENDENCIES',
  'DATA_MODEL',
  'TABLE_MAP',
  'CONFIG',
  'ERRORS',
  'CODING_STANDARDS',
  'RUNBOOK',
] as const;

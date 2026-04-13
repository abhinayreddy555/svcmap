"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SvcMapConfigSchema = void 0;
exports.findConfigPath = findConfigPath;
exports.loadConfig = loadConfig;
exports.writeConfig = writeConfig;
const zod_1 = require("zod");
const js_yaml_1 = __importDefault(require("js-yaml"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
// ─── Schema ──────────────────────────────────────────────────────────────────
const ServiceConfigSchema = zod_1.z.object({
    repo: zod_1.z.string().describe('org/repo-name'),
    branch: zod_1.z.string().default('main'),
    type: zod_1.z.enum(['api', 'ui', 'batch', 'worker', 'library']).optional(),
    extra_docs: zod_1.z.array(zod_1.z.string()).optional(),
    exclude_paths: zod_1.z.array(zod_1.z.string()).optional(),
    include_paths: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.SvcMapConfigSchema = zod_1.z.object({
    version: zod_1.z.literal('1'),
    product: zod_1.z.object({
        name: zod_1.z.string(),
        slug: zod_1.z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase with hyphens only'),
        description: zod_1.z.string(),
        owners: zod_1.z.array(zod_1.z.object({ team: zod_1.z.string(), contact: zod_1.z.string() })).optional(),
    }),
    knowledge_base: zod_1.z.object({
        output_dir: zod_1.z.string().default('./knowledge'),
        commit_to_repo: zod_1.z.boolean().default(false),
        gitignore_extracted: zod_1.z.boolean().default(true),
    }),
    provider: zod_1.z.object({
        git: zod_1.z.enum(['github', 'azure-devops']),
        organisation: zod_1.z.string(),
        project: zod_1.z.string().optional(),
    }),
    llm: zod_1.z.object({
        provider: zod_1.z.enum(['claude', 'openai', 'vertex']).default('claude'),
        generation_model: zod_1.z.string().optional(),
        extraction_model: zod_1.z.string().optional(),
        temperature: zod_1.z.number().default(0.2),
    }),
    services: zod_1.z.record(zod_1.z.string(), ServiceConfigSchema),
    generation: zod_1.z.object({
        parallelism: zod_1.z.number().default(3),
        retry_attempts: zod_1.z.number().default(2),
        documents: zod_1.z.object({
            service: zod_1.z.object({
                overview: zod_1.z.boolean().default(true),
                api: zod_1.z.boolean().default(true),
                scenarios: zod_1.z.boolean().default(true),
                dependencies: zod_1.z.boolean().default(true),
                data_model: zod_1.z.boolean().default(true),
                table_map: zod_1.z.boolean().default(true),
                config: zod_1.z.boolean().default(true),
                errors: zod_1.z.boolean().default(true),
                coding_standards: zod_1.z.boolean().default(true),
                runbook: zod_1.z.boolean().default(true),
            }).default({}),
        }).default({}),
    }).default({}),
    hooks: zod_1.z.object({
        webhook_secret: zod_1.z.string().optional(),
        webhook_port: zod_1.z.number().default(3456),
        install_git_hooks: zod_1.z.boolean().default(false),
    }).optional(),
});
// ─── Config discovery & loading ───────────────────────────────────────────────
const CONFIG_SEARCH_PATHS = [
    './svcmap.config.yaml',
    './knowledge/meta/svcmap.config.yaml',
    './svcmap.config.yml',
];
function findConfigPath() {
    for (const p of CONFIG_SEARCH_PATHS) {
        if (fs_extra_1.default.existsSync(p))
            return path_1.default.resolve(p);
    }
    return null;
}
function loadConfig(configPath) {
    const filePath = configPath ?? findConfigPath();
    if (!filePath) {
        throw new Error(`No svcmap config found. Run 'svcmap init' to create one, or pass --config <path>.`);
    }
    if (!fs_extra_1.default.existsSync(filePath)) {
        throw new Error(`Config file not found: ${filePath}`);
    }
    const raw = js_yaml_1.default.load(fs_extra_1.default.readFileSync(filePath, 'utf8'));
    const result = exports.SvcMapConfigSchema.safeParse(raw);
    if (!result.success) {
        const issues = result.error.issues
            .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
            .join('\n');
        throw new Error(`Invalid svcmap config:\n${issues}`);
    }
    return result.data;
}
function writeConfig(config, outputPath) {
    fs_extra_1.default.ensureDirSync(path_1.default.dirname(outputPath));
    fs_extra_1.default.writeFileSync(outputPath, js_yaml_1.default.dump(config, { lineWidth: 120 }), 'utf8');
}
//# sourceMappingURL=schema.js.map
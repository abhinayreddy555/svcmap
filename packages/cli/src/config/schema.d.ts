import { z } from 'zod';
declare const ServiceConfigSchema: z.ZodObject<{
    repo: z.ZodString;
    branch: z.ZodDefault<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["api", "ui", "batch", "worker", "library"]>>;
    extra_docs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    exclude_paths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    include_paths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    repo: string;
    branch: string;
    type?: "api" | "ui" | "batch" | "worker" | "library" | undefined;
    extra_docs?: string[] | undefined;
    exclude_paths?: string[] | undefined;
    include_paths?: string[] | undefined;
}, {
    repo: string;
    branch?: string | undefined;
    type?: "api" | "ui" | "batch" | "worker" | "library" | undefined;
    extra_docs?: string[] | undefined;
    exclude_paths?: string[] | undefined;
    include_paths?: string[] | undefined;
}>;
export declare const SvcMapConfigSchema: z.ZodObject<{
    version: z.ZodLiteral<"1">;
    product: z.ZodObject<{
        name: z.ZodString;
        slug: z.ZodString;
        description: z.ZodString;
        owners: z.ZodOptional<z.ZodArray<z.ZodObject<{
            team: z.ZodString;
            contact: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            team: string;
            contact: string;
        }, {
            team: string;
            contact: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        slug: string;
        description: string;
        owners?: {
            team: string;
            contact: string;
        }[] | undefined;
    }, {
        name: string;
        slug: string;
        description: string;
        owners?: {
            team: string;
            contact: string;
        }[] | undefined;
    }>;
    knowledge_base: z.ZodObject<{
        output_dir: z.ZodDefault<z.ZodString>;
        commit_to_repo: z.ZodDefault<z.ZodBoolean>;
        gitignore_extracted: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        output_dir: string;
        commit_to_repo: boolean;
        gitignore_extracted: boolean;
    }, {
        output_dir?: string | undefined;
        commit_to_repo?: boolean | undefined;
        gitignore_extracted?: boolean | undefined;
    }>;
    provider: z.ZodObject<{
        git: z.ZodEnum<["github", "azure-devops"]>;
        organisation: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        git: "github" | "azure-devops";
        organisation: string;
        project?: string | undefined;
    }, {
        git: "github" | "azure-devops";
        organisation: string;
        project?: string | undefined;
    }>;
    llm: z.ZodObject<{
        provider: z.ZodDefault<z.ZodEnum<["claude", "openai", "vertex"]>>;
        generation_model: z.ZodOptional<z.ZodString>;
        extraction_model: z.ZodOptional<z.ZodString>;
        temperature: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        provider: "claude" | "openai" | "vertex";
        temperature: number;
        generation_model?: string | undefined;
        extraction_model?: string | undefined;
    }, {
        provider?: "claude" | "openai" | "vertex" | undefined;
        generation_model?: string | undefined;
        extraction_model?: string | undefined;
        temperature?: number | undefined;
    }>;
    services: z.ZodRecord<z.ZodString, z.ZodObject<{
        repo: z.ZodString;
        branch: z.ZodDefault<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<["api", "ui", "batch", "worker", "library"]>>;
        extra_docs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        exclude_paths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        include_paths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        repo: string;
        branch: string;
        type?: "api" | "ui" | "batch" | "worker" | "library" | undefined;
        extra_docs?: string[] | undefined;
        exclude_paths?: string[] | undefined;
        include_paths?: string[] | undefined;
    }, {
        repo: string;
        branch?: string | undefined;
        type?: "api" | "ui" | "batch" | "worker" | "library" | undefined;
        extra_docs?: string[] | undefined;
        exclude_paths?: string[] | undefined;
        include_paths?: string[] | undefined;
    }>>;
    generation: z.ZodDefault<z.ZodObject<{
        parallelism: z.ZodDefault<z.ZodNumber>;
        retry_attempts: z.ZodDefault<z.ZodNumber>;
        documents: z.ZodDefault<z.ZodObject<{
            service: z.ZodDefault<z.ZodObject<{
                overview: z.ZodDefault<z.ZodBoolean>;
                api: z.ZodDefault<z.ZodBoolean>;
                scenarios: z.ZodDefault<z.ZodBoolean>;
                dependencies: z.ZodDefault<z.ZodBoolean>;
                data_model: z.ZodDefault<z.ZodBoolean>;
                table_map: z.ZodDefault<z.ZodBoolean>;
                config: z.ZodDefault<z.ZodBoolean>;
                errors: z.ZodDefault<z.ZodBoolean>;
                coding_standards: z.ZodDefault<z.ZodBoolean>;
                runbook: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                api: boolean;
                overview: boolean;
                scenarios: boolean;
                dependencies: boolean;
                data_model: boolean;
                table_map: boolean;
                config: boolean;
                errors: boolean;
                coding_standards: boolean;
                runbook: boolean;
            }, {
                api?: boolean | undefined;
                overview?: boolean | undefined;
                scenarios?: boolean | undefined;
                dependencies?: boolean | undefined;
                data_model?: boolean | undefined;
                table_map?: boolean | undefined;
                config?: boolean | undefined;
                errors?: boolean | undefined;
                coding_standards?: boolean | undefined;
                runbook?: boolean | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            service: {
                api: boolean;
                overview: boolean;
                scenarios: boolean;
                dependencies: boolean;
                data_model: boolean;
                table_map: boolean;
                config: boolean;
                errors: boolean;
                coding_standards: boolean;
                runbook: boolean;
            };
        }, {
            service?: {
                api?: boolean | undefined;
                overview?: boolean | undefined;
                scenarios?: boolean | undefined;
                dependencies?: boolean | undefined;
                data_model?: boolean | undefined;
                table_map?: boolean | undefined;
                config?: boolean | undefined;
                errors?: boolean | undefined;
                coding_standards?: boolean | undefined;
                runbook?: boolean | undefined;
            } | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        parallelism: number;
        retry_attempts: number;
        documents: {
            service: {
                api: boolean;
                overview: boolean;
                scenarios: boolean;
                dependencies: boolean;
                data_model: boolean;
                table_map: boolean;
                config: boolean;
                errors: boolean;
                coding_standards: boolean;
                runbook: boolean;
            };
        };
    }, {
        parallelism?: number | undefined;
        retry_attempts?: number | undefined;
        documents?: {
            service?: {
                api?: boolean | undefined;
                overview?: boolean | undefined;
                scenarios?: boolean | undefined;
                dependencies?: boolean | undefined;
                data_model?: boolean | undefined;
                table_map?: boolean | undefined;
                config?: boolean | undefined;
                errors?: boolean | undefined;
                coding_standards?: boolean | undefined;
                runbook?: boolean | undefined;
            } | undefined;
        } | undefined;
    }>>;
    hooks: z.ZodOptional<z.ZodObject<{
        webhook_secret: z.ZodOptional<z.ZodString>;
        webhook_port: z.ZodDefault<z.ZodNumber>;
        install_git_hooks: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        webhook_port: number;
        install_git_hooks: boolean;
        webhook_secret?: string | undefined;
    }, {
        webhook_secret?: string | undefined;
        webhook_port?: number | undefined;
        install_git_hooks?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    version: "1";
    product: {
        name: string;
        slug: string;
        description: string;
        owners?: {
            team: string;
            contact: string;
        }[] | undefined;
    };
    knowledge_base: {
        output_dir: string;
        commit_to_repo: boolean;
        gitignore_extracted: boolean;
    };
    provider: {
        git: "github" | "azure-devops";
        organisation: string;
        project?: string | undefined;
    };
    llm: {
        provider: "claude" | "openai" | "vertex";
        temperature: number;
        generation_model?: string | undefined;
        extraction_model?: string | undefined;
    };
    services: Record<string, {
        repo: string;
        branch: string;
        type?: "api" | "ui" | "batch" | "worker" | "library" | undefined;
        extra_docs?: string[] | undefined;
        exclude_paths?: string[] | undefined;
        include_paths?: string[] | undefined;
    }>;
    generation: {
        parallelism: number;
        retry_attempts: number;
        documents: {
            service: {
                api: boolean;
                overview: boolean;
                scenarios: boolean;
                dependencies: boolean;
                data_model: boolean;
                table_map: boolean;
                config: boolean;
                errors: boolean;
                coding_standards: boolean;
                runbook: boolean;
            };
        };
    };
    hooks?: {
        webhook_port: number;
        install_git_hooks: boolean;
        webhook_secret?: string | undefined;
    } | undefined;
}, {
    version: "1";
    product: {
        name: string;
        slug: string;
        description: string;
        owners?: {
            team: string;
            contact: string;
        }[] | undefined;
    };
    knowledge_base: {
        output_dir?: string | undefined;
        commit_to_repo?: boolean | undefined;
        gitignore_extracted?: boolean | undefined;
    };
    provider: {
        git: "github" | "azure-devops";
        organisation: string;
        project?: string | undefined;
    };
    llm: {
        provider?: "claude" | "openai" | "vertex" | undefined;
        generation_model?: string | undefined;
        extraction_model?: string | undefined;
        temperature?: number | undefined;
    };
    services: Record<string, {
        repo: string;
        branch?: string | undefined;
        type?: "api" | "ui" | "batch" | "worker" | "library" | undefined;
        extra_docs?: string[] | undefined;
        exclude_paths?: string[] | undefined;
        include_paths?: string[] | undefined;
    }>;
    generation?: {
        parallelism?: number | undefined;
        retry_attempts?: number | undefined;
        documents?: {
            service?: {
                api?: boolean | undefined;
                overview?: boolean | undefined;
                scenarios?: boolean | undefined;
                dependencies?: boolean | undefined;
                data_model?: boolean | undefined;
                table_map?: boolean | undefined;
                config?: boolean | undefined;
                errors?: boolean | undefined;
                coding_standards?: boolean | undefined;
                runbook?: boolean | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    hooks?: {
        webhook_secret?: string | undefined;
        webhook_port?: number | undefined;
        install_git_hooks?: boolean | undefined;
    } | undefined;
}>;
export type SvcMapConfig = z.infer<typeof SvcMapConfigSchema>;
export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;
export declare function findConfigPath(): string | null;
export declare function loadConfig(configPath?: string): SvcMapConfig;
export declare function writeConfig(config: SvcMapConfig, outputPath: string): void;
export {};
//# sourceMappingURL=schema.d.ts.map
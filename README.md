# svcmap

**Generate a living knowledge base from your git repos. Serve it as an MCP server so Claude, Copilot, and any AI agent can answer questions about your codebase without reading raw source code.**

---

## Why

When an AI agent answers a question about your service, it either:

- **Reads the raw source code** — scans hundreds of files, uses 50–150K tokens per question, misses context that spans multiple files, and costs money every single time.
- **Uses svcmap docs** — reads one focused Markdown document (2–5K tokens), gets structured facts with Mermaid diagrams and cross-references, and answers instantly from a local MCP tool.

svcmap generates structured documentation — API contracts, execution scenarios with sequence diagrams, dependency graphs, data models, runbooks — and serves them through an MCP server that any AI assistant can query.

---

## Quick start

```bash
# 1. Install
npm install -g svcmap   # or: node svcmap.js if running from source

# 2. Bootstrap a knowledge base (accepts GitHub URLs)
svcmap init

# 3. Fill in your API keys
#    knowledge/meta/.env:
#      ANTHROPIC_API_KEY=sk-ant-...
#      GITHUB_TOKEN=ghp_...

# 4. Generate docs
svcmap generate

# 5. Start the MCP server
svcmap serve
```

---

## How it works

```
GitHub repos
    │
    ▼
[CrawlRepo]  ──── up to 300 files per service, prioritised by category
    │
    ▼
[Extract]  ──── 10 parallel LLM passes per service
    │             Identity · API Contracts · Scenarios · Dependencies
    │             Data Model · DTOs · Config · Errors · Table Map
    │             Coding Standards · Runbook Signals
    ▼
[Generate]  ──── one document per extraction, 20K token budget
    │             OVERVIEW · API · SCENARIOS · DEPENDENCIES · DATA_MODEL
    │             TABLE_MAP · CONFIG · ERRORS · CODING_STANDARDS · RUNBOOK
    ▼
[ProductAgent]  ── PRODUCT.md (service map + Mermaid dependency graph)
    │              INDEX.md (semantic router for agents)
    ▼
[MCP Server]  ──── tools: find_service · get_service_doc · list_services
                          get_table · search_index · get_dependencies
```

---

## Supported repo formats

svcmap accepts any GitHub URL format:

```bash
# Standard repo
https://github.com/myorg/payment-service

# Monorepo subdirectory — sets include_paths and branch automatically
https://github.com/myorg/monorepo/tree/main/services/payment

# Shorthand
myorg/payment-service
```

Pass these during `svcmap init` or write them directly in `svcmap.config.yaml`.

---

## Config file

`knowledge/meta/svcmap.config.yaml`:

```yaml
version: '1'

product:
  name: My Platform
  slug: my-platform
  description: >-
    Payments and user management backend.

knowledge_base:
  output_dir: ./knowledge

provider:
  git: github

llm:
  provider: claude       # or: openai
  temperature: 0.2

services:
  payment:
    repo: myorg/payment-service
    branch: main

  customers:
    repo: myorg/monorepo
    branch: main
    include_paths:
      - services/customers/   # monorepo subdirectory

  frontend:
    repo: myorg/frontend
    branch: main
    type: ui

generation:
  parallelism: 3
  documents:
    service:
      overview: true
      api: true
      scenarios: true
      dependencies: true
      data_model: true
      table_map: false       # disable per doc type
      config: true
      errors: true
      coding_standards: true
      runbook: true
```

---

## CLI commands

| Command | Description |
|---|---|
| `svcmap init` | Interactive setup — accepts GitHub URLs, creates config + .env template |
| `svcmap generate` | Crawl repos, extract, and generate all docs |
| `svcmap generate --service <name>` | Regenerate a single service |
| `svcmap generate --dry-run` | Show what would be generated without writing files |
| `svcmap generate --save-extractions` | Write raw extraction JSON to `meta/extracted/` for debugging |
| `svcmap status` | Show which services have stale docs (behind latest commit) |
| `svcmap serve` | Start the MCP server (stdio transport) |

---

## MCP server

The MCP server exposes tools and prompts that agents can call:

**Tools**

| Tool | What it does |
|---|---|
| `find_service` | Find which service owns a feature, endpoint, or table |
| `get_service_doc` | Get a specific doc (OVERVIEW, API, SCENARIOS, etc.) for a service |
| `list_services` | List all services with summaries |
| `get_table` | Get schema and ownership for a specific database table |
| `search_index` | Semantic search across the knowledge base |
| `get_dependencies` | Get the dependency graph for a service |

**Prompts**

| Prompt | Useful for |
|---|---|
| `investigate-bug` | Structured debugging workflow across services |
| `explain-feature` | Trace how a feature works end-to-end |
| `onboard-service` | Get up to speed on a service quickly |
| `impact-analysis` | Understand blast radius of a change |
| `review-pr` | Get context before reviewing a pull request |

### Connect to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "svcmap": {
      "command": "node",
      "args": ["/absolute/path/to/svcmap.js", "serve"]
    }
  }
}
```

### Connect to VS Code (Copilot)

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "svcmap": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/svcmap.js", "serve"]
    }
  }
}
```

---

## Generated knowledge base structure

```
knowledge/
  INDEX.md                          ← semantic router — agents start here
  products/
    my-platform/
      PRODUCT.md                    ← product overview, service map, dependency graph
      services/
        payment/
          OVERVIEW.md               ← purpose, entry points, key abstractions
          API.md                    ← all endpoints with request/response shapes
          SCENARIOS.md              ← execution paths with Mermaid sequence diagrams
          DEPENDENCIES.md           ← outbound calls, databases, third-party
          DATA_MODEL.md             ← DB entities + DTOs + request/response objects
          TABLE_MAP.md              ← which tables this service owns/reads
          CONFIG.md                 ← env vars, feature flags, deployment notes
          ERRORS.md                 ← error catalogue with recovery hints
          CODING_STANDARDS.md       ← architecture patterns, conventions
          RUNBOOK.md                ← health checks, failure modes, rollback steps
  meta/
    svcmap.config.yaml
    .env                            ← gitignored
    checksums.json                  ← tracks HEAD SHA per service for staleness detection
    extracted/                      ← raw extraction JSON (--save-extractions only)
```

---

## Monorepo support

Point svcmap at any subdirectory of a monorepo by pasting the GitHub tree URL:

```
svcmap init

? Repository URLs: https://github.com/spring-petclinic/spring-petclinic-microservices/tree/main/spring-petclinic-customers-service,
                   https://github.com/spring-petclinic/spring-petclinic-microservices/tree/main/spring-petclinic-vets-service,
                   https://github.com/spring-petclinic/spring-petclinic-microservices/tree/main/spring-petclinic-visits-service

  Services configured:
    • spring-petclinic-customers-service  →  github.com/spring-petclinic/spring-petclinic-microservices (spring-petclinic-customers-service/)
    • spring-petclinic-vets-service       →  github.com/spring-petclinic/spring-petclinic-microservices (spring-petclinic-vets-service/)
    • spring-petclinic-visits-service     →  github.com/spring-petclinic/spring-petclinic-microservices (spring-petclinic-visits-service/)
```

Each service is crawled with `include_paths` scoped to its subdirectory. The same monorepo is fetched once per service (caching planned).

---

## Requirements

- Node.js ≥ 20
- An Anthropic API key (`sk-ant-...`) or OpenAI API key
- A GitHub personal access token with `read:contents` scope (no other scopes needed for public repos)

---

## Packages

| Package | Description |
|---|---|
| `@svcmap/cli` | CLI commands: init, generate, status, serve |
| `@svcmap/agents` | ProductAgent and ServiceAgent orchestration |
| `@svcmap/skills` | Extraction and generation skills (LLM prompts + schemas) |
| `@svcmap/providers` | LLM (Claude, OpenAI) and Git (GitHub) provider adapters |
| `@svcmap/mcp-server` | MCP server with tools and prompts |
| `@svcmap/config` | Config schema, loading, and URL parsing |

---

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run CLI from source
node svcmap.js <command>

# Watch mode for a package
pnpm --filter @svcmap/skills dev
```

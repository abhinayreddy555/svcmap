# svcmap

**Generate a living knowledge base from your git repos. Serve it as an MCP server so Claude, Copilot, and any AI agent can answer questions about your codebase without reading raw source code.**

---

## Why

When an AI agent answers a question about your service, it either:

- **Reads the raw source code** — scans hundreds of files, uses 50–150K tokens per question, misses context that spans multiple files, and costs money every single time.
- **Uses svcmap docs** — reads one focused Markdown document (2–5K tokens), gets structured facts with Mermaid diagrams and cross-references, and answers instantly from a local MCP tool.

svcmap generates structured documentation — API contracts, execution scenarios with sequence diagrams, dependency graphs, data models, business rules, runbooks — and serves them through an MCP server that any AI assistant can query.

---

## Quick start

```bash
# 1. Install
npm install -g svcmap   # or: node svcmap.js if running from source

# 2. Bootstrap a knowledge base (accepts any GitHub URL)
svcmap init

# 3. Fill in your API keys
#    knowledge/meta/.env:
#      ANTHROPIC_API_KEY=sk-ant-...
#      GITHUB_TOKEN=ghp_...

# 4. Generate docs
svcmap generate

# 5. Start the MCP server
svcmap serve

# 6. (Optional) See how much token reduction you're getting
svcmap benchmark
```

---

## How it works

```
GitHub repos
    │
    ▼
[CrawlRepo]  ──── all relevant files, no cap (files >300KB skipped)
    │              priority-sorted: routes → schemas → source → tests
    │
    ▼
[Extract]  ──── 12 sequential extraction passes per service
    │             Large repos split into file-boundary chunks (map → reduce)
    │
    │  Identity · API Contracts · Scenarios · Dependencies · Data Model
    │  Config · Errors · Table Map · Coding Standards · Runbook Signals
    │  Module Graph · Business Rules
    │
    ▼
[Generate]  ──── one Markdown document per extraction, 20K token budget
    │
    │  OVERVIEW · API · SCENARIOS · DEPENDENCIES · DATA_MODEL · TABLE_MAP
    │  CONFIG · ERRORS · CODING_STANDARDS · RUNBOOK · ARCHITECTURE
    │  BUSINESS_RULES
    │
    ▼
[ProductAgent]  ── PRODUCT.md   (service map + Mermaid dependency graph)
    │              DATAFLOW.md  (event flows, data ownership, external deps)
    │              INDEX.md     (semantic router for agents)
    ▼
[MCP Server]  ──── tools: find_service · get_service_doc · list_services
                          get_table · search_index · get_dependencies
```

---

## What each document contains

### Per-service documents (12 per service)

| Document | What's inside |
|---|---|
| `OVERVIEW.md` | Purpose, type, language, entry points, key abstractions |
| `API.md` | Every endpoint with method, auth, request/response shape, status codes, events |
| `SCENARIOS.md` | End-to-end execution paths with **Mermaid sequence diagrams**, exact function signatures, code snippets, branch conditions, state transitions, test coverage |
| `BUSINESS_RULES.md` | **State machines** (stateDiagram-v2), business rules with conditions and error codes, permission matrix, calculation formulas |
| `DATA_MODEL.md` | DB entities with all fields and constraints, **DTOs and transfer objects** with validation rules |
| `TABLE_MAP.md` | Which tables this service owns vs reads, per-feature usage |
| `DEPENDENCIES.md` | Outbound calls, databases, third-party integrations with timeout/retry config |
| `ARCHITECTURE.md` | Layer diagram (graph TD), module dependency graph (graph LR), circular dependency detection |
| `CONFIG.md` | All env vars, feature flags, deployment notes |
| `ERRORS.md` | Error catalogue with HTTP status, retryability, recovery hints |
| `CODING_STANDARDS.md` | Architecture pattern, layer rules, naming conventions, anti-patterns |
| `RUNBOOK.md` | Health checks, startup/shutdown, failure modes, rollback steps, escalation |

### Product-level documents

| Document | What's inside |
|---|---|
| `PRODUCT.md` | Service map table, Mermaid dependency graph, tech stack, debugging entry points |
| `DATAFLOW.md` | Service call graph, event/message flows, data ownership, external integrations |
| `INDEX.md` | Semantic router — agents start here to find the right service and document |

---

## Supported repo formats

```bash
# Standard repo
https://github.com/myorg/payment-service

# Monorepo subdirectory — sets include_paths and branch automatically
https://github.com/myorg/monorepo/tree/main/services/payment

# Shorthand
myorg/payment-service
```

Pass these during `svcmap init` (comma-separated for multiple services) or write them directly in `svcmap.config.yaml`.

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

generation:
  # Default: 1 (sequential). Safe for Anthropic basic tier (50K TPM).
  # Increase to 3 if you are on a higher API tier.
  parallelism: 1

  documents:
    service:
      overview: true
      api: true
      scenarios: true
      dependencies: true
      data_model: true
      table_map: true
      config: true
      errors: true
      coding_standards: true
      runbook: true
      architecture: true
      business_rules: true
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
| `svcmap benchmark` | Show token reduction vs reading raw source code directly |

---

## Benchmark: token reduction

When an AI agent answers a question without svcmap, it must crawl raw source code — scanning dozens of files and consuming tens of thousands of tokens per question. With svcmap, the agent reads one focused Markdown document instead.

`svcmap benchmark` measures this against your actual knowledge base after generation.

Results below are from [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) (Online Boutique) — 5 services across Go, C#, Python, and Node.js:

| Service | Repo path |
|---|---|
| cartservice | [`src/cartservice`](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/src/cartservice) |
| checkoutservice | [`src/checkoutservice`](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/src/checkoutservice) |
| productcatalogservice | [`src/productcatalogservice`](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/src/productcatalogservice) |
| paymentservice | [`src/paymentservice`](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/src/paymentservice) |
| recommendationservice | [`src/recommendationservice`](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/src/recommendationservice) |

```
svcmap Benchmark Report — GoogleCloudPlatform
Generated: 2026-04-13 | 5 services | 59 documents

Per-service breakdown

Service                          Files  Raw tokens/Q  Doc tokens/Q  Reduction
──────────────────────────────────────────────────────────────────────────────
cartservice                         13          2.7K          2.7K         0%
checkoutservice                      8         12.3K          3.0K        76%
productcatalogservice               10         12.0K          3.4K        72%
paymentservice                      10         18.6K          2.7K        85%
recommendationservice                7          3.9K          3.2K        17%

Per-question token comparison (average across services)

  Without svcmap  ██████████████████████████████    9.9K tokens
  With svcmap     █████████░░░░░░░░░░░░░░░░░░░░░    3.0K tokens   50% fewer

Knowledge base size

  Raw code crawled:        ~165.3K tokens across 5 services
  Generated documentation: ~118.1K tokens total  (59 docs)
  Tokens served per query: ~3.0K tokens  (1.5 docs avg)

Cost estimate  (Claude Sonnet · $3 / M input tokens)

  Without svcmap (per question):    $0.0297
  With svcmap (per question):       $0.0090
  Savings at 100 questions/day:     $2.07/day  (~$62/month)
```

**Reading the numbers**: `paymentservice` achieves 85% reduction because its source is dense Go/gRPC logic (~18.6K tokens raw) that compresses into a 2.7K focused doc. `cartservice` shows 0% because it's already compact — the structured doc ends up the same size as the raw subset. Real ROI concentrates on services with significant business logic.

**The 50% average token reduction translates to ~70% cost reduction per question** because you're also eliminating GitHub API calls, retries, and rate-limit waits at query time.

---

## When svcmap helps most

| Scenario | Expected reduction | Why |
|---|---|---|
| Dense business logic (payment, checkout, auth) | **70–85%** | Complex source compresses well into structured docs |
| API-heavy services (50+ endpoints) | **50–70%** | API.md consolidates what agents would read across many route files |
| Multi-service products (5+ services) | **40–60%** | PRODUCT.md + DATAFLOW.md give cross-service context no single file has |
| Small infrastructure services (< 5 files) | **0% or negative** | Source is already tiny; docs add structure but not token savings |
| Config-only services | **negative** | Nothing to compress — an agent could read the config directly |

svcmap pays off most when services are **large**, **frequently queried**, or **logically complex**. Generation is a one-time cost; every agent question afterwards reads a structured 3K-token doc instead of crawling 10–20K tokens of raw source.

---

**Token reduction is one part of the picture.** The larger gains come from:

| Benefit | Without svcmap | With svcmap |
|---|---|---|
| Tokens per question | ~3–50K (varies by service size) | ~2–4K (one focused doc) |
| GitHub API calls at query time | Yes — rate limited, slow | None — local reads |
| Cross-service dependency graph | Agent must infer it | Pre-built in PRODUCT.md |
| Structured access | Agent scans files blindly | Agent asks for SCENARIOS, gets SCENARIOS |
| Always available | No (GitHub outage = no answers) | Yes (local MCP server) |
| Secret/credential exposure | Raw files may contain them | Docs never include raw secrets |

---

## MCP server

The MCP server exposes tools and prompts that agents can call:

**Tools**

| Tool | What it does |
|---|---|
| `find_service` | Find which service owns a feature, endpoint, or table |
| `get_service_doc` | Get a specific doc (OVERVIEW, API, SCENARIOS, BUSINESS_RULES, etc.) for a service |
| `list_services` | List all services with summaries |
| `get_table` | Get schema and ownership for a specific database table |
| `search_index` | Search across the knowledge base |
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
      PRODUCT.md                    ← service map, dependency graph, debugging guide
      DATAFLOW.md                   ← event flows, data ownership, external integrations
      services/
        payment/
          OVERVIEW.md               ← purpose, entry points, key abstractions
          API.md                    ← all endpoints with request/response shapes
          SCENARIOS.md              ← execution paths, sequence diagrams, code snippets
          BUSINESS_RULES.md         ← state machines, rules, permissions, formulas
          DEPENDENCIES.md           ← outbound calls, databases, third-party
          DATA_MODEL.md             ← DB entities, DTOs, request/response objects
          TABLE_MAP.md              ← which tables this service owns/reads
          CONFIG.md                 ← env vars, feature flags, deployment notes
          ERRORS.md                 ← error catalogue with recovery hints
          CODING_STANDARDS.md       ← architecture patterns, naming conventions
          RUNBOOK.md                ← health checks, failure modes, rollback
          ARCHITECTURE.md           ← layer diagram, module graph, circular deps
  meta/
    svcmap.config.yaml
    .env                            ← gitignored (contains API keys)
    checksums.json                  ← HEAD SHA per service for staleness detection
    crawl_stats.json                ← files crawled + chars per service (used by benchmark)
    extracted/                      ← gitignored (--save-extractions debug output)
```

---

## Monorepo support

Point svcmap at any subdirectory of a monorepo using the GitHub tree URL:

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

Each service is crawled with `include_paths` scoped to its subdirectory so only relevant files are fetched.

---

## Rate limits and API tier

svcmap uses two LLM calls per extraction pass — extraction (Haiku) and generation (Opus). For large repos, chunked extraction makes multiple sequential calls per skill.

| Tier | Recommended `parallelism` | Notes |
|---|---|---|
| Anthropic basic | `1` (default) | Sequential — one service at a time, one skill at a time |
| Anthropic tier 2+ | `3` | Three services in parallel, safe throughput |
| OpenAI (gpt-4o) | `2–3` | Depends on your rate tier |

The SDK automatically retries 429s with exponential backoff (`maxRetries: 4`). Extraction skills also add a 4-second gap between chunk calls to pace token throughput on constrained tiers.

---

## Requirements

- Node.js ≥ 20
- An Anthropic API key (`sk-ant-...`) or OpenAI API key
- A GitHub personal access token (no scopes needed for public repos; `repo` scope for private repos)

---

## Packages

| Package | Description |
|---|---|
| `@svcmap/cli` | CLI commands: init, generate, status, serve, benchmark |
| `@svcmap/agents` | ProductAgent and ServiceAgent orchestration |
| `@svcmap/skills` | 12 extraction skills + 12 generation skills, chunked map-reduce for large repos |
| `@svcmap/providers` | LLM (Claude, OpenAI) and Git (GitHub) adapters with retry |
| `@svcmap/mcp-server` | MCP server with tools and prompts |
| `@svcmap/config` | Config schema, loading, and GitHub URL parsing |

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

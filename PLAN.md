# svcmap — Knowledge Server: Requirements & Implementation Plan

> **Status:** Draft v2.0 | **Date:** 2026-04-11  
> **Audience:** Engineering Leads, Architects, POs, Contributors

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Non-Goals](#3-goals--non-goals)
4. [System Architecture](#4-system-architecture)
5. [Core Components](#5-core-components)
   - 5.1 [CLI Tool — `svcmap`](#51-cli-tool--svcmap)
   - 5.2 [Repository Crawler Engine](#52-repository-crawler-engine)
   - 5.3 [Knowledge Extractor & Analyzer](#53-knowledge-extractor--analyzer)
   - 5.4 [Documentation Generator](#54-documentation-generator)
   - 5.5 [Wiki & Index System — Karpathy Strategy](#55-wiki--index-system--karpathy-strategy)
   - 5.6 [MCP Server](#56-mcp-server)
   - 5.7 [Skills & Agent Architecture](#57-skills--agent-architecture)
   - 5.8 [Diff-Based Regeneration & Hook System](#58-diff-based-regeneration--hook-system)
6. [Knowledge Schema Design](#6-knowledge-schema-design)
   - 6.1 [Product-Level Knowledge](#61-product-level-knowledge)
   - 6.2 [Service-Level Knowledge](#62-service-level-knowledge)
   - 6.3 [Output File Structure](#63-output-file-structure)
7. [Configuration Design](#7-configuration-design)
8. [Implementation Phases](#8-implementation-phases)
9. [Technical Stack](#9-technical-stack)
10. [Open Questions & Future Decisions](#10-open-questions--future-decisions)
11. [Success Criteria](#11-success-criteria)
12. [Future Phases Roadmap](#12-future-phases-roadmap)
7. [Configuration Design](#7-configuration-design)
8. [Implementation Phases](#8-implementation-phases)
9. [Technical Stack](#9-technical-stack)
10. [Open Questions & Future Decisions](#10-open-questions--future-decisions)
11. [Success Criteria](#11-success-criteria)

---

## 1. Executive Summary

**svcmap** is an open-source CLI tool and MCP server that automatically generates a living, structured knowledge base from source code repositories. It targets engineering teams working across GitHub and Azure DevOps where knowledge is locked inside code, PRs, and tribal memory — invisible to Agents, Product Owners, and new engineers.

Given one or more repository names, svcmap:
1. Crawls the repositories (code, configs, API specs, existing docs)
2. Extracts structured knowledge using an LLM provider (Claude, GitHub Copilot/OpenAI, Vertex — pluggable)
3. Generates two tiers of Markdown documentation: **Product-level** (high-level, PO-friendly) and **Service-level** (deep technical, agent/engineer-friendly)
4. Organises everything into a wiki with a navigable index (inspired by Karpathy's LLM wiki concept)
5. Exposes the full knowledge base via an **MCP server**, making it immediately available to Claude, GitHub Copilot, and any MCP-compatible agent

The system is **diff-aware** — it hooks into git events and only regenerates the documentation for services that have meaningfully changed, making it fast and practical at scale.

---

## 2. Problem Statement

### The Knowledge Gap

Modern software products span dozens of services, owned by multiple teams, documented sporadically. The result:

| Who | Pain |
|-----|------|
| **New engineers** | Weeks to understand how services connect; no single source of truth |
| **Product Owners** | Cannot describe system behaviour without asking an engineer |
| **AI Agents (Claude, Copilot)** | No domain context → generic, often wrong answers |
| **On-call engineers** | No low-level scenario maps to guide incident response |
| **Architects** | Dependency maps live in someone's head or a stale Confluence page |

### Why Existing Solutions Fall Short

- **Confluence / Notion**: Manual, stale immediately, no code awareness
- **OpenAPI / AsyncAPI specs**: Only covers API surfaces, not behaviour or data flow
- **README files**: Inconsistent, incomplete, not cross-linked
- **Architecture diagrams**: High-level only, quickly outdated
- **LLM chat over codebase**: No structured memory, answers not reusable, no MCP interface

### The Opportunity

If you could point a tool at a set of repositories and get back a richly structured, always-current, MCP-accessible knowledge base — usable by humans and agents alike — you eliminate that gap.

---

## 3. Goals & Non-Goals

### Goals

- [x] CLI-first, self-hostable, open source
- [x] Support GitHub and Azure DevOps as source systems
- [x] Pluggable LLM providers: Claude (primary), GitHub Copilot/OpenAI (secondary), Vertex (tertiary)
- [x] Two-tier documentation: Product-level and Service-level
- [x] Wiki-style index for navigation by humans and agents
- [x] MCP server exposing the full knowledge base as resources and tools
- [x] Diff-based selective regeneration triggered by git hooks/webhooks
- [x] User can supply existing documentation to augment generated content
- [x] Configurable output location: existing repo/folder or a new dedicated folder
- [x] Scale target: up to **50 services** per product
- [x] Service types supported: UI (React/Vue/Angular), Web Services (REST/GraphQL/gRPC), Batch/Worker processes
- [x] Database / table catalog at product level and per-service table map
- [x] Coding standards documentation at product level and per-service level
- [x] Runbooks at product level (cross-service ops) and per-service level (on-call guide)
- [x] Skill & Agent architecture — LLM operations are reusable Skills, composable by Agents, and individually invokable via MCP

### Non-Goals (v1)

- [ ] Real-time streaming regeneration on every commit (diff-gated only)
- [ ] Built-in vector store / RAG pipeline (wiki index covers navigation; RAG is a future layer)
- [ ] Diagramming / Mermaid auto-generation (noted as future enhancement)
- [ ] Multi-tenant SaaS offering (open source first, internal deployments second)
- [ ] Language-specific deep static analysis (relies on LLM-based understanding, not AST parsers)
- [ ] UI dashboard (CLI + MCP is the interface; web UI is future)

---

## 4. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          USER / AGENT LAYER                              │
│                                                                          │
│  ┌──────────────┐   ┌────────────────────┐   ┌──────────────────────┐   │
│  │  Claude      │   │  GitHub Copilot    │   │  Any MCP Client      │   │
│  │  (Desktop/   │   │  (VS Code)         │   │  (future)            │   │
│  │   API)       │   │                    │   │                      │   │
│  └──────┬───────┘   └────────┬───────────┘   └──────────┬───────────┘   │
│         └──────────────────┬─┘                           │               │
│                            │    MCP Protocol             │               │
└────────────────────────────┼─────────────────────────────┼───────────────┘
                             │                             │
┌────────────────────────────▼─────────────────────────────▼───────────────┐
│                         MCP SERVER LAYER                                  │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │  svcmap MCP Server                                              │    │
│   │  ┌──────────────┐  ┌─────────────────┐  ┌───────────────────┐  │    │
│   │  │  Resources   │  │  Tools          │  │  Prompts          │  │    │
│   │  │  (MD files   │  │  (search, nav,  │  │  (pre-built       │  │    │
│   │  │   as URIs)   │  │   query index)  │  │   agent prompts)  │  │    │
│   │  └──────────────┘  └─────────────────┘  └───────────────────┘  │    │
│   └─────────────────────────────────────────────────────────────────┘    │
│                                │                                         │
└────────────────────────────────┼─────────────────────────────────────────┘
                                 │  reads from
┌────────────────────────────────▼─────────────────────────────────────────┐
│                       KNOWLEDGE STORE LAYER                               │
│                                                                          │
│   ┌────────────────────────────────────────────────────────────────┐     │
│   │  knowledge/                                                    │     │
│   │  ├── INDEX.md                  ← root wiki index               │     │
│   │  ├── products/                                                 │     │
│   │  │   └── {product-name}/                                       │     │
│   │  │       ├── PRODUCT.md        ← high-level product doc        │     │
│   │  │       ├── DATA_FLOW.md      ← end-to-end data flow          │     │
│   │  │       ├── API_SURFACE.md    ← all public APIs               │     │
│   │  │       ├── DEPENDENCIES.md   ← product dependency map        │     │
│   │  │       └── services/                                         │     │
│   │  │           └── {service-name}/                               │     │
│   │  │               ├── OVERVIEW.md    ← what it does             │     │
│   │  │               ├── SCENARIOS.md   ← scenario walkthroughs    │     │
│   │  │               ├── API.md         ← endpoints/contracts      │     │
│   │  │               ├── DEPENDENCIES.md← inbound/outbound deps    │     │
│   │  │               ├── DATA_MODEL.md  ← key entities/schemas     │     │
│   │  │               ├── CONFIG.md      ← env vars, feature flags  │     │
│   │  │               └── ERRORS.md      ← error codes, states      │     │
│   │  └── meta/                                                     │     │
│   │      ├── svcmap.config.yaml    ← product configuration         │     │
│   │      └── checksums.json        ← diff tracking state           │     │
│   └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │  written by
┌────────────────────────────────▼─────────────────────────────────────────┐
│                      GENERATION ENGINE LAYER                              │
│                                                                          │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────────────┐  │
│  │  Repo Crawler    │  │  Knowledge      │  │  Doc Generator         │  │
│  │  - Git checkout  │  │  Extractor      │  │  - Template engine     │  │
│  │  - File walker   │  │  - Code parser  │  │  - LLM prompts         │  │
│  │  - Asset indexer │  │  - Dep resolver │  │  - MD writer           │  │
│  └────────┬─────────┘  └────────┬────────┘  └────────────┬───────────┘  │
│           └──────────────────────┼─────────────────────────┘             │
│                                  │                                        │
│  ┌───────────────────────────────▼────────────────────────────────────┐  │
│  │  LLM Provider Abstraction                                          │  │
│  │  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │  │
│  │  │  Claude     │  │  OpenAI /        │  │  Vertex AI           │  │  │
│  │  │  (Anthropic)│  │  GitHub Copilot  │  │  (Google)            │  │  │
│  │  └─────────────┘  └──────────────────┘  └──────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │  triggered by
┌────────────────────────────────▼─────────────────────────────────────────┐
│                         TRIGGER LAYER                                     │
│                                                                          │
│  ┌────────────────────┐   ┌──────────────────┐   ┌──────────────────┐   │
│  │  CLI (svcmap)      │   │  Git Hooks       │   │  Webhooks        │   │
│  │  - init            │   │  (post-merge,    │   │  (GitHub/Azure   │   │
│  │  - generate        │   │   post-receive)  │   │   DevOps push    │   │
│  │  - update          │   │                  │   │   events)        │   │
│  │  - serve           │   └──────────────────┘   └──────────────────┘   │
│  └────────────────────┘                                                  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Core Components

### 5.1 CLI Tool — `svcmap`

The CLI is the primary human interface. It is structured as a command tree.

#### Command Structure

```
svcmap
├── init                    # Bootstrap a new knowledge base for a product
├── generate                # Full generation (all services)
├── update [service?]       # Diff-based selective regeneration
├── serve                   # Start the MCP server
├── status                  # Show which services are stale
├── config                  # View / edit current config
└── validate                # Validate config and repo access before running
```

#### `svcmap init` — Interactive Bootstrap

When a user runs `svcmap init`, they are walked through an interactive wizard:

```
$ svcmap init

? What is the product name?  › Order Management Platform
? Product short description? › Handles end-to-end order lifecycle from placement to fulfilment
? Git provider?              › GitHub / Azure DevOps
? Organisation / project?    › myorg
? Paste repo names (comma-separated or one per line):
  › order-service
  › inventory-service
  › notification-service
  › order-ui

? Where should the knowledge base be generated?
  › (1) Inside this folder (./knowledge/)
  › (2) Inside an existing repo (I'll specify a path)
  › (3) Create a new dedicated repo

? Do you have existing documentation to include? (Confluence export, OpenAPI specs, ADRs)
  › Yes — paste paths or URLs

? Which LLM provider should be used for generation?
  › Claude (Anthropic) [recommended]
  › OpenAI / GitHub Copilot
  › Vertex AI (Google)

? API key / credentials for selected provider?  › [hidden input]

Initialising...
✓ Config written to ./knowledge/meta/svcmap.config.yaml
✓ Credentials stored in ./knowledge/meta/.env (gitignored)
✓ Run `svcmap validate` to verify repo access
✓ Run `svcmap generate` to build the knowledge base
```

**Key design decisions:**
- All inputs are validated before writing config
- Credentials never committed — `.env` is auto-added to `.gitignore`
- The wizard is re-runnable (idempotent); existing config values are shown as defaults
- `--non-interactive` flag accepts all inputs as flags for CI pipelines

---

### 5.2 Repository Crawler Engine

The crawler is responsible for extracting raw material from each repository. It uses the **GitHub MCP** and **Azure DevOps MCP** that users already have configured — it does not re-implement git auth. For local operations it does a shallow clone.

#### What the Crawler Collects

For each service repository, the crawler collects:

| Asset | How | Purpose |
|-------|-----|---------|
| **Directory tree** | File walk | Understand structure (layers, modules, packages) |
| **Entry points** | Detect `main.*`, `index.*`, `app.*`, `server.*`, `handler.*` | Understand how service starts |
| **API definitions** | Find `*.yaml`/`*.json` (OpenAPI), `*.proto` (gRPC), `*.graphql` | API surface |
| **Route files** | Detect framework-specific patterns (Express routes, FastAPI routers, Spring controllers) | Endpoint enumeration |
| **Config files** | `*.env*`, `application.yml`, `config.ts`, `settings.py` | Environment & feature flags |
| **Infrastructure** | `Dockerfile`, `docker-compose.*`, `k8s/`, `terraform/`, `helm/` | Deployment topology |
| **CI/CD** | `.github/workflows/`, `azure-pipelines.yml` | Pipeline & deploy gates |
| **Dependencies** | `package.json`, `requirements.txt`, `go.mod`, `pom.xml`, `*.csproj` | Tech stack & third-party deps |
| **Client calls** | Grep for `fetch(`, `axios.`, `HttpClient`, `requests.get`, SDK imports | Outbound API calls (dep detection) |
| **Event definitions** | Find queue/topic publishers and consumers | Async dependency map |
| **Existing docs** | `README.md`, `docs/`, user-supplied paths | Baseline knowledge |
| **Test files** | `*.test.*`, `*.spec.*`, `__tests__/` | Scenario discovery |
| **Error codes** | `throw new`, `raise`, `return error`, custom error classes | Error catalogue |
| **Database schemas** | Migration files, ORM models, `schema.prisma`, `*.sql` | Data model |

#### Crawl Strategy

```
1. Shallow clone main branch (depth=1) into a temp directory
2. Walk file tree, categorise each file by type
3. For large repos: apply include/exclude filters from config (gitignore-style)
4. Chunk collected content into LLM-friendly batches (stay within context limits)
5. Attach metadata: repo, service name, file path, last commit SHA for each chunk
6. Store raw extraction result as structured JSON (input to Knowledge Extractor)
7. Delete temp clone after extraction
```

#### Crawler Configuration (per service)

```yaml
# in svcmap.config.yaml
services:
  order-service:
    repo: myorg/order-service
    branch: main                         # override if not main
    include_paths:                       # optional: crawl only these paths
      - src/
      - api/
    exclude_paths:                       # always excluded
      - node_modules/
      - dist/
      - coverage/
    extra_docs:                          # user-supplied docs
      - ./existing-docs/order-adr.md
      - https://confluence.myorg.com/...  # future: Confluence fetcher
```

---

### 5.3 Knowledge Extractor & Analyzer

The Extractor takes raw crawl output and produces structured knowledge objects. This is where LLM intelligence is applied in a controlled, prompt-engineered way.

#### Extraction Passes (run in sequence per service)

Each pass is a targeted LLM call with a specific extraction prompt. Passes are designed to be **narrow and focused** to keep outputs consistent.

```
Pass 1 — Service Identity
  Input : directory tree + entry points + README
  Output: service purpose, type (UI/API/Batch), primary language, framework

Pass 2 — API Surface
  Input : OpenAPI/proto/graphql specs + detected route files
  Output: structured list of endpoints (method, path, purpose, auth, request/response shape)

Pass 3 — Outbound Dependencies
  Input : client call sites + dependency files + config
  Output: list of {target service/API, type: REST/gRPC/queue/DB, purpose}

Pass 4 — Data Model
  Input : schema files + ORM models + migration files
  Output: key entities, their fields, relationships

Pass 5 — Scenario Discovery
  Input : test files + route handlers + service logic files
  Output: list of {scenario name, trigger, steps, outcome, error cases}

Pass 6 — Configuration & Feature Flags
  Input : env files + config files + infra files
  Output: {key, description, example value, required/optional}

Pass 7 — Error Catalogue
  Input : error definitions + throw/raise sites
  Output: {code/class, description, when it occurs, recovery hint}

Pass 8 — Database & Table Usage
  Input : migration files, ORM models, schema files, repository/DAO classes, SQL queries
  Output: {table name, owner service, columns with types, which features/endpoints use it,
           read/write access pattern, indexes, relationships to other tables}

Pass 9 — Coding Standards & Patterns
  Input : source files across multiple layers (routes, services, repos, utils),
          linting configs (.eslintrc, .pylintrc), any coding standards docs provided
  Output: {language conventions used, framework-specific patterns, naming conventions,
           error handling approach, logging patterns, auth patterns, anti-patterns found}

Pass 10 — Runbook Signals
  Input : CI/CD files, Dockerfiles, health check endpoints, k8s manifests, README ops sections,
          existing runbooks provided by user
  Output: {startup procedure, health check endpoints, shutdown procedure, common failure modes,
           dependency failure behaviour, environment-specific notes, rollback steps}

Pass 11 — Cross-Service Aggregation  (product-level, runs after all per-service passes)
  Input : all services' dependency maps + table ownership maps + API surfaces
  Output: complete adjacency graph {source, target, edge type, purpose},
          unified table catalog, aggregated API surface
```

#### Extraction Output Format

Each pass produces a JSON object stored in `knowledge/meta/extracted/{service}/{pass}.json`. This is the **ground truth** that the Doc Generator reads — it is separate from the final Markdown so regenerating docs does not require re-crawling.

---

### 5.4 Documentation Generator

The Doc Generator consumes extracted JSON objects and writes Markdown files. It uses **Handlebars-style templates** combined with **LLM narration passes** to produce readable prose.

#### Two-mode generation

| Mode | What it does | When used |
|------|--------------|-----------|
| **Template** | Fill structured data (tables, lists) from JSON | Fast, deterministic, for structured sections |
| **Narrative** | LLM writes explanatory prose from structured data | Slower, used for summary sections, scenario walkthroughs |

#### Generator Pipeline per Document

```
1. Load extracted JSON for the target document
2. Apply template to produce structural skeleton (tables, code blocks, lists)
3. For sections requiring prose: call LLM with structured data + context prompt
4. Merge template output + LLM prose into final Markdown
5. Inject cross-reference links (e.g. "See also: inventory-service/OVERVIEW.md")
6. Write to output path
7. Update checksums.json with file hash + source commit SHA
```

#### Prompt Engineering Principles for Generation

- Every LLM call includes a **system prompt** declaring the audience (agent vs. PO vs. engineer)
- Prompts include **existing documentation** as grounding context when provided
- Output is constrained to Markdown; no freeform prose outside headings
- A **self-critique pass** is run for product-level docs: the LLM reviews its own output for gaps
- All generated sections are tagged with `<!-- generated: {timestamp} {model} -->` comments for traceability

---

### 5.5 Wiki & Index System — Karpathy Strategy

The Karpathy LLM wiki concept recognises that LLMs navigate knowledge differently from humans. Humans browse, scroll, and skim. LLMs need to **route** — to find the right document in 1-2 hops using a semantic index, and then read self-contained documents that do not require reading adjacent files to be useful.

svcmap implements this with five concrete rules enforced at generation time.

---

#### Rule 1: The Index is a Semantic Router, Not a Table of Contents

`INDEX.md` is not just a list of links. It is the **decision layer** that tells an agent which document to read for a given question — without the agent having to read any document first.

Each entry combines: a link, a type tag, a technology tag, a capability summary, and routing hints.

```markdown
# svcmap Knowledge Base — Index

> **For agents:** Start here. Each entry below tells you what question that document answers.
> Navigate directly to the document that matches your query. Do not read everything.

---

## Products

### Order Management Platform
> Handles end-to-end order lifecycle from placement to fulfilment.
> **Read PRODUCT.md if:** you need to understand what the product does, which services exist, or how data flows.

- [PRODUCT.md](products/order-management/PRODUCT.md) — High-level product overview, feature list, service inventory
- [DATA_FLOW.md](products/order-management/DATA_FLOW.md) — End-to-end data flows, sequence narratives, async paths
- [API_SURFACE.md](products/order-management/API_SURFACE.md) — All public and internal APIs aggregated across services
- [DEPENDENCIES.md](products/order-management/DEPENDENCIES.md) — Service-to-service dependency graph, external integrations
- [DATABASE_CATALOG.md](products/order-management/DATABASE_CATALOG.md) — All databases, which service owns each, table→feature cross-reference
- [CODING_STANDARDS.md](products/order-management/CODING_STANDARDS.md) — Cross-service patterns, conventions, forbidden patterns
- [runbooks/](products/order-management/runbooks/) — Operational procedures, incident response, deployment sequences

#### Services in Order Management Platform

| Service | Type | Stack | Read this when... |
|---------|------|-------|-------------------|
| [order-service](products/order-management/services/order-service/OVERVIEW.md) | `REST API` | `Node.js` `PostgreSQL` | Working on order creation, state machine, or payment flow |
| [inventory-service](products/order-management/services/inventory-service/OVERVIEW.md) | `REST API` | `Python` `PostgreSQL` | Working on stock reservation or SKU management |
| [order-ui](products/order-management/services/order-ui/OVERVIEW.md) | `UI` | `React` `TypeScript` | Working on the customer-facing order flow |
| [fulfillment-batch](products/order-management/services/fulfillment-batch/OVERVIEW.md) | `Batch` | `Java` `Kafka` | Working on async order fulfilment processing |

---

## Quick Reference (cross-service lookups)

| Topic | Document | Use when... |
|-------|----------|-------------|
| All error codes | [ERRORS index](quick-ref/ALL_ERRORS.md) | Debugging a known error code across any service |
| All events/queues | [Events index](quick-ref/ALL_EVENTS.md) | Understanding what events exist and who produces/consumes them |
| All tables | [DATABASE_CATALOG](products/order-management/DATABASE_CATALOG.md) | Finding which service owns a table or which features touch a table |
| External integrations | [DEPENDENCIES](products/order-management/DEPENDENCIES.md) | Understanding third-party API dependencies |
| Runbooks | [runbooks/](products/order-management/runbooks/) | On-call incident response or deployment procedures |

---

## Meta

- **Last generated:** {timestamp}
- **Source commit:** {SHA per service}
- **How to regenerate:** `svcmap update` or push to main in any service repo
- **How to add a service:** Edit `svcmap.config.yaml` and re-run `svcmap generate`
```

---

#### Rule 2: Every Document Starts With a TL;DR Block for Agents

The first section of **every document** is a `## TL;DR for Agents` block — 3-5 bullet points maximum. This block contains the single most important facts that determine whether an agent should read this document or navigate elsewhere.

The TL;DR is generated with an explicit prompt instruction: *"Write this as if an agent has 2 seconds to decide whether this document is relevant to its task."*

```markdown
## TL;DR for Agents

- This service **owns** the order lifecycle state machine (PENDING → CONFIRMED → SHIPPED → DELIVERED)
- It **calls** inventory-service (stock reservation) and Stripe (payment); it does NOT handle fulfilment
- The **most common bug area** is the payment webhook handler (src/webhooks/payment.ts)
- **Database:** Owns the `orders` and `order_items` tables in orders-db (PostgreSQL)
- **If you're here for a bug:** Start with [SCENARIOS.md](SCENARIOS.md) — each scenario maps to exact file:line references
```

---

#### Rule 3: Documents Are Self-Contained

Every document must be useful without requiring the reader to open another document. This means:

- Key facts from parent documents are **summarised inline**, not just linked
- Dependency descriptions include purpose AND behaviour (not just the service name)
- Error entries include their recovery path, not just their definition

When a document references another, it includes a one-line summary of what that other document contains:

```markdown
See [inventory-service OVERVIEW](../inventory-service/OVERVIEW.md) — manages SKU stock levels and
handles reservation/release; called by order-service during order creation.
```

---

#### Rule 4: Bidirectional Links Are Enforced

Every relationship in the knowledge base is recorded from both sides. The linker (run after all docs are written) enforces this.

- If `order-service/DEPENDENCIES.md` lists `inventory-service` as an outbound call, then `inventory-service/DEPENDENCIES.md` must list `order-service` in its **Inbound Calls** section
- If `DATABASE_CATALOG.md` says `order-service` owns the `orders` table, then `order-service/TABLE_MAP.md` must list `orders` as an owned table
- Violations are reported by `svcmap status --check-links`

---

#### Rule 5: Consistent Structure Is Enforced By Template

Agents predict document structure. Every document of the same type has **identical heading order**. The doc generator uses locked templates — heading names and order are non-negotiable. This means an agent can say "Section 3 of any SCENARIOS.md is always the failure modes" without reading the document first.

```
OVERVIEW.md heading order (fixed):
  H2: TL;DR for Agents
  H2: Service Identity (table)
  H2: Responsibilities
  H2: Entry Points
  H2: What an Agent Needs to Know to Work on This Service
  H2: Related Documents

SCENARIOS.md heading order (fixed):
  H2: TL;DR for Agents
  H2: How to Read This Document
  H3: Scenario: {Name}         (repeating, one per scenario)
      H4: Steps
      H4: Success Outcome
      H4: Failure Modes
  H2: See Also
```

---

### 5.6 MCP Server

The MCP server makes the entire knowledge base accessible to any MCP-compatible agent (Claude Desktop, VS Code with Copilot, custom agents).

#### MCP Resource Endpoints

Resources map directly to the file structure:

```
knowledge://index                               → INDEX.md
knowledge://products/{product}                  → PRODUCT.md
knowledge://products/{product}/data-flow        → DATA_FLOW.md
knowledge://products/{product}/api-surface      → API_SURFACE.md
knowledge://products/{product}/dependencies     → DEPENDENCIES.md
knowledge://products/{product}/services/{svc}  → OVERVIEW.md
knowledge://products/{product}/services/{svc}/scenarios    → SCENARIOS.md
knowledge://products/{product}/services/{svc}/api          → API.md
knowledge://products/{product}/services/{svc}/dependencies → DEPENDENCIES.md
knowledge://products/{product}/services/{svc}/data-model   → DATA_MODEL.md
knowledge://products/{product}/services/{svc}/config       → CONFIG.md
knowledge://products/{product}/services/{svc}/errors       → ERRORS.md
```

#### MCP Resource Endpoints (updated)

```
knowledge://index                                        → INDEX.md
knowledge://products/{product}                           → PRODUCT.md
knowledge://products/{product}/data-flow                 → DATA_FLOW.md
knowledge://products/{product}/api-surface               → API_SURFACE.md
knowledge://products/{product}/dependencies              → DEPENDENCIES.md
knowledge://products/{product}/database-catalog          → DATABASE_CATALOG.md
knowledge://products/{product}/coding-standards          → CODING_STANDARDS.md
knowledge://products/{product}/runbooks                  → runbooks/ directory listing
knowledge://products/{product}/runbooks/{name}           → specific runbook
knowledge://products/{product}/services/{svc}            → OVERVIEW.md
knowledge://products/{product}/services/{svc}/scenarios  → SCENARIOS.md
knowledge://products/{product}/services/{svc}/api        → API.md
knowledge://products/{product}/services/{svc}/deps       → DEPENDENCIES.md
knowledge://products/{product}/services/{svc}/data-model → DATA_MODEL.md
knowledge://products/{product}/services/{svc}/tables     → TABLE_MAP.md
knowledge://products/{product}/services/{svc}/config     → CONFIG.md
knowledge://products/{product}/services/{svc}/errors     → ERRORS.md
knowledge://products/{product}/services/{svc}/standards  → CODING_STANDARDS.md
knowledge://products/{product}/services/{svc}/runbook    → RUNBOOK.md
```

#### MCP Tool Endpoints

Two categories: **Read tools** (query static knowledge) and **Live skills** (invoke extraction on demand).

**Read Tools** (query the generated knowledge base):

| Tool | Input | Output | Use case |
|------|-------|--------|----------|
| `find_service` | `{name_or_keyword}` | Service overview + link | "What service handles payments?" |
| `get_api` | `{service, endpoint_path?}` | Full endpoint definition(s) | "What does POST /orders return?" |
| `get_dependencies` | `{service, direction: in/out/both}` | Dependency list | "What does order-service call?" |
| `get_scenario` | `{service, keyword}` | Scenario walkthrough | "What happens when payment fails?" |
| `get_errors` | `{service, error_code?}` | Error catalogue entry | "What does ERR_ORDER_LOCKED mean?" |
| `list_services` | `{product?, type?: UI/API/Batch}` | Service list with summaries | "List all batch services" |
| `get_data_flow` | `{product, start?, end?}` | Data flow narrative | "How does data flow from order to fulfilment?" |
| `get_table` | `{table_name}` | Table schema + owner + feature usage | "What service owns the orders table?" |
| `get_runbook` | `{service_or_product, scenario?}` | Runbook steps | "How do I restart order-service?" |
| `get_coding_standards` | `{product?, service?}` | Standards document | "What error handling pattern is used?" |
| `search_index` | `{query}` | Relevant doc links (keyword match) | Generic discovery |

**Live Skill Tools** (invoke a skill on a live repo — no pre-generated docs required):

| Tool | Input | Output | Use case |
|------|-------|--------|----------|
| `run_skill` | `{skill: SkillName, repo, branch?}` | Skill output JSON | On-demand extraction from any repo |
| `extract_api_contracts` | `{repo, branch?}` | `{endpoints[]}` | "Show me all endpoints in payments-service right now" |
| `extract_dependencies` | `{repo, branch?}` | `{dependencies[]}` | "What does this repo call?" |
| `generate_runbook` | `{service}` | Runbook Markdown | "Generate a runbook for inventory-service" |

#### MCP Prompt Templates

Pre-built prompts that agents can invoke with a service/product as context:

```
knowledge://prompts/investigate-bug       → bug investigation prompt + service scenarios + error catalogue
knowledge://prompts/explain-feature       → feature explanation using product flows + service docs
knowledge://prompts/onboard-service       → onboarding guide: overview + scenarios + coding standards
knowledge://prompts/impact-analysis       → dependency-aware change impact (what else might break?)
knowledge://prompts/write-runbook         → guided runbook creation using extracted runbook signals
knowledge://prompts/review-pr             → PR review prompt enriched with service coding standards
```

#### MCP Server Configuration

```json
// .mcp.json (or claude_desktop_config.json / copilot mcp config)
{
  "servers": {
    "svcmap": {
      "command": "npx",
      "args": ["svcmap", "serve", "--knowledge-dir", "./knowledge"],
      "env": {}
    }
  }
}
```

The server starts as a local stdio process — no external hosting required. For team-shared usage, it can also run as an HTTP/SSE server.

---

### 5.7 Skills & Agent Architecture

This is the most important architectural decision in the system. Instead of writing LLM calls inline throughout the codebase, every discrete AI-powered operation is a **Skill** — a typed, testable, reusable unit. Agents compose Skills to accomplish goals. The MCP server exposes Skills as MCP Tools.

This means: the same `ExtractAPIContracts` skill used during `svcmap generate` can also be invoked by Claude or Copilot directly on a live repo, on demand, via MCP. svcmap becomes a platform, not just a generator.

---

#### Skill Definition

A Skill is a pure function with a defined input schema, output schema, and a declared LLM tier requirement.

```typescript
interface Skill<TInput, TOutput> {
  name: string;                        // e.g. "ExtractAPIContracts"
  description: string;                 // used by MCP to describe the tool to agents
  inputSchema: ZodSchema<TInput>;      // validated on every invocation
  outputSchema: ZodSchema<TOutput>;    // validated before output is accepted
  tier: 'extraction' | 'generation';  // determines which model is used
  execute(
    input: TInput,
    providers: { llm: LLMProvider; git?: GitProvider }
  ): Promise<TOutput>;
}
```

`tier` drives model selection automatically:
- `extraction` → cheap, fast model (Claude Haiku, GPT-4o-mini) — used for high-volume structured extraction
- `generation` → best available model (Claude Opus, GPT-4o) — used for narrative prose and synthesis

---

#### Skill Library (v1)

Skills are grouped by concern. All are in `packages/skills/`.

**Crawl Skills** (no LLM — pure git/API operations):
| Skill | Input | Output |
|-------|-------|--------|
| `CrawlRepo` | `{repo, branch, includePaths, excludePaths}` | `RawAssets` (categorised file contents) |
| `DetectDiff` | `{repo, storedSHA, currentSHA}` | `{changedPaths, affectedDocTypes}` |
| `FetchExtraDocs` | `{paths: string[]}` | `{docContents: DocumentChunk[]}` |

**Extraction Skills** (tier: `extraction`):
| Skill | Input | Output |
|-------|-------|--------|
| `ExtractServiceIdentity` | `RawAssets` | `{name, type, language, framework, purpose}` |
| `ExtractAPIContracts` | `RawAssets` | `{endpoints: Endpoint[]}` |
| `ExtractOutboundDeps` | `RawAssets` | `{dependencies: Dependency[]}` |
| `ExtractDataModel` | `RawAssets` | `{entities: Entity[], relationships: Relation[]}` |
| `ExtractScenarios` | `RawAssets` | `{scenarios: Scenario[]}` |
| `ExtractConfig` | `RawAssets` | `{config: ConfigEntry[]}` |
| `ExtractErrors` | `RawAssets` | `{errors: ErrorEntry[]}` |
| `ExtractTableUsage` | `RawAssets` | `{tables: TableEntry[], featureMap: FeatureTableMap}` |
| `ExtractCodingStandards` | `RawAssets` | `{conventions: Convention[], patterns: Pattern[], antiPatterns: string[]}` |
| `ExtractRunbookSignals` | `RawAssets` | `{startup, healthChecks, shutdown, failureModes, rollback}` |

**Synthesis Skills** (tier: `generation` — runs after all per-service extractions):
| Skill | Input | Output |
|-------|-------|--------|
| `ResolveServiceGraph` | `Dependency[][]` (all services) | `ServiceGraph` (full adjacency + metadata) |
| `BuildDatabaseCatalog` | `TableEntry[][]` (all services) | `DatabaseCatalog` |
| `SynthesizeProductStandards` | `Convention[][]` (all services) | `ProductStandards` |

**Generation Skills** (tier: `generation` — write Markdown):
| Skill | Input | Output |
|-------|-------|--------|
| `GenerateDocument` | `{template, extractedData, audience, existingDocs}` | `MarkdownDocument` |
| `GenerateRunbook` | `{service, runbookSignals, existingRunbooks}` | `MarkdownDocument` |
| `BuildWikiIndex` | `{allDocuments: DocumentMetadata[]}` | `IndexMarkdown` |
| `GenerateTLDR` | `{document: MarkdownDocument, audience}` | `string` (TL;DR block) |
| `LinkDocuments` | `{allDocuments}` | `{updatedDocuments}` (bidirectional links injected) |

---

#### Agent Orchestrators

Agents compose skills. They live in `packages/agents/`.

**`ServiceAgent`** — generates all docs for a single service:
```
CrawlRepo → [10 extraction skills in parallel] → [generation skills in sequence] → write files
```

**`ProductAgent`** — coordinates all service agents + cross-service synthesis:
```
[ServiceAgent × N in parallel (capped by parallelism config)]
  → ResolveServiceGraph
  → BuildDatabaseCatalog
  → SynthesizeProductStandards
  → BuildWikiIndex
  → LinkDocuments (bidirectional link injection across all docs)
```

**`UpdateAgent`** — diff-aware, invoked by webhooks or `svcmap update`:
```
DetectDiff → identify affected skills → re-run only those skills → re-write only affected docs → re-run LinkDocuments
```

**`OnDemandAgent`** — invoked by an external AI agent via MCP tool:
```
Receives: {skill name, inputs}
Executes: that skill with configured providers
Returns: structured output (JSON or Markdown)
```

This is what makes the MCP tool layer powerful — an agent can ask svcmap to run `ExtractAPIContracts` on any repo at any time, not just at doc-generation time.

---

#### LLM Provider Interface

All skills use the same provider interface. The `tier` field on the skill drives model selection.

```typescript
interface LLMProvider {
  name: string;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  countTokens(text: string): number;
  maxContextTokens: number;
  models: {
    extraction: string;    // fast/cheap model for Pass 1-10
    generation: string;    // best model for narrative generation
  };
}

interface CompletionRequest {
  system: string;
  messages: Message[];
  maxTokens?: number;
  temperature?: number;   // default: 0.1 for extraction, 0.3 for generation
  enableCache?: boolean;  // prompt caching (Claude: automatic; OpenAI: prefix caching)
}
```

#### Implemented Providers (v1)

| Provider | Extraction Model | Generation Model | Notes |
|----------|-----------------|-----------------|-------|
| `ClaudeProvider` | `claude-haiku-4-5-20251001` | `claude-opus-4-6` | Prompt caching on system prompts; best for code understanding |
| `OpenAIProvider` | `gpt-4o-mini` | `gpt-4o` | Compatible with GitHub Copilot API endpoint |
| `VertexProvider` | `gemini-2.0-flash` | `gemini-2.0-pro` | Stub in v1; full implementation in v2 |

#### Token Budget Management

Large repos can exceed context limits. Handled transparently by a `ChunkRunner` utility used by all extraction skills:

```
1. Measure token count of input
2. If within budget → single LLM call
3. If over budget → split into overlapping chunks → run skill on each chunk (map)
                 → run synthesis prompt on all chunk outputs (reduce)
4. Caller always receives a single TOutput — chunking is invisible
```

---

#### How Skills Map to MCP Tools

Every skill in the library is automatically registered as an MCP tool on the server. The skill's `name` and `description` become the tool's name and description. External agents can invoke any skill directly:

```json
// An agent (Claude, Copilot) calling a skill via MCP:
{
  "tool": "ExtractAPIContracts",
  "input": {
    "repo": "myorg/payments-service",
    "branch": "main"
  }
}
// Returns: { endpoints: [...] }
```

This means a developer can ask Claude: *"Extract the API contracts from the payments-service repo and show me all POST endpoints"* — and svcmap executes it live, without pre-generated docs.

---

### 5.8 Diff-Based Regeneration & Hook System

Documentation must stay current without requiring full regeneration on every run. The hook system makes this automatic.

#### Diff Strategy

Every generated file records two values in `checksums.json`:
- `sourceCommitSHA` — the HEAD commit of the repo when docs were last generated
- `contentHash` — MD5 of the generated Markdown content

When `svcmap update` runs (or is triggered by a hook):

```
1. For each tracked service repo:
   a. Fetch current HEAD SHA (via GitHub/Azure DevOps MCP — no clone needed)
   b. Compare with stored sourceCommitSHA
   c. If same → skip (no changes)
   d. If different → fetch the git diff between stored SHA and current HEAD
   e. Analyse diff: which directories/files changed?
   f. Map changed paths to affected documentation sections (using path→section map)
   g. Regenerate only the affected documents
   h. Update checksums.json with new SHA
```

#### Path → Document Section Mapping

```yaml
# Built-in defaults (overridable in config)
path_to_doc_mapping:
  "src/routes/**":          [API.md, SCENARIOS.md]
  "src/models/**":          [DATA_MODEL.md]
  "src/events/**":          [DEPENDENCIES.md]
  "src/errors/**":          [ERRORS.md]
  "config/**":              [CONFIG.md]
  "*.env*":                 [CONFIG.md]
  "src/**":                 [OVERVIEW.md, SCENARIOS.md]   # catch-all
  "README.md":              [OVERVIEW.md]
```

#### Hook Installation

**Git hook (local, per-repo):**

```bash
# .git/hooks/post-merge  (installed by `svcmap init --install-hooks`)
#!/bin/bash
svcmap update --service $(basename $(pwd)) --trigger git-hook
```

**GitHub Webhook:**

```yaml
# Set up in GitHub repo settings → Webhooks
URL:    http://your-host/svcmap/webhook
Events: push (to main branch)
Secret: (configured in svcmap.config.yaml)
```

```
POST /svcmap/webhook
{
  "provider": "github",
  "repo": "myorg/order-service",
  "ref": "refs/heads/main",
  "before": "abc123",
  "after": "def456"
}
```

**Azure DevOps Service Hook:**

```
Event:    Code pushed
Filters:  Branch = main
Action:   HTTP POST → http://your-host/svcmap/webhook
```

The webhook endpoint is part of the MCP server (same process, different HTTP path). When triggered, it enqueues a selective regeneration job and returns `202 Accepted` immediately.

---

## 6. Knowledge Schema Design

### 6.1 Product-Level Knowledge

**Audience:** Product Owners, Agents doing feature-level tasks, new engineers orienting themselves.  
**Goal:** Answer "What does this product do and how does it fit together?" in under 5 minutes of reading.

---

#### `PRODUCT.md` — Product Overview

```markdown
# {Product Name}

> One-line tagline.

## What This Product Does
[2-3 paragraphs: business purpose, who uses it, what problem it solves]

## Key Capabilities
| Capability | Description | Primary Service |
|------------|-------------|-----------------|
| Order Placement | ... | order-service |
| Inventory Check | ... | inventory-service |

## Services in This Product
| Service | Type | Purpose |
|---------|------|---------|
| [order-service](services/order-service/OVERVIEW.md) | REST API | ... |
| [order-ui](services/order-ui/OVERVIEW.md) | UI | ... |

## Repositories
| Repo | Branch | Last Doc Update |
|------|--------|-----------------|
| myorg/order-service | main | 2026-04-11 |

## Technology Snapshot
[Table: language, framework, database, message broker per service]

## Key External Integrations
[Third-party APIs, payment gateways, identity providers, etc.]

## Quick Start for Agents
[How an agent should navigate this knowledge base to answer questions about this product]
```

---

#### `DATA_FLOW.md` — End-to-End Data Flow

```markdown
# Data Flow — {Product Name}

## User-Initiated Flows
### Flow: Place an Order
1. User submits form → order-ui calls POST /api/orders on order-service
2. order-service validates payload and calls GET /inventory/{sku} on inventory-service
3. inventory-service reserves stock and returns reservation-id
4. order-service persists order with PENDING status
5. order-service publishes `order.created` event to orders-topic
6. notification-service consumes event and sends confirmation email

[Each flow as a numbered narrative + optional ASCII sequence diagram]

## Background / Async Flows
[Batch jobs, scheduled tasks, event-driven flows]

## Data at Rest
[Where key entities are stored: which DB, which service owns it]
```

---

#### `API_SURFACE.md` — Aggregated API Reference

```markdown
# API Surface — {Product Name}

## Public APIs (External Facing)
| Service | Method | Path | Auth | Purpose |
|---------|--------|------|------|---------|
| order-service | POST | /orders | JWT | Place a new order |

## Internal APIs (Service-to-Service)
| Caller | Callee | Method | Path | Purpose |
|--------|--------|--------|------|---------|

## Events / Messages
| Publisher | Topic | Event | Consumer(s) |
|-----------|-------|-------|-------------|
```

---

#### `DEPENDENCIES.md` — Product Dependency Map

```markdown
# Dependency Map — {Product Name}

## TL;DR for Agents
- Internal: order-service → inventory-service (REST), order-service → notification-service (Kafka)
- External: Stripe (payment), SendGrid (email), Auth0 (identity)
- Shared infra: orders-db (PostgreSQL), orders-topic (Kafka)

## Internal Service Graph
[Text adjacency list of service→service calls with edge types]

## External Dependencies
| Dependency | Type | Purpose | Owner Contact |
|------------|------|---------|---------------|

## Shared Infrastructure
[Databases, message brokers, caches shared across services]
```

---

#### `DATABASE_CATALOG.md` — Product-Level Database & Table Catalog

**Purpose:** Single source of truth for all databases and tables across the product. Answers "which service owns this table?", "which features touch this table?", and "what does this column mean?". Aggregated from all per-service `TABLE_MAP.md` files.

```markdown
# Database Catalog — {Product Name}

## TL;DR for Agents
- 3 databases: orders-db (owned by order-service), inventory-db (owned by inventory-service), shared audit-db
- Cross-service reads: order-service reads inventory-db.stock_levels (read replica, no writes)
- Key tables for order flow: orders, order_items, stock_reservations, stock_levels

## Databases Overview
| Database | Type | Owner Service | Access | Tables |
|----------|------|---------------|--------|--------|
| orders-db | PostgreSQL | order-service | Private | orders, order_items, payment_attempts |
| inventory-db | PostgreSQL | inventory-service | Private + read replica | stock_levels, skus, stock_reservations |
| audit-db | PostgreSQL | (shared) | All services write | audit_events |

---

## Table: orders
**Database:** orders-db | **Owner:** order-service | **Schema:** public

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | NO | Primary key |
| user_id | UUID | NO | FK to identity system (external) |
| status | ENUM | NO | PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED |
| total_amount | DECIMAL(10,2) | NO | Order total at time of creation |
| created_at | TIMESTAMPTZ | NO | |
| updated_at | TIMESTAMPTZ | NO | |

**Indexes:** `idx_orders_user_id`, `idx_orders_status`, `idx_orders_created_at`

**Features that write this table:**
| Feature | Service | Operation | Scenario |
|---------|---------|-----------|---------|
| Place Order | order-service | INSERT | [Create Order](services/order-service/SCENARIOS.md#create-order) |
| Payment Confirmed | order-service | UPDATE status | [Payment Flow](services/order-service/SCENARIOS.md#payment-confirmed) |
| Cancel Order | order-service | UPDATE status | [Cancel Order](services/order-service/SCENARIOS.md#cancel-order) |

**Features that read this table:**
| Feature | Service | Purpose |
|---------|---------|---------|
| Order History | order-ui | Display user's past orders |
| Fulfilment Processing | fulfillment-batch | Find CONFIRMED orders to process |

---

[One section per table across all services]

## Cross-Service Data Access
| Reader Service | Target DB | Table | Access Type | Why (not via API?) |
|----------------|-----------|-------|-------------|-------------------|
| fulfillment-batch | orders-db | orders | Read replica | Batch query at scale; API rate limits unsuitable |
```

---

#### `CODING_STANDARDS.md` — Product-Level Coding Standards

**Purpose:** Captures the agreed patterns and conventions that apply across all services in this product. Generated from common patterns observed across all service codebases + any standards docs the user provides. Both human-readable and agent-consumable (agents use this when reviewing PRs or generating code suggestions).

```markdown
# Coding Standards — {Product Name}

## TL;DR for Agents
- Error handling: all services use structured error objects with `code`, `message`, `statusCode` fields
- Auth: JWT validated at the gateway; services trust `x-user-id` header (no re-validation)
- Logging: structured JSON via the shared `@myorg/logger` package; always include `traceId`
- API versioning: path-based (`/v1/`, `/v2/`) — no header-based versioning
- No direct cross-service DB access except fulfillment-batch (approved exception, see DATABASE_CATALOG.md)

## Error Handling
[How errors are structured, propagated, and returned across all services]

## Authentication & Authorisation
[How auth works at the product level — gateway pattern, token propagation, service trust model]

## Logging Standards
[Log levels, required fields, structured format, what NOT to log (PII, secrets)]

## API Design Conventions
[REST conventions: naming, versioning, pagination, error response shape]

## Async / Event Patterns
[How events are published, consumed, and idempotency is handled]

## Testing Conventions
[Unit vs integration vs e2e expectations; what must be tested; what can be skipped]

## Forbidden Patterns
| Pattern | Why Forbidden | Approved Alternative |
|---------|---------------|----------------------|
| Direct cross-DB queries | Creates hidden coupling; breaks service ownership | Call the owning service's API |
| Catching and swallowing errors | Silent failures cause data inconsistency | Re-throw or log + publish dead letter |
| Synchronous calls in batch loops | N+1 call problem; rate limit exhaustion | Batch APIs or async processing |

## Approved Third-Party Libraries
[Per language: which libraries are approved and which are banned]

## Service-Specific Exceptions
[Links to per-service CODING_STANDARDS.md for approved deviations]
```

---

#### `runbooks/` — Product-Level Runbooks

**Purpose:** Operational procedures that span multiple services. For on-call engineers and Agents asked to diagnose cross-service incidents.

```markdown
# Runbooks — {Product Name}

## Index
- [P1 Incident Response](runbooks/P1_INCIDENT_RESPONSE.md)
- [Deployment Sequence](runbooks/DEPLOYMENT_SEQUENCE.md)
- [Full Rollback Procedure](runbooks/ROLLBACK.md)
- [Database Migration Procedure](runbooks/DB_MIGRATION.md)
- [Kafka Consumer Lag Recovery](runbooks/KAFKA_LAG.md)
```

**`runbooks/P1_INCIDENT_RESPONSE.md` template:**

```markdown
# P1 Incident Response — {Product Name}

## TL;DR for Agents
- Start with health checks on all services: [health endpoints listed below]
- Most P1s are caused by: inventory-service latency spike, Kafka consumer lag, or Stripe webhook backlog
- Escalation: Page @order-team-oncall in PagerDuty

## Step 1: Triage (first 5 minutes)
1. Check product health dashboard: {URL}
2. Run health checks: [order-service /health, inventory-service /health, ...]
3. Check Kafka consumer lag: {command}
4. Identify which service is the source vs. which are downstream victims

## Step 2: Isolate
[Service-specific isolation steps, circuit breaker instructions]

## Step 3: Mitigate
[Rollback steps, feature flag toggles, traffic rerouting]

## Step 4: Communicate
[Status page update procedure, stakeholder notification template]

## Common Failure Patterns
| Symptom | Likely Cause | First Action |
|---------|-------------|--------------|
| Orders stuck in PENDING | Payment webhook backlog | Check Stripe webhook delivery logs |
| Inventory 503s | DB connection pool exhausted | Restart inventory-service pods; scale if needed |
| Notification delays | Kafka consumer group lag | Check consumer lag; restart notification-service |
```

---

### 6.2 Service-Level Knowledge

**Audience:** Engineers fixing bugs, Agents doing code-level tasks, on-call responders.  
**Goal:** Answer "Exactly what does this service do, what can go wrong, and what does it touch?" — the level of detail needed to make a code change confidently.

---

#### `OVERVIEW.md` — Service Overview

```markdown
# {Service Name}

> One-line description.

## Service Identity
| Property | Value |
|----------|-------|
| Type | REST API / GraphQL / Batch / UI |
| Language | Node.js 20 / Python 3.12 / ... |
| Framework | Express / FastAPI / Spring Boot |
| Repo | [myorg/order-service](https://github.com/myorg/order-service) |
| Primary Database | PostgreSQL (orders DB) |
| Message Broker | Kafka (orders-topic) |
| Deployed on | Kubernetes / Azure App Service / ... |

## Responsibilities
[Bulleted list: what this service owns, what it does NOT own]

## Entry Points
| Entry Point | File | Description |
|-------------|------|-------------|
| HTTP Server | src/server.ts:12 | Express app bootstrap |
| Cron Job | src/jobs/cleanup.ts:1 | Daily stale order cleanup |

## What an Agent Needs to Know to Work on This Service
[Short guide: where to start reading, what the key abstractions are, which files matter most]

## Related Documents
- [Product Overview](../../PRODUCT.md)
- [API Reference](API.md)
- [Scenarios](SCENARIOS.md)
- [Dependency Map](DEPENDENCIES.md)
```

---

#### `SCENARIOS.md` — Scenario Walkthroughs

This is the most valuable document for agents doing bug fixes or feature work. It maps real situations to code paths.

```markdown
# Scenarios — {Service Name}

## How to Read This Document
Each scenario describes a real execution path through this service.
For each scenario: what triggers it, what code runs, what the expected outcome is, and what can go wrong.

---

## Scenario: Happy Path — Create Order

**Trigger:** POST /orders with valid payload and authenticated user  
**Code entry:** src/routes/orders.ts → createOrderHandler()

### Steps
1. Request arrives at `createOrderHandler` (src/routes/orders.ts:45)
2. Payload validated by `OrderSchema.parse()` (src/schemas/order.ts:12) — throws 400 on fail
3. Auth token decoded; userId extracted (src/middleware/auth.ts:30)
4. `InventoryService.reserve(sku, qty)` called — HTTP GET to inventory-service
5. If reservation fails: returns 409 CONFLICT with `ERR_STOCK_INSUFFICIENT`
6. `OrderRepository.create(order)` — INSERT into orders table
7. `EventBus.publish('order.created', payload)` — Kafka publish
8. Returns 201 with created order object

**Success outcome:** Order in DB with status=PENDING; event on Kafka  
**Failure modes:** See [ERRORS.md](ERRORS.md) for ERR_STOCK_INSUFFICIENT, ERR_DB_WRITE_FAIL

---

## Scenario: Payment Timeout

**Trigger:** Payment provider webhook not received within 15 minutes  
**Code entry:** src/jobs/payment-timeout.ts (runs every 5 minutes)

### Steps
[...]

**Success outcome:** Order moved to PAYMENT_TIMEOUT status; customer notified  
**Side effects:** Inventory reservation released via inventory-service

---

[One section per significant scenario]
```

---

#### `API.md` — API Reference

```markdown
# API Reference — {Service Name}

## Authentication
[Auth mechanism: JWT, API key, OAuth, mTLS — how to obtain and use]

## Base URL
| Environment | URL |
|-------------|-----|
| Production | https://order-service.prod.myorg.com |
| Staging | https://order-service.staging.myorg.com |

---

## POST /orders
**Purpose:** Create a new order  
**Auth:** Required (JWT)

### Request
```json
{
  "userId": "string (UUID)",
  "items": [{ "sku": "string", "qty": "number" }],
  "shippingAddress": { ... }
}
```

### Response 201
```json
{ "orderId": "UUID", "status": "PENDING", "createdAt": "ISO8601" }
```

### Error Responses
| Status | Code | When |
|--------|------|------|
| 400 | ERR_INVALID_PAYLOAD | Malformed request body |
| 409 | ERR_STOCK_INSUFFICIENT | Not enough inventory |
| 503 | ERR_UPSTREAM_TIMEOUT | inventory-service unreachable |

---
[One section per endpoint]
```

---

#### `DEPENDENCIES.md` — Service Dependency Map

```markdown
# Dependencies — {Service Name}

## Outbound Calls (This service calls these)
| Target | Type | Endpoint / Topic | Purpose | Timeout | Retry |
|--------|------|-----------------|---------|---------|-------|
| [inventory-service](../inventory-service/OVERVIEW.md) | REST | GET /inventory/{sku} | Stock check | 3s | 2x |
| [notification-service](../notification-service/OVERVIEW.md) | Kafka event | orders-topic | Trigger emails | — | at-least-once |
| Stripe API | External REST | POST /payment_intents | Payment | 10s | no |

## Inbound Calls (These services call us)
| Caller | Type | Our Endpoint | Purpose |
|--------|------|-------------|---------|
| [order-ui](../order-ui/OVERVIEW.md) | REST | POST /orders | Order placement |
| [fulfillment-service](../fulfillment-service/OVERVIEW.md) | REST | PATCH /orders/{id} | Status update |

## Databases & Storage
| Store | Type | Schema/Collection | Access Pattern |
|-------|------|------------------|----------------|
| orders-db | PostgreSQL | public.orders | Read/Write |
| redis-cache | Redis | order:{id} | Read-through cache |

## Feature Flags
[If applicable — flags that change dependency behaviour]
```

---

#### `DATA_MODEL.md`, `CONFIG.md`, `ERRORS.md`

Structured in the same pattern: clear headings, tables, code examples, "when it matters" context for agents.

---

#### `TABLE_MAP.md` — Service-Level Table Map

**Purpose:** Which tables does this service own? Which does it read from other services? What columns matter and why? This feeds into the product-level `DATABASE_CATALOG.md` — it is the authoritative per-service view.

```markdown
# Table Map — {Service Name}

## TL;DR for Agents
- Owns 2 tables in orders-db: `orders`, `order_items`
- Reads (no writes) from inventory-db.stock_levels via read replica
- The `orders.status` column is the state machine field — all major scenarios touch it

## Tables Owned by This Service
### orders
[Schema table: column, type, nullable, description]
[Indexes]
[Which features/endpoints write each column]

### order_items
[...]

## Tables Read From Other Services
| Table | Database | Owner Service | Access | Purpose |
|-------|----------|---------------|--------|---------|
| stock_levels | inventory-db | inventory-service | Read replica | Check availability without calling API (batch only) |

## Key Queries
[Most important queries this service runs — helps agents understand access patterns]

## Migration History
[Summary of significant schema changes and why — not full SQL, just the story]
```

---

#### `CODING_STANDARDS.md` — Service-Level Coding Standards

**Purpose:** Service-specific conventions and approved deviations from product-level standards. An agent reading this knows exactly how code in this service is structured before writing a single line.

```markdown
# Coding Standards — {Service Name}

## TL;DR for Agents
- Uses Repository pattern for all DB access — never query DB directly from route handlers
- All async operations use async/await; no callback-style code
- Approved deviation from product standard: this service uses header-based versioning (legacy decision, ADR-003)

## Architecture Layers
| Layer | Directory | Responsibility | May call |
|-------|-----------|----------------|----------|
| Routes | src/routes/ | Request parsing, response shaping | Services only |
| Services | src/services/ | Business logic | Repositories, external clients |
| Repositories | src/repositories/ | DB access (queries, mutations) | DB only |
| Clients | src/clients/ | External API / event calls | Nothing internal |

## Naming Conventions
[File naming, class naming, function naming, variable naming with examples]

## Key Internal Patterns
[Specific patterns used in this codebase: how DI is done, how errors propagate, how config is loaded]

## Approved Deviations From Product Standards
| Standard | This Service's Approach | Reason | ADR |
|----------|------------------------|--------|-----|
| Path-based API versioning | Header-based (`API-Version` header) | Legacy; migration planned Q3 | ADR-003 |

## What NOT to Do In This Codebase
[Anti-patterns specific to this service — things that have caused bugs before]
```

---

#### `RUNBOOK.md` — Service-Level Runbook

**Purpose:** Everything an on-call engineer or agent needs to operate, debug, and recover this service. Focused on this service only — cross-service procedures are in the product runbooks.

```markdown
# Runbook — {Service Name}

## TL;DR for Agents
- Health check: GET /health (200 = healthy; 503 = degraded with reason in body)
- Most common failure: DB connection pool exhausted — restart pod; check connection count in Grafana
- Restart is safe at any time; service is stateless (state lives in DB + Kafka)

## Service Identity
| Property | Value |
|----------|-------|
| Health endpoint | GET /health |
| Metrics endpoint | GET /metrics (Prometheus) |
| Logs | {log aggregator URL / query} |
| Deployment | Kubernetes: namespace=order-management, deployment=order-service |
| Scaling | Horizontal; min 2 pods, max 10 |

## Startup Procedure
1. `kubectl rollout restart deployment/order-service -n order-management`
2. Watch pods: `kubectl get pods -n order-management -w`
3. Verify health: `curl https://order-service.internal/health`
4. Check for consumer lag if service consumes events

## Graceful Shutdown
[What happens on SIGTERM: in-flight requests drain, DB connections close, Kafka consumer commits offsets]

## Common Failure Modes

### Failure: Database Connection Exhausted
**Symptoms:** 503 responses; logs show "connection pool timeout"; `/health` returns `{"status":"degraded","db":"unavailable"}`  
**Cause:** Too many concurrent requests or a slow query holding connections  
**Immediate fix:** Restart the service pod — connections are released  
**Root cause investigation:** Check `pg_stat_activity` for long-running queries; check HPA settings  

### Failure: Upstream inventory-service Timeout
**Symptoms:** 503 responses on POST /orders; logs show `ERR_UPSTREAM_TIMEOUT`  
**Cause:** inventory-service is slow or unreachable  
**Immediate fix:** This service has a 3s timeout + 2 retries; if inventory-service is down, orders will fail-fast  
**Check:** `curl https://inventory-service.internal/health`  

[One section per significant failure mode]

## Rollback Procedure
1. Identify the last known-good image tag in the deploy history
2. `kubectl set image deployment/order-service order-service={image}:{tag} -n order-management`
3. Verify rollout: `kubectl rollout status deployment/order-service -n order-management`
4. If DB migration was included in the release: see product-level [DB Migration Runbook](../../runbooks/DB_MIGRATION.md)

## Environment Variables Reference
[Key env vars and what happens if they are wrong — subset of CONFIG.md focused on ops]

## Useful Commands
[kubectl, psql, kafka-consumer-groups commands relevant to this service]

## Escalation
| Situation | Escalate to | Contact |
|-----------|-------------|---------|
| DB corruption suspected | DBA team | @dba-oncall |
| Data privacy incident | Security | @security-team |
| Cannot recover in 15 min | Eng lead | @order-team-lead |
```

---

### 6.3 Output File Structure

```
knowledge/                                    ← root (configurable name)
├── INDEX.md                                  ← root wiki index / semantic router (start here)
├── quick-ref/                                ← cross-product quick lookup tables
│   ├── ALL_ERRORS.md                         ← all error codes across all services
│   └── ALL_EVENTS.md                         ← all events/queues across all services
├── products/
│   └── order-management/
│       ├── PRODUCT.md                        ← high-level product overview (PO-facing)
│       ├── DATA_FLOW.md                      ← end-to-end data flows, sequence narratives
│       ├── API_SURFACE.md                    ← aggregated API reference (all services)
│       ├── DEPENDENCIES.md                   ← service graph + external integrations
│       ├── DATABASE_CATALOG.md               ← all databases + tables with feature cross-ref
│       ├── CODING_STANDARDS.md               ← cross-service patterns, conventions, banned patterns
│       ├── runbooks/                         ← product-level operational procedures
│       │   ├── P1_INCIDENT_RESPONSE.md
│       │   ├── DEPLOYMENT_SEQUENCE.md
│       │   ├── ROLLBACK.md
│       │   ├── DB_MIGRATION.md
│       │   └── KAFKA_LAG.md
│       └── services/
│           ├── order-service/
│           │   ├── OVERVIEW.md               ← what it does, entry points, agent guide
│           │   ├── SCENARIOS.md              ← scenario walkthroughs with file:line refs
│           │   ├── API.md                    ← endpoint reference
│           │   ├── DEPENDENCIES.md           ← inbound + outbound deps
│           │   ├── DATA_MODEL.md             ← key entities and relationships
│           │   ├── TABLE_MAP.md              ← tables owned/read + column details
│           │   ├── CONFIG.md                 ← env vars, feature flags
│           │   ├── ERRORS.md                 ← error catalogue with recovery hints
│           │   ├── CODING_STANDARDS.md       ← service-specific conventions + approved deviations
│           │   └── RUNBOOK.md                ← ops guide: health, failures, rollback, commands
│           ├── inventory-service/
│           │   └── [same structure]
│           ├── order-ui/
│           │   ├── OVERVIEW.md
│           │   ├── SCENARIOS.md              ← UI flows: user journeys, states, edge cases
│           │   ├── DEPENDENCIES.md           ← API calls made by the UI
│           │   ├── TABLE_MAP.md              ← (usually empty for UI; included for consistency)
│           │   ├── CONFIG.md                 ← env vars, feature flags, build-time config
│           │   ├── CODING_STANDARDS.md       ← component patterns, state management, styling
│           │   ├── COMPONENTS.md             ← key components and what they do
│           │   └── RUNBOOK.md                ← deployment, CDN cache clear, rollback
│           └── fulfillment-batch/
│               ├── OVERVIEW.md
│               ├── SCENARIOS.md              ← batch scenarios: triggers, processing, failure
│               ├── DEPENDENCIES.md
│               ├── TABLE_MAP.md
│               ├── CONFIG.md
│               ├── ERRORS.md
│               ├── CODING_STANDARDS.md
│               └── RUNBOOK.md               ← how to trigger manually, reprocess, recover
└── meta/
    ├── svcmap.config.yaml                    ← product configuration
    ├── checksums.json                        ← diff tracking: SHA + content hash per doc
    ├── skills-registry.json                  ← registered skills + their MCP tool descriptors
    ├── extracted/                            ← raw skill output JSON (gitignored by default)
    │   ├── order-service/
    │   │   ├── pass1_identity.json
    │   │   ├── pass2_api.json
    │   │   ├── pass8_tables.json
    │   │   ├── pass9_standards.json
    │   │   ├── pass10_runbook.json
    │   │   └── ...
    └── .env                                  ← credentials (always gitignored)
```

---

## 7. Configuration Design

### `svcmap.config.yaml` — Full Schema

```yaml
version: "1"

product:
  name: "Order Management Platform"
  slug: "order-management"              # used in file paths and MCP URIs
  description: "End-to-end order lifecycle management"
  owners:                               # optional: for generated docs
    - team: "Order Team"
      contact: "order-team@myorg.com"

knowledge_base:
  output_dir: "./knowledge"             # relative to config file location
  commit_to_repo: false                 # if true: auto-commit generated docs
  gitignore_extracted: true             # don't commit raw extraction JSON

provider:
  git: github                           # github | azure-devops
  organisation: "myorg"                 # GitHub org or Azure DevOps organisation
  project: ""                           # Azure DevOps project (if applicable)
  # Auth: uses environment variables
  # GITHUB_TOKEN or AZURE_DEVOPS_PAT

llm:
  provider: claude                      # claude | openai | vertex
  generation_model: "claude-opus-4-6"  # used for narrative generation
  extraction_model: "claude-haiku-4-5-20251001" # used for high-volume extraction
  temperature: 0.2
  # API key: ANTHROPIC_API_KEY (env var)

hooks:
  webhook_secret: "${SVCMAP_WEBHOOK_SECRET}"
  webhook_port: 3456
  install_git_hooks: true              # auto-install post-merge hook in each repo

services:
  order-service:
    repo: "myorg/order-service"
    branch: "main"
    type: "api"                        # api | ui | batch | worker (auto-detected if omitted)
    extra_docs:
      - "./docs/order-adr-001.md"
    exclude_paths:
      - "dist/"
      - "coverage/"

  inventory-service:
    repo: "myorg/inventory-service"
    branch: "main"
    type: "api"

  order-ui:
    repo: "myorg/order-ui"
    branch: "main"
    type: "ui"

  fulfillment-batch:
    repo: "myorg/fulfillment-batch"
    branch: "main"
    type: "batch"

generation:
  parallelism: 3                       # concurrent skill executions (respect rate limits)
  retry_attempts: 2
  documents:                           # toggle which documents to generate
    product:
      product_overview: true
      data_flow: true
      api_surface: true
      dependencies: true
      database_catalog: true           # NEW: requires pass8_tables on all services
      coding_standards: true           # NEW: requires pass9_standards on all services
      runbooks: true                   # NEW: requires pass10_runbook on all services
    service:
      overview: true
      scenarios: true
      api: true
      dependencies: true
      data_model: true
      table_map: true                  # NEW
      config: true
      errors: true
      coding_standards: true           # NEW
      runbook: true                    # NEW
  path_to_doc_mapping:                 # optional overrides (which docs to regenerate per changed path)
    "src/routes/**":      ["API.md", "SCENARIOS.md"]
    "src/models/**":      ["DATA_MODEL.md", "TABLE_MAP.md"]
    "migrations/**":      ["TABLE_MAP.md", "DATABASE_CATALOG.md"]
    "src/events/**":      ["DEPENDENCIES.md"]
    "src/errors/**":      ["ERRORS.md"]
    "config/**":          ["CONFIG.md", "RUNBOOK.md"]
    "k8s/**":             ["RUNBOOK.md"]
    ".github/workflows/**": ["RUNBOOK.md"]
    "src/**":             ["OVERVIEW.md", "SCENARIOS.md", "CODING_STANDARDS.md"]
    "README.md":          ["OVERVIEW.md"]

skills:
  expose_as_mcp_tools: true            # make all skills available as live MCP tools
  live_skill_auth: none                # none | token (for team deployments)
```

---

## 8. Implementation Phases

### Phase 0 — Foundation (Week 1–2)

**Goal:** Skeleton project, CI/CD, local development loop working.

| Task | Detail |
|------|--------|
| Repo setup | Monorepo: `packages/cli`, `packages/crawler`, `packages/skills`, `packages/agents`, `packages/generator`, `packages/mcp-server` |
| Language decision | **TypeScript** — MCP SDK is TypeScript-first; better async tooling for crawling |
| CLI scaffold | Use `oclif` — command tree with `init`, `generate`, `serve`, `status`, `update` |
| Config system | `zod` schema for `svcmap.config.yaml` — validates on load, helpful errors |
| Skill interface | Define `Skill<TInput, TOutput>` base interface + tier system — no implementations yet |
| Provider interfaces | Define `LLMProvider` (with extraction/generation model pair), `GitProvider` interfaces |
| Agent interface | Define `Agent` base class with `run()` and `runSkill()` methods |
| Test harness | `vitest` unit tests; fixtures from a sample public repo |
| CI | GitHub Actions: lint, type-check, unit tests on each PR |

**Deliverable:** `svcmap init` runs the interactive wizard and writes a valid config file.

---

### Phase 1 — Crawler (Week 3–4)

**Goal:** Given a configured service, crawl its repo and produce structured extraction input.

| Task | Detail |
|------|--------|
| GitHub provider | Use GitHub REST API (via Octokit) to list files and fetch content — no clone needed for public/API-accessible repos |
| Azure DevOps provider | Azure DevOps REST API equivalent |
| File categoriser | Rule-based: map file paths/names to asset categories (routes, schemas, config, etc.) |
| Chunk builder | Split large file collections into token-budget-aware chunks |
| Local clone option | Fallback: `simple-git` shallow clone for repos not accessible via API |
| Extraction JSON writer | Write categorised assets to `meta/extracted/{service}/raw.json` |
| Unit tests | Test categoriser with fixture repos (Node, Python, Java samples) |

**Deliverable:** `svcmap crawl --service order-service` produces a populated `extracted/order-service/raw.json`.

---

### Phase 2 — Skills Library (Week 5–6)

**Goal:** All extraction and synthesis skills implemented, tested, and producing validated structured JSON.

| Task | Detail |
|------|--------|
| Claude provider | Implement `ClaudeProvider` — extraction tier (Haiku) + generation tier (Opus); prompt caching on system prompts |
| OpenAI provider | Implement `OpenAIProvider` — `gpt-4o-mini` extraction, `gpt-4o` generation (also handles GitHub Copilot) |
| ChunkRunner utility | Token-budget management + map-reduce for large repos; used by all extraction skills |
| All 10 extraction skills | Write, test, and iterate each skill's prompt against real sample repos (Node, Python, Java) |
| 3 synthesis skills | `ResolveServiceGraph`, `BuildDatabaseCatalog`, `SynthesizeProductStandards` |
| Skill output schemas | `zod` schemas for every skill output — LLM output rejected if schema invalid; retry once |
| Skills registry | Auto-register all skills for MCP tool exposure |

**Deliverable:** For each service, 10 JSON files in `meta/extracted/{service}/pass*.json` with validated structured data. Product-level synthesis produces 3 cross-service JSON files.

---

### Phase 3 — Doc Generator & Agent Orchestrators (Week 7–8)

**Goal:** Markdown files written from skill outputs. Agents compose skills end-to-end.

| Task | Detail |
|------|--------|
| Template engine | Handlebars templates for each document type (one template per doc, locked heading order) |
| Document writers | One generation skill per document type (`GenerateOverview`, `GenerateScenarios`, etc.) |
| TL;DR generator | `GenerateTLDR` skill — runs after every document is written; injects TL;DR block at top |
| `ServiceAgent` | Orchestrates: CrawlRepo → 10 extraction skills → generation skills → TL;DR injection |
| `ProductAgent` | Orchestrates: N × ServiceAgent (parallel) → 3 synthesis skills → index + link injection |
| `UpdateAgent` | DetectDiff → identify affected skills → re-run selective subset |
| Cross-reference linker | `LinkDocuments` skill: post-process all docs for bidirectional links; report orphans |
| Wiki index generator | `BuildWikiIndex` skill: semantic router INDEX.md from all document metadata |
| Checksums tracking | Write `meta/checksums.json` after each generation run |
| Existing doc injection | Load and chunk user-supplied docs; inject as grounding context in generation skills |
| UI + Batch templates | Specialised templates for UI services (COMPONENTS.md) and batch services |

**Deliverable:** `svcmap generate` runs `ProductAgent` end-to-end and produces a complete, cross-linked, TL;DR-annotated knowledge base in `knowledge/`.

---

### Phase 4 — MCP Server (Week 9–10)

**Goal:** Knowledge base exposed via MCP; read tools + live skill tools all working.

| Task | Detail |
|------|--------|
| MCP server scaffold | Use `@modelcontextprotocol/sdk` TypeScript SDK |
| Resource endpoints | All 19 resource URI patterns backed by file reads |
| Read tool implementations | All 11 read tools with keyword matching against index |
| Live skill tool bridge | `OnDemandAgent` wired to MCP: any skill invokable as an MCP tool |
| Skills registry → MCP tools | Auto-generate MCP tool descriptors from skills registry at startup |
| Prompt templates | 6 pre-built agent prompt templates |
| stdio transport | Default mode for local Claude Desktop / VS Code |
| HTTP/SSE transport | Optional mode for team-shared deployments |
| Config examples | `.mcp.json` for Claude Desktop; VS Code `settings.json` for Copilot |
| Integration test | Claude: `find_service "payment"` → correct doc; `extract_api_contracts {repo}` → live result |

**Deliverable:** `svcmap serve` starts an MCP server; Claude/Copilot can retrieve any document, use all read tools, and invoke live skills on any repo.

---

### Phase 5 — Diff & Hook System (Week 11–12)

**Goal:** Documentation auto-updates when code changes.

| Task | Detail |
|------|--------|
| Diff detector | Compare stored SHA vs current HEAD via git provider API |
| Path→doc mapper | Map changed file paths to affected document types |
| Selective regeneration | Re-run only affected extraction passes and document writers |
| Git hook installer | `svcmap init --install-hooks` writes post-merge hook to each service repo |
| Webhook server | HTTP endpoint on the MCP server process; handles GitHub and Azure DevOps payloads |
| Job queue | Simple in-process queue to handle concurrent webhook events |
| `svcmap status` | Show which services are stale (docs behind latest commit) |

**Deliverable:** Push to a service repo → webhook fires → only affected docs regenerate within ~2 minutes.

---

### Phase 6 — Hardening & Open Source Release (Week 13–14)

**Goal:** Production-ready, well-documented, usable by external contributors.

| Task | Detail |
|------|--------|
| Error handling | Graceful degradation: if one service fails to crawl, continue others; report at end |
| Rate limiting | Respect GitHub/Azure API rate limits; exponential backoff |
| Dry run mode | `svcmap generate --dry-run` shows what would be generated without writing |
| Progress reporting | Rich terminal progress bars (`ora`, `listr2`) |
| `--non-interactive` mode | All `init` inputs as CLI flags for CI pipelines |
| Documentation | README, `CONTRIBUTING.md`, example configs, quickstart guide |
| Sample knowledge base | Ship a demo knowledge base generated from a public open-source project |
| NPM publish | Publish `svcmap` as an npm package; also provide a Docker image |
| GitHub Action | `svcmap-action`: runs `svcmap update` on push; configurable via workflow file |

**Deliverable:** Public v0.1.0 release; installable via `npm install -g svcmap` or `npx svcmap`.

---

## 9. Technical Stack

> Note: The Future Phases Roadmap (Section 12) covers the planned v2 work on Architectural Decision Records, meeting outcomes, and RAG/semantic search.

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Language | **TypeScript** | MCP SDK is TypeScript-first; strong async support; familiar to most teams |
| CLI framework | **oclif** | Plugin system, good TypeScript support, handles interactive prompts |
| Interactive prompts | **@inquirer/prompts** | Modern, composable replacement for Inquirer.js |
| Config parsing | **zod** + js-yaml | Schema validation with helpful errors; same zod schemas validate skill I/O |
| Skill interface | **zod** (I/O schemas) + TypeScript generics | Type-safe skill contracts enforced at runtime and compile time |
| Agent orchestration | Custom lightweight orchestrator in `packages/agents` | No external framework; keeps dependencies minimal |
| Git (GitHub) | **Octokit** | Official GitHub REST + GraphQL SDK |
| Git (Azure DevOps) | **azure-devops-node-api** | Official Azure DevOps SDK |
| Git (local clone) | **simple-git** | Fallback for repos requiring local access |
| LLM (Claude) | **@anthropic-ai/sdk** | Prompt caching on system prompts; Haiku for extraction, Opus for generation |
| LLM (OpenAI) | **openai** | Handles GitHub Copilot (OpenAI-compatible API endpoint) |
| MCP server | **@modelcontextprotocol/sdk** | Official MCP TypeScript SDK; skills auto-registered as tools |
| Templates | **Handlebars** | Logic-less templates; locked heading order per document type |
| Testing | **vitest** | Fast, TypeScript-native; skill tests use recorded fixtures |
| Monorepo | **pnpm workspaces** | Packages: `cli`, `crawler`, `skills`, `agents`, `generator`, `mcp-server` |
| Bundler | **tsup** | Zero-config TypeScript bundler |
| Linting | **ESLint** + **Prettier** | Consistent code style |
| Terminal UI | **ora** + **listr2** | Progress spinners and task lists for CLI feedback |

### Monorepo Package Map

```
packages/
├── cli/           → svcmap CLI commands; thin shell calling agents
├── crawler/       → CrawlRepo, DetectDiff, FetchExtraDocs skills (no LLM)
├── skills/        → all 10 extraction + 3 synthesis + generation skills
├── agents/        → ServiceAgent, ProductAgent, UpdateAgent, OnDemandAgent
├── generator/     → Handlebars templates + document writers (used by generation skills)
└── mcp-server/    → MCP server: resources, read tools, live skill tool bridge
```

### Python Note

A Python SDK / wrapper can be provided in `packages/python-sdk` for teams preferring Python. It would be a thin client over the MCP server — not a reimplementation of the engine. The engine stays TypeScript.

---

## 10. Open Questions & Future Decisions

| Question | Options | Recommendation |
|----------|---------|----------------|
| Should extracted JSON be committed? | Yes (reproducible, inspectable) / No (gitignored, re-extracted on demand) | Config option; default: gitignored |
| How to handle monorepos? | Treat each service sub-path as a "repo" | Add `path` field to service config |
| Diagram generation? | Mermaid auto-gen from dependency JSON | v2; mark DEPENDENCIES.md sections as "diagram pending" |
| Vector store for semantic search? | `pgvector`, `chromadb`, `qdrant` | v3; skill interface is designed to be extended with an `EmbedDocument` skill |
| Multi-product in one knowledge base? | Single INDEX.md with products as top-level entries | Already designed for this |
| Auth for team-shared webhook server? | Webhook secret + HMAC validation | Already in design; add mTLS option for enterprise |
| Confluence / Notion import? | Fetch via their APIs | v2; `extra_docs` URL input is the hook |
| Private model hosting (Ollama)? | Add `OllamaProvider` implementing `LLMProvider` | v2; interface ready for this |
| Should live skill tools require auth? | None (local stdio) / Token (team HTTP deployment) | Config option `skills.live_skill_auth`; default: none |
| How to handle skills that produce no output? | Warn + continue / fail the service | Warn + continue; report in `svcmap status` |

---

## 11. Success Criteria

### Functional

- [ ] `svcmap init` completes in under 2 minutes for a 10-service product
- [ ] `svcmap generate` produces a complete knowledge base for 50 services in under 30 minutes
- [ ] `svcmap update` regenerates only changed service docs in under 5 minutes after a webhook
- [ ] An agent (Claude or Copilot) can answer "What does the payment service do?" in 1 tool call
- [ ] An agent can produce an accurate bug investigation plan for any scenario in `SCENARIOS.md`
- [ ] A new engineer can understand a service's responsibilities from `OVERVIEW.md` alone

### Quality

- [ ] Generated docs pass a relevance review by a PO (no hallucinated features)
- [ ] All inter-service links in generated docs resolve correctly
- [ ] `svcmap status` correctly identifies stale docs after a code change

### Developer Experience

- [ ] `npm install -g svcmap && svcmap init` works on macOS, Linux, Windows (WSL)
- [ ] Full regeneration of a 5-service product costs less than $2 in LLM API fees (with Claude Haiku for extraction)
- [ ] Config errors produce actionable, human-readable messages
- [ ] All CLI commands have `--help` with clear examples

---

---

## 12. Future Phases Roadmap

These are **explicitly out of scope for v1** but are designed for in the current architecture. Each is a natural extension — no breaking changes required.

---

### Future Phase A — Architectural Decision Records (ADRs)

**Goal:** Store, index, and search architectural decisions so agents and engineers can understand *why* a system is built the way it is.

#### What ADRs Add

ADRs answer the question that code never can: *"Why was this decision made, and what alternatives were rejected?"*

Without ADRs, agents and engineers reverse-engineer intent from code — which is slow and often wrong. With ADRs in the knowledge base, an agent asked "Why does this service use header-based versioning?" can retrieve the decision record and give the actual answer.

#### Storage Structure

```
knowledge/
└── products/{product}/
    └── decisions/
        ├── adr/
        │   ├── INDEX.md                    ← ADR index with status and tags
        │   ├── ADR-001-service-mesh.md
        │   ├── ADR-002-event-sourcing.md
        │   └── ADR-003-api-versioning.md   ← linked from service CODING_STANDARDS.md
        └── (meetings/ — see Phase B)
```

#### ADR Document Schema

```markdown
# ADR-{NNN}: {Title}

## TL;DR for Agents
- Decision: [one sentence — what was decided]
- Status: Accepted / Superseded by ADR-XXX / Deprecated
- Impact: [which services/features this decision affects]

## Status
Accepted | Proposed | Superseded | Deprecated

## Context
[What problem were we solving? What were the constraints? What was the pressure to decide?]

## Decision
[What was decided, in plain language]

## Alternatives Considered
| Alternative | Why Rejected |
|-------------|-------------|
| Option A | Too complex to operate at scale |
| Option B | Vendor lock-in risk |

## Consequences
### Positive
[What becomes easier or better]
### Negative / Trade-offs
[What becomes harder; what tech debt this creates]

## Related
- [Service affected](../../services/{service}/CODING_STANDARDS.md)
- [Supersedes / Superseded by](ADR-XXX.md)
```

#### How ADRs Enter the System

Two paths:
1. **User-supplied:** User provides existing ADR files in `extra_docs`. The `FetchExtraDocs` skill ingests them and they are indexed as-is.
2. **CLI authoring:** `svcmap adr new` launches an interactive wizard that fills the template, writes the file, and updates the ADR index.

ADRs are **never auto-generated** — they represent human decisions and must be human-authored. svcmap indexes and links them; it does not invent them.

#### ADR Linking (automatic)

When ADRs exist, the cross-reference linker:
- Links each ADR to the services it affects (in their `CODING_STANDARDS.md` "Approved Deviations" table)
- Links each service's deviation to its justifying ADR
- Adds ADRs to the wiki semantic router index

#### New MCP Tools (Phase A)

| Tool | Input | Output |
|------|-------|--------|
| `get_adr` | `{adr_number}` | Full ADR document |
| `list_adrs` | `{status?, service?}` | ADR index filtered by status or affected service |
| `find_decision` | `{topic_keyword}` | Relevant ADRs + affected services |

---

### Future Phase B — Meeting Outcomes & Decision Log

**Goal:** Capture the outcomes of significant technical meetings (architecture reviews, post-mortems, planning sessions) so their conclusions are searchable and linkable — not lost in email or Slack.

#### What This Covers

- **Architecture review outcomes** — decisions made in design reviews
- **Post-mortem conclusions** — root cause + action items
- **Planning decisions** — technical scope decisions from sprint/PI planning

This is **not** a meeting notes tool. It captures structured *outcomes* only — decisions, action items, rejected options. Raw meeting notes stay in wherever they live (Notion, Confluence, etc.).

#### Storage Structure

```
knowledge/
└── products/{product}/
    └── decisions/
        ├── adr/                            ← from Phase A
        └── meetings/
            ├── INDEX.md                    ← meeting outcomes index
            ├── 2026-03-15-arch-review.md
            ├── 2026-03-28-postmortem.md
            └── 2026-04-01-planning.md
```

#### Meeting Outcome Schema

```markdown
# {Date} — {Meeting Type}: {Topic}

## TL;DR for Agents
- Key decision: [one sentence]
- Action items: N items (see below)
- Relevant services: [order-service, inventory-service]

## Decisions Made
| Decision | Owner | Rationale |
|----------|-------|-----------|
| Switch to async payment processing | order-team | Sync calls causing timeout cascade under load |

## Rejected Options
| Option | Why Rejected |
|--------|-------------|

## Action Items
| Item | Owner | Due | Status |
|------|-------|-----|--------|
| Spike on Kafka vs SQS for payment events | @alice | 2026-04-14 | Open |

## Participants
[Team/role list — no individual names unless org policy permits]

## Related
- [ADR-004](../adr/ADR-004-async-payment.md) — if a decision became a formal ADR
- [order-service RUNBOOK](../../services/order-service/RUNBOOK.md)
```

#### How Meeting Outcomes Enter the System

- `svcmap meeting new` — interactive wizard (date, type, decisions, actions)
- Or: user writes MD file manually using the template; `svcmap update --index` re-indexes it
- Meeting outcomes are **never auto-generated**

#### New MCP Tools (Phase B)

| Tool | Input | Output |
|------|-------|--------|
| `get_meeting` | `{date_or_topic}` | Meeting outcome document |
| `list_decisions` | `{service?, date_range?}` | All decisions affecting a service or time window |
| `get_action_items` | `{status?: open/closed}` | Open action items across all meetings |

---

### Future Phase C — Mermaid Diagram Generation

Auto-generate Mermaid sequence and entity diagrams from the extracted dependency JSON and data models. Diagrams are embedded in `DATA_FLOW.md` and `DEPENDENCIES.md` and rendered by GitHub/GitLab natively.

No new extraction needed — diagrams generated from Pass 11 (Cross-Service Aggregation) output.

---

### Future Phase D — Semantic Search & RAG

Add an optional `EmbedDocument` skill that embeds each document chunk into a vector store. Expose a `semantic_search` MCP tool that returns the most relevant document passages for a free-text query.

Designed to slot in as an optional skill — the core knowledge base and MCP interface are unchanged. Vector store is configurable: local (`chromadb`) or hosted (`pgvector` on existing DB).

---

*End of Plan — svcmap Knowledge Server v2.0*

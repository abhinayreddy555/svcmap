<!-- generated: 2026-04-13T05:06:02.141Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Dependencies — cartservice

## TL;DR for Agents

- **cartservice** makes **0 outbound service calls** but depends on **4 possible storage backends** (Redis, Cloud Spanner, AlloyDB, or in-memory cache) — only one is active at runtime based on configuration.
- All three external databases (Redis, Spanner, AlloyDB) are **shared resources** — failures or schema changes impact cartservice directly.
- **Google Cloud Secret Manager** is called at startup to retrieve AlloyDB credentials; if it is unreachable, AlloyDB-backed cart initialization will fail.
- Redis is used via `StackExchangeRedis` as a distributed cache; Spanner uses **retriable transactions** for consistency.
- No outbound calls to other microservices — cartservice is a **leaf dependency** in the service graph (data-tier only).

## Outbound Calls

cartservice does not make outbound calls to any other microservices in the `microservices-demo` product.

| Target | Type | Endpoint / Topic | Purpose | Timeout | Retries | Is External |
|--------|------|-------------------|---------|---------|---------|-------------|
| _None_ | — | — | — | — | — | — |

> **Note:** All network I/O from cartservice is directed at databases or cloud platform APIs, documented in the sections below.

## Databases & Storage

cartservice supports **multiple mutually exclusive storage backends** selected via environment configuration at deploy time.

| Name | Type | Purpose | Shared / Private |
|------|------|---------|------------------|
| Redis | `redis` | Cache-based cart storage using `StackExchangeRedis` distributed caching | **Shared** |
| Google Cloud Spanner | `spanner` (distributed SQL) | Distributed SQL database for cart items storage; uses retriable transactions for consistency | **Shared** |
| AlloyDB | `postgresql` (AlloyDB) | PostgreSQL-compatible relational database for cart items storage | **Shared** |
| In-Memory Cache | `in-memory` | Fallback distributed memory cache when no external storage is configured; **data is lost on pod restart** | **Private** |

### Storage selection logic

Only **one** backend is active per deployment. The selection is typically driven by environment variables (e.g., `REDIS_ADDR`, `SPANNER_CONNECTION_STRING`, `ALLOYDB_*`). If none are set, the service falls back to the in-memory cache.

### Failure impact

| Backend | Failure Mode | Impact |
|---------|-------------|--------|
| Redis | Connection timeout / eviction | Cart data unavailable or silently lost (cache semantics) |
| Cloud Spanner | Transaction abort | Retried automatically via retriable transaction wrapper; prolonged outage → full cart failure |
| AlloyDB | Connection failure / secret fetch failure | Cart operations fail; startup may fail if Secret Manager is unreachable |
| In-Memory | Pod restart / OOM | All cart data lost — no persistence guarantee |

## Third-Party Integrations

| Name | Category | SDK / Package | Purpose |
|------|----------|---------------|---------|
| Google Cloud Secret Manager | Secrets management | `Google.Cloud.SecretManager.V1` | Retrieve AlloyDB database password from Secret Manager during service initialization |

> **Startup dependency:** Secret Manager is called **synchronously at boot** when AlloyDB is the configured backend. A Secret Manager outage will prevent cartservice from starting in that configuration.

## Inbound Calls

The following services are known to call cartservice. This list is derived from the product-level service graph and **may be incomplete**.

| Caller | Protocol | Method / RPC | Purpose |
|--------|----------|-------------|---------|
| `frontend` | gRPC | `AddItem`, `GetCart`, `EmptyCart` | Frontend proxies user cart operations to cartservice |
| `checkoutservice` | gRPC | `GetCart`, `EmptyCart` | Checkout reads the cart to process orders, then empties it |

> **Note:** cartservice exposes a gRPC `CartService` API defined in the shared proto files. Any service with access to the proto can call it — verify the full caller list in the product-level topology graph.

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Failure scenarios and runbooks for cartservice storage backend outages
- [ARCHITECTURE.md](ARCHITECTURE.md) — Overall microservices-demo architecture and service topology
- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Source repository
- [checkoutservice/DEPENDENCIES.md](../checkoutservice/DEPENDENCIES.md) — Checkout service dependency map (primary consumer of cartservice)
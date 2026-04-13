<!-- generated: 2026-04-13T05:09:45.753Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# productcatalogservice

> gRPC API serving product catalog data for an e-commerce microservices demo, backed by a local JSON file or AlloyDB PostgreSQL.

## TL;DR for Agents

- **What it does:** Exposes `ListProducts`, `GetProduct`, and `SearchProducts` gRPC RPCs on port `3550` — this is the single source of truth for product information in the microservices-demo.
- **Language & framework:** Go service using gRPC; no REST endpoints.
- **Data source:** Loads catalog from a local JSON file by default, or from **AlloyDB (PostgreSQL)** when `ALLOYDB_CLUSTER_NAME` env var is set.
- **Entry point for bugs:** Start at `src/productcatalogservice/server.go` (bootstrap) and `src/productcatalogservice/product_catalog.go` (RPC handlers).
- **No outbound service dependencies:** This service is a leaf node — it does not call other microservices.

## Service Identity

| Attribute | Value |
|---|---|
| **Type** | API (gRPC) |
| **Language** | Go |
| **Framework** | gRPC |
| **Runtime** | Go |
| **Repo** | `GoogleCloudPlatform/microservices-demo` |
| **Primary Database** | AlloyDB (PostgreSQL) — optional; falls back to local JSON file |
| **Deployed on** | Google Cloud (GKE / Cloud Run — per demo configuration) |

## Responsibilities

- Owns the **product catalog** — the authoritative list of products, prices, descriptions, and categories.
- Serves `ListProducts` — returns the full product catalog.
- Serves `GetProduct` — returns a single product by ID.
- Serves `SearchProducts` — returns products matching a text query.
- Loads and caches catalog data from either a **local JSON file** or **AlloyDB PostgreSQL**.
- Exposes a **gRPC health check** endpoint for liveness/readiness probes.

### This service does NOT handle:

- Cart management (`CartService` is separate)
- Recommendations (`RecommendationService` is separate)
- Payment processing
- Order fulfillment

## Entry Points

| File | Description |
|---|---|
| `src/productcatalogservice/server.go` | Main entry point — initializes gRPC server, OpenTelemetry tracing, profiling, and starts listening on port `3550` |
| `src/productcatalogservice/product_catalog.go` | `ProductCatalog` service implementation containing `ListProducts`, `GetProduct`, and `SearchProducts` RPC method handlers |

## Key Abstractions

| Abstraction | Description |
|---|---|
| **productCatalog** | Core gRPC service struct holding catalog data in memory and implementing all RPC handlers. |
| **CatalogLoader** | Abstraction that selects the data source — reads from a local JSON file or queries AlloyDB depending on configuration. |
| **Product** | Protobuf message representing a single product (ID, name, description, picture, price, categories). |
| **ListProductsResponse** | Protobuf message wrapping the full list of `Product` messages returned by `ListProducts`. |
| **HealthCheck** | gRPC health check implementation used by Kubernetes probes and load balancers. |

## What an Agent Needs to Know to Work on This Service

1. **Where to start:** Open `src/productcatalogservice/server.go` to understand initialization, then `product_catalog.go` for business logic.
2. **Data loading pattern:** The service checks for the `ALLOYDB_CLUSTER_NAME` environment variable at startup. If set, it connects to AlloyDB PostgreSQL; otherwise, it reads from a bundled JSON file. This branching logic lives in the catalog loader.
3. **Port:** The gRPC server listens on **port `3550`**.
4. **Testing:** Unit tests use the Go `testing` package with a mock `productCatalog` containing hardcoded product data. Tests cover `GetProduct` (found and not-found cases), `ListProducts`, and `SearchProducts`. Run tests with:
   ```bash
   cd src/productcatalogservice && go test ./...
   ```
5. **No outbound calls:** This service has zero dependencies on other microservices — if you see a failure, the root cause is either in this service's code, its data source (JSON file or AlloyDB), or the network/infrastructure layer.
6. **Protobuf definitions:** RPC contracts are defined in the shared proto files in the repo. Any changes to the `Product` message or service definition require regenerating Go stubs.

## Related Documents

- [API.md](API.md) — gRPC method signatures, request/response schemas, and error codes
- [SCENARIOS.md](SCENARIOS.md) — Common request flows and failure scenarios
- [DEPENDENCIES.md](DEPENDENCIES.md) — Detailed dependency graph and AlloyDB connection details
- [TABLE_MAP.md](TABLE_MAP.md) — AlloyDB table schemas and data model
- [RUNBOOK.md](RUNBOOK.md) — Operational playbooks for incidents and debugging

## See Also

- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Parent repository and architecture overview
- [gRPC Go documentation](https://grpc.io/docs/languages/go/) — Framework reference
- [AlloyDB for PostgreSQL documentation](https://cloud.google.com/alloydb/docs) — Database backend reference
- [OpenTelemetry Go SDK](https://opentelemetry.io/docs/languages/go/) — Tracing instrumentation used by this service
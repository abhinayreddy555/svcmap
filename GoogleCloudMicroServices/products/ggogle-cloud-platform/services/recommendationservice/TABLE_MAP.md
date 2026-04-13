<!-- generated: 2026-04-13T05:23:12.468Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Table Map — recommendationservice

## TL;DR for Agents

- **0 tables owned, 0 tables read-only** — this service does not directly interact with any database tables.
- The `recommendationservice` is a stateless gRPC service that generates product recommendations by calling other services (primarily `productcatalogservice`), not by querying databases.
- No schema migrations, indexes, or direct table dependencies exist for this service.
- If you are investigating a database-related issue, this service is **not relevant** — look at upstream services like `productcatalogservice` or `cartservice` instead.
- Built in Python; uses the OpenTelemetry SDK and calls `ListProducts` via gRPC to generate random recommendations.

## Tables Owned

_This service does not own any database tables._

The `recommendationservice` is entirely stateless. It operates by:

1. Receiving a `ListRecommendations` gRPC request (which may include a list of product IDs to exclude).
2. Calling `productcatalogservice.ListProducts()` over gRPC to retrieve the full product catalog.
3. Filtering out any excluded product IDs.
4. Returning a random subset of the remaining product IDs as recommendations.

No data is persisted, cached in a database, or written to any table.

## Tables Read From Other Services

| Table | Owning Service | Access Method | Reason |
|-------|---------------|---------------|--------|
| _None_ | — | — | — |

The `recommendationservice` does not read from any database tables directly — neither its own nor those of other services. All data access is mediated through **gRPC service-to-service calls**:

| Upstream Service | RPC Method | Data Retrieved | Notes |
|---|---|---|---|
| `productcatalogservice` | `ListProducts` | Full product catalog (in-memory JSON) | `productcatalogservice` itself loads data from a static `products.json` file, not a database table |

Because `productcatalogservice` in the `microservices-demo` reference architecture uses a static JSON file (`src/productcatalogservice/products.json`) rather than a database, there are no transitive table dependencies either.

## See Also

- [DATABASE_CATALOG.md](DATABASE_CATALOG.md) — Full database catalog for the microservices-demo project
- [SCENARIOS.md](SCENARIOS.md) — Common operational scenarios and troubleshooting guides
- [`cartservice` Table Map](../cartservice/TABLE_MAP.md) — The `cartservice` (backed by Redis/Valkey) is the primary stateful service in this architecture
- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Upstream repository and architecture documentation
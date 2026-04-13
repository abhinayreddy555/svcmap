<!-- generated: 2026-04-13T05:12:34.714Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Table Map — checkoutservice

## TL;DR for Agents

- **0 tables owned** and **0 tables read-only** by `checkoutservice`.
- `checkoutservice` does **not** directly interact with any database tables.
- This service operates as an orchestrator, coordinating calls to other microservices (cart, product catalog, shipping, payment, currency, email) via gRPC — not via direct DB access.
- If you are investigating a database-related issue, this service is **not relevant** — look at the downstream services it calls instead.
- Part of the [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) reference architecture.

## Tables Owned

_No tables are owned by `checkoutservice`._

This service does not manage or write to any database tables directly. It functions as a stateless orchestration layer that composes a checkout workflow by making gRPC calls to the following downstream services:

| Downstream Service       | Purpose                                      |
|--------------------------|----------------------------------------------|
| `cartservice`            | Retrieve and empty the user's cart           |
| `productcatalogservice`  | Look up product details for cart items       |
| `currencyservice`        | Convert prices to the requested currency     |
| `shippingservice`        | Get shipping cost and create shipment        |
| `paymentservice`         | Charge the user's credit card                |
| `emailservice`           | Send order confirmation email                |

Any persistent state (e.g., cart contents, product catalog data) is owned and managed by those respective services.

## Tables Read From Other Services

| Table | Owning Service | Access Method | Reason |
|-------|---------------|---------------|--------|
| _None_ | — | — | `checkoutservice` does not perform direct database reads against any other service's tables. All cross-service data access is performed via **gRPC API calls**, not shared database access. |

> **Note:** The microservices-demo architecture enforces strict service boundaries. No service reads another service's database directly. All inter-service communication flows through well-defined gRPC interfaces.

## See Also

- [DATABASE_CATALOG.md](DATABASE_CATALOG.md) — Full database catalog for the GoogleCloudPlatform microservices-demo product
- [SCENARIOS.md](SCENARIOS.md) — Common operational scenarios and troubleshooting workflows
- [GoogleCloudPlatform/microservices-demo — `src/checkoutservice`](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/src/checkoutservice) — Source code for this service
- [cartservice TABLE_MAP.md](../cartservice/TABLE_MAP.md) — Table map for `cartservice`, which owns the cart persistence layer that `checkoutservice` depends on
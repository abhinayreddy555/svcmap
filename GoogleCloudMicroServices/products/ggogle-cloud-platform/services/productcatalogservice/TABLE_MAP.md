<!-- generated: 2026-04-13T05:13:58.439Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Table Map — productcatalogservice

## TL;DR for Agents

- **0 tables owned, 0 tables read-only** — this service does not use a traditional relational database.
- `productcatalogservice` serves product data from an **in-memory catalog loaded from a static JSON file** (`products.json`), not from database tables.
- There are **no SQL tables, indexes, or foreign keys** to map for this service.
- If you are looking for database table dependencies for `productcatalogservice`, this document confirms there are none.
- For broader database usage across the microservices-demo, see [DATABASE_CATALOG.md](DATABASE_CATALOG.md).

---

## Tables Owned

**None.**

`productcatalogservice` does not own or write to any database tables. The service loads its product catalog from a static JSON file (`products.json`) embedded in the service's container image at startup. All product data (name, description, price, categories, picture) is served from an in-memory data structure.

### Data Source Details

| Property | Value |
|---|---|
| **Data origin** | `products.json` (static file) |
| **Storage type** | In-memory (loaded at service init) |
| **Persistence layer** | None (stateless; data is read-only from file) |
| **Write operations** | None |

> The service exposes gRPC endpoints (`ListProducts`, `GetProduct`, `SearchProducts`) that query the in-memory product list — no database driver or connection pool is involved.

---

## Tables Read From Other Services

| Table | Owning Service | Access Method | Reason |
|---|---|---|---|
| *(none)* | — | — | `productcatalogservice` does not read from any external database tables. It is a self-contained, stateless catalog provider. |

No cross-service database reads exist. Other services (e.g., `frontend`, `recommendationservice`, `checkoutservice`) call `productcatalogservice` via **gRPC** to retrieve product information — they do not share a database.

---

## Notes on Architecture

In the `GoogleCloudPlatform/microservices-demo` architecture, `productcatalogservice` is intentionally designed as a **stateless microservice** with no database dependency. This makes it:

- Trivially horizontally scalable
- Free of schema migration concerns
- Dependent only on the `products.json` file baked into the container at build time

If a future version introduces a database-backed catalog (e.g., Cloud Spanner, PostgreSQL, Firestore), this document should be updated to reflect the new table ownership.

---

## See Also

- [DATABASE_CATALOG.md](DATABASE_CATALOG.md) — Full database catalog across all services in microservices-demo
- [SCENARIOS.md](SCENARIOS.md) — Common operational scenarios and service interaction patterns
- [GoogleCloudPlatform/microservices-demo source](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/src/productcatalogservice) — Service source code and `products.json`
- [ARCHITECTURE.md](ARCHITECTURE.md) — Overall system architecture and inter-service communication map
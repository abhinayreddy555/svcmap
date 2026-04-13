<!-- generated: 2026-04-13T05:13:41.448Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Data Model — productcatalogservice

## TL;DR for Agents

- **productcatalogservice** is a lightweight, in-memory product catalog with **1 core entity (`Product`)** and **0 traditional database tables** — data is loaded from a static JSON file (`products.json`), not a relational database.
- The service exposes **5 gRPC endpoints** with corresponding request/response DTOs defined in Protocol Buffers (`demo.proto`).
- The most important entity is **`Product`**, which contains pricing via an embedded `Money` value object.
- There are **no foreign keys, indexes, or cross-entity joins** — the catalog is self-contained with no references to other services' data at the storage level.
- Related services (`frontend`, `recommendationservice`, `checkoutservice`) reference products by `id` (string) but no enforced FK exists.

## Database Entities

> **Note:** This service does not use a traditional database. Products are loaded from a static JSON file (`src/productcatalogservice/products.json`) into memory at startup. The entity below describes the logical data structure.

### Product

Represents a single item available for sale in the online store.

| Field | Type | Nullable | Index | FK → | Description |
|---|---|---|---|---|---|
| `id` | `string` | No | Primary (in-memory lookup key) | — | Unique product identifier (e.g., `"OLJCESPC7Z"`) |
| `name` | `string` | No | — | — | Human-readable product name |
| `description` | `string` | No | — | — | Full-text product description |
| `picture` | `string` | No | — | — | Relative path or URL to the product image (e.g., `"/static/img/products/sunglasses.jpg"`) |
| `price_usd` | `Money` (embedded) | No | — | — | Product price expressed as an embedded `Money` value object |
| `categories` | `repeated string` | No (can be empty list) | — | — | List of category tags for filtering/search (e.g., `["clothing"]`, `["accessories"]`) |

**Relationships:**
- `Product` embeds a `Money` value object for pricing — this is composition, not a separate entity.
- No outbound foreign keys exist. Other services (`checkoutservice`, `recommendationservice`, `cartservice`) reference `Product.id` as an external identifier, but no referential integrity is enforced at this layer.

### Money (Value Object)

Represents a monetary amount in a specific currency. Embedded within `Product` as `price_usd`.

| Field | Type | Nullable | Index | FK → | Description |
|---|---|---|---|---|---|
| `currency_code` | `string` | No | — | — | 3-letter ISO 4217 currency code (e.g., `"USD"`) |
| `units` | `int64` | No | — | — | Whole units of the currency amount |
| `nanos` | `int32` | No | — | — | Number of nano units (10⁻⁹) of the currency amount. Must be `-999,999,999` to `+999,999,999` and same sign as `units` |

**Relationships:**
- Pure value object; no independent identity or relationships.

## Enums

This service does not define any enums. Categories are free-form strings rather than a constrained enumeration.

### Implicit Category Values (from `products.json`)

| Value | Description |
|---|---|
| `"clothing"` | Wearable apparel items (t-shirts, etc.) |
| `"accessories"` | Non-clothing wearable or carried items (sunglasses, etc.) |
| `"kitchen"` | Kitchen and home goods |
| `"hair"` | Hair care products |
| `"decor"` | Home decoration items |
| `"cycling"` | Cycling-related products and gear |

> These are **not enforced enums** — they are observed values in the seed data. Any string is valid.

## Key Relationships

```
┌──────────────────────────────────────────────────────────┐
│                  productcatalogservice                    │
│                                                          │
│  ┌──────────────┐       embeds        ┌───────────┐     │
│  │   Product     │ ──────────────────▶ │   Money   │     │
│  │              │    (price_usd)       │ (value    │     │
│  │  id          │                      │  object)  │     │
│  │  name        │                      └───────────┘     │
│  │  categories[]│                                        │
│  └──────┬───────┘                                        │
│         │                                                │
└─────────┼────────────────────────────────────────────────┘
          │
          │  referenced by (external, no enforced FK)
          ▼
  ┌───────────────┐   ┌─────────────────────┐   ┌──────────────────┐
  │ cartservice   │   │ checkoutservice     │   │ recommendation-  │
  │ (product_id)  │   │ (product_id in      │   │ service          │
  │               │   │  OrderItem)         │   │ (product_ids)    │
  └───────────────┘   └─────────────────────┘   └──────────────────┘
```

**Summary:**
- `Product` **embeds** `Money` (1:1 composition via `price_usd`)
- `Product.id` is **referenced externally** by `cartservice`, `checkoutservice`, and `recommendationservice` — but with no enforced foreign key constraint
- No cross-entity joins exist within this service; it is a single-entity catalog

## DTOs & Transfer Objects

### Empty `[request]`

Used in: `ListProducts` gRPC endpoint

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| *(none)* | — | — | — | Empty message; no parameters needed to list all products |

---

### ListProductsResponse `[response]`

Used in: `ListProducts` gRPC endpoint

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `products` | `repeated Product` | Yes | — | Complete list of all products in the catalog |

---

### GetProductRequest `[request]`

Used in: `GetProduct` gRPC endpoint

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `id` | `string` | Yes | Must match an existing product ID; returns `NOT_FOUND` otherwise | The unique product identifier to retrieve |

---

### SearchProductsRequest `[request]`

Used in: `SearchProducts` gRPC endpoint

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `query` | `string` | Yes | Non-empty string; matched case-insensitively against `name` and `description` | Free-text search query |

---

### SearchProductsResponse `[response]`

Used in: `SearchProducts` gRPC endpoint

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `results` | `repeated Product` | Yes | — | Products whose `name` or `description` contains the search query |

---

### Product `[domain-object]`

Used in: `ListProductsResponse.products`, `SearchProductsResponse.results`, `GetProduct` response, and referenced by `checkoutservice` and `recommendationservice`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `id` | `string` | Yes | Unique across catalog | Stable product identifier |
| `name` | `string` | Yes | Non-empty | Display name of the product |
| `description` | `string` | Yes | Non-empty | Full product description |
| `picture` | `string` | Yes | Valid relative path or URL | Product image reference |
| `price_usd` | `Money` | Yes | `units` ≥ 0, valid `currency_code` | Price of the product |
| `categories` | `repeated string` | No | — | Zero or more category tags |

---

### Money `[domain-object]`

Used in: `Product.price_usd`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `currency_code` | `string` | Yes | 3-letter ISO 4217 code | Currency denomination |
| `units` | `int64` | Yes | Same sign as `nanos` | Whole currency units |
| `nanos` | `int32` | Yes | `-999,999,999` ≤ value ≤ `999,999,999`; same sign as `units` | Fractional currency amount in nano-units |

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Common query and integration scenarios for productcatalogservice
- [proto/demo.proto](https://github.com/GoogleCloudPlatform/microservices-demo/blob/main/protos/demo.proto) — Canonical Protocol Buffer definitions for all service DTOs
- [src/productcatalogservice/products.json](https://github.com/GoogleCloudPlatform/microservices-demo/blob/main/src/productcatalogservice/products.json) — Seed data file containing all product entries
- [ARCHITECTURE.md](ARCHITECTURE.md) — System-wide architecture and inter-service communication patterns
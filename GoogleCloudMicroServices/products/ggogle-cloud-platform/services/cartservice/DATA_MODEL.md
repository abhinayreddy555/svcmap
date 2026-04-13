<!-- generated: 2026-04-13T05:06:29.746Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Data Model — CartService

## TL;DR for Agents

- **1 database entity** (`CartItem`) with a composite primary key of `(userId, productId)`, stored in **Spanner or AlloyDB**.
- **6 DTO/transfer objects** supporting 3 gRPC operations: `AddItem`, `GetCart`, `EmptyCart`, plus health checks.
- The **most important entity** is `CartItem` — it is the only persisted entity and represents a single line item in a user's shopping cart.
- **No foreign keys or cross-entity joins** exist; the data model is self-contained with no references to external entities.
- All gRPC operations are keyed on `UserId`; there is no separate `Cart` table — a cart is assembled at read time by querying all `CartItem` rows for a given user.

---

## Database Entities

### CartItem

Represents a single item in a user's shopping cart, stored in Spanner or AlloyDB. A user's full cart is reconstructed by selecting all `CartItem` rows matching a given `userId`.

| Field | Type | Nullable | Index | FK → | Description |
|---|---|---|---|---|---|
| `userId` | `string` | No | ✅ | — | User identifier |
| `productId` | `string` | No | ✅ | — | Product identifier |
| `quantity` | `int` | No | — | — | Quantity of the product in cart |

**Primary Key:** `composite(userId, productId)`

**Unique Constraints:** `composite(userId, productId)`

#### Relationships

`CartItem` has no foreign key relationships to other database entities within this service. The `userId` and `productId` fields are logical references to users and products managed by other microservices in the [microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) system, but they are not enforced at the database level.

---

## Enums

There are no explicitly defined enums in the extracted data model. The `HealthCheckResponse.Status` field uses a `ServingStatus` type with the following inferred values:

### ServingStatus

| Value | Description |
|---|---|
| `SERVING` | The service is healthy and accepting requests |
| `NOT_SERVING` | The service is unhealthy or not ready to accept requests |

---

## Key Relationships

There are **no cross-entity joins** in this service — `CartItem` is the sole database entity.

The logical data flow is:

- **User → CartItem (1:N):** A single `userId` can have many `CartItem` rows, one per distinct `productId`.
- **Product → CartItem (1:N):** A single `productId` can appear in many users' carts, but the product catalog is owned by a separate service.
- **Cart (domain object)** is not a persisted entity. It is assembled at query time by grouping `CartItem` rows by `userId`.

```
┌──────────────────────┐
│   External: User     │
│   (other service)    │
└──────────┬───────────┘
           │ 1
           │
           ▼ N
┌──────────────────────┐
│      CartItem        │
│──────────────────────│
│ PK: (userId,         │
│      productId)      │
│ quantity: int        │
└──────────┬───────────┘
           │ N
           │
           ▼ 1
┌──────────────────────┐
│  External: Product   │
│   (other service)    │
└──────────────────────┘
```

---

## DTOs & Transfer Objects

### AddItemRequest `[request]`

gRPC request to add an item to a user's cart.

**Used in:** `CartService.AddItem`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `UserId` | `string` | Yes | — | User identifier |
| `Item` | `CartItem` | Yes | — | Cart item to add (contains `ProductId` and `Quantity`) |

---

### GetCartRequest `[request]`

gRPC request to retrieve a user's cart.

**Used in:** `CartService.GetCart`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `UserId` | `string` | Yes | — | User identifier |

---

### EmptyCartRequest `[request]`

gRPC request to empty a user's cart (deletes all `CartItem` rows for the user).

**Used in:** `CartService.EmptyCart`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `UserId` | `string` | Yes | — | User identifier |

---

### Cart `[domain-object]`

Represents a user's shopping cart containing multiple items. This is **not a persisted entity** — it is assembled from `CartItem` rows at read time.

**Used in:** `CartService.GetCart`, `CartService.AddItem`, `CartService.EmptyCart`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `UserId` | `string` | No | — | User identifier; empty cart has no `userId` |
| `Items` | `CartItem[]` | Yes | — | List of items in the cart |

---

### CartItem `[domain-object]`

Represents a single item in a shopping cart with product and quantity. This DTO mirrors the database entity and is used as a nested object in requests and responses.

**Used in:** `CartService.AddItem`, `CartService.GetCart`, `Cart`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `ProductId` | `string` | Yes | — | Product identifier |
| `Quantity` | `int` | Yes | — | Quantity of the product |

---

### Empty `[response]`

gRPC empty response message returned for write operations.

**Used in:** `CartService.AddItem`, `CartService.EmptyCart`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| *(none)* | — | — | — | — |

---

### HealthCheckRequest `[request]`

gRPC health check request.

**Used in:** `HealthCheckService.Check`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| *(none)* | — | — | — | — |

---

### HealthCheckResponse `[response]`

gRPC health check response with serving status.

**Used in:** `HealthCheckService.Check`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `Status` | `ServingStatus` | Yes | — | Service serving status (`SERVING` or `NOT_SERVING`) |

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Common query patterns and operational scenarios for the cart service
- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Parent repository with all microservices and deployment configurations
- [src/cartservice/](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/src/cartservice) — Cart service source code and database client implementations
- [ARCHITECTURE.md](ARCHITECTURE.md) — System-wide architecture and inter-service communication overview
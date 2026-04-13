<!-- generated: 2026-04-13T05:06:48.499Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Table Map — cartservice

## TL;DR for Agents

- **cartservice** does **not** own any traditional relational database tables — it uses **Redis** as its sole data store for cart state.
- There are **0 SQL tables owned** and **0 tables read from other services** in this service.
- The most critical data structure is the Redis key-value store holding user cart entries (keyed by `userId`).
- Cart data is ephemeral/session-scoped and stored entirely in Redis via the `StackExchange.Redis` client.
- If you are looking for SQL table ownership or cross-service table reads, this document confirms **none exist** for `cartservice`.

## Tables Owned

`cartservice` does not own any relational database tables. All persistent state is managed through a **Redis** instance.

### Redis Data Structure: User Cart

Although not a traditional table, the following describes the logical data structure used in Redis:

| Aspect | Detail |
|---|---|
| **Store** | Redis (in-memory key-value store) |
| **Key pattern** | `userId` (string) |
| **Value structure** | Hash — each field is a `productId`, each value is a `quantity` (int) |
| **Client library** | `StackExchange.Redis` (.NET) |
| **Connection config** | Set via `REDIS_ADDR` environment variable |
| **TTL / Expiry** | None configured by default |

#### Logical Schema

| Field | Type | Description |
|---|---|---|
| `userId` | `string` | Redis key — identifies the user/session |
| `productId` | `string` | Redis hash field — the product in the cart |
| `quantity` | `int32` | Redis hash value — number of units of that product |

#### Feature Usage

| Feature / RPC | Operation | Description |
|---|---|---|
| `AddItem` | `HSET` / `HINCRBY` | Adds or increments a product quantity in the user's cart hash |
| `GetCart` | `HGETALL` | Retrieves all items in a user's cart |
| `EmptyCart` | `DEL` | Deletes the entire cart hash for a given `userId` |

#### Indexes

Redis does not use traditional indexes. Key lookup is O(1) by `userId`. Hash field lookup within a cart is O(1) by `productId`.

## Tables Read From Other Services

| Table | Owning Service | Access Method | Reason |
|---|---|---|---|
| *(none)* | — | — | `cartservice` does not read from any other service's database. It is a self-contained data owner. All inter-service communication occurs via gRPC, not shared database access. |

> **Note:** Other services (e.g., `checkoutservice`) call `cartservice` via its gRPC API (`hipstershop.CartService`) to read or empty cart data. There is no direct cross-service database coupling.

## See Also

- [DATABASE_CATALOG.md](DATABASE_CATALOG.md) — Full database catalog for all services in `microservices-demo`
- [SCENARIOS.md](SCENARIOS.md) — Common operational scenarios involving cart data
- [GoogleCloudPlatform/microservices-demo — `src/cartservice/`](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/src/cartservice) — Source code for `cartservice`
- [Redis data types documentation](https://redis.io/docs/data-types/) — Reference for hash and key-value patterns used by this service
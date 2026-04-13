<!-- generated: 2026-04-13T05:04:07.318Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# cartservice

> gRPC microservice that manages shopping carts for an e-commerce platform, with pluggable storage backends.

## TL;DR for Agents

- **What it does:** Provides gRPC endpoints to add items to a cart, retrieve a cart, and empty a cart for the [microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) e-commerce application.
- **Key dependencies:** Redis (primary), Google Cloud Spanner, AlloyDB (PostgreSQL-compatible), or in-memory cache as fallback — storage backend is selected at startup via environment variables.
- **Language & framework:** C# / ASP.NET Core with Kestrel HTTP/2 (gRPC). Start debugging in `src/cartservice/src/Startup.cs` for DI/configuration and `CartService` for request handling.
- **Database ownership:** Owns the shopping cart data model across all configured backends (Redis keys, Spanner `CartItems` table, AlloyDB `CartItems` table). All databases are shared infrastructure.
- **Testing:** xUnit integration tests spin up an in-process gRPC `TestServer` — no external dependencies required to run the test suite.

## Service Identity

| Attribute | Value |
|---|---|
| **Type** | API (gRPC) |
| **Language** | C# |
| **Framework** | ASP.NET Core |
| **Runtime** | .NET (Kestrel HTTP/2) |
| **Repo** | `GoogleCloudPlatform/microservices-demo` |
| **Source Path** | `src/cartservice/` |
| **Primary Database** | Redis (default); Spanner and AlloyDB supported |
| **Deployed on** | Kubernetes (GKE) |

## Responsibilities

### What it owns

- Storing and retrieving shopping cart contents per user session
- Adding items (product ID + quantity) to a user's cart
- Returning the full list of items in a user's cart
- Emptying / clearing a user's cart
- Health checking for readiness and liveness probes
- Selecting and initializing the appropriate storage backend at startup

### This service does NOT handle:

- Product catalog management
- Order processing
- Payment processing
- User authentication
- Inventory management

## Entry Points

| File | Description |
|---|---|
| `src/cartservice/src/Program.cs` | Application entry point — creates and runs the ASP.NET Core host |
| `src/cartservice/src/Startup.cs` | Configures dependency injection, selects the `ICartStore` implementation based on environment variables, and registers gRPC services |

## Key Abstractions

| Abstraction | Description |
|---|---|
| **`ICartStore`** | Interface defining the cart storage contract (`AddItemAsync`, `GetCartAsync`, `EmptyCartAsync`). All backends implement this. |
| **`RedisCartStore`** | Default implementation backed by Redis via `StackExchange.Redis` distributed caching. |
| **`SpannerCartStore`** | Implementation using Google Cloud Spanner with retriable transactions for strong consistency. |
| **`AlloyDBCartStore`** | Implementation using AlloyDB (PostgreSQL-compatible) for relational cart storage. |
| **`CartService`** | The gRPC service class that handles incoming RPC calls and delegates to the active `ICartStore`. |
| **`HealthCheckService`** | gRPC health check implementation for Kubernetes liveness/readiness probes. |

## What an Agent Needs to Know to Work on This Service

### Where to start

1. **Configuration & DI:** Open `src/cartservice/src/Startup.cs`. This is where the storage backend is chosen based on environment variables (e.g., `REDIS_ADDR`, `SPANNER_CONNECTION_STRING`, `ALLOYDB_*`). If no external store is configured, an in-memory cache is used as fallback.
2. **Business logic:** The `CartService` gRPC service class is thin — it validates requests and delegates to whichever `ICartStore` was injected.
3. **Adding a new backend:** Implement `ICartStore`, then add a selection branch in `Startup.cs`.

### Key patterns

- **Strategy pattern:** `ICartStore` abstracts storage; the concrete implementation is resolved at startup, not at request time.
- **gRPC-first:** All external communication uses gRPC (Protocol Buffers). The `.proto` file defines `AddItem`, `GetCart`, and `EmptyCart` RPCs.
- **Environment-driven configuration:** Backend selection and connection strings are entirely controlled by environment variables — no config files to manage.
- **Testing:** Integration tests use `Microsoft.AspNetCore.TestHost` to stand up a full in-process gRPC server. Run tests with:
  ```bash
  cd src/cartservice/tests
  dotnet test
  ```

### Common environment variables

| Variable | Purpose |
|---|---|
| `REDIS_ADDR` | Redis host:port (e.g., `redis-cart:6379`) |
| `SPANNER_CONNECTION_STRING` | Spanner connection string |
| `ALLOYDB_PRIMARY_IP` | AlloyDB primary instance IP |
| `PORT` | gRPC listen port (default varies) |

## Related Documents

- [API.md](API.md) — gRPC API surface, request/response schemas, and error codes
- [SCENARIOS.md](SCENARIOS.md) — Common operational scenarios and workflows
- [DEPENDENCIES.md](DEPENDENCIES.md) — Full dependency graph and database connection details
- [TABLE_MAP.md](TABLE_MAP.md) — Database table schemas across Redis, Spanner, and AlloyDB
- [RUNBOOK.md](RUNBOOK.md) — Troubleshooting, alerts, and operational procedures

## See Also

- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Parent repository and architecture overview
- [gRPC for .NET documentation](https://learn.microsoft.com/en-us/aspnet/core/grpc/) — Framework reference for the gRPC implementation
- [StackExchange.Redis](https://stackexchange.github.io/StackExchange.Redis/) — Redis client library used by `RedisCartStore`
- [Google Cloud Spanner .NET Client](https://cloud.google.com/dotnet/docs/reference/Google.Cloud.Spanner.Data/latest) — Client library used by `SpannerCartStore`
<!-- generated: 2026-04-13T05:08:10.931Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Coding Standards — cartservice

## TL;DR for Agents

- **Architecture**: Strategy Pattern with Dependency Injection — a gRPC service layer delegates to pluggable `ICartStore` implementations (Redis, Spanner, AlloyDB, in-memory) selected at startup via configuration.
- **Key rule**: All cart persistence logic MUST go behind the `ICartStore` interface in `src/cartstore/`; gRPC service handlers in `src/services/` MUST NOT contain storage logic directly.
- **Naming**: PascalCase for files (`RedisCartStore.cs`), classes, and public methods; camelCase for private fields and database columns (`userId`, `productId`).
- **Error handling**: Exceptions are caught generically and converted to `RpcException` with `StatusCode.FailedPrecondition` — no custom exception hierarchy exists.
- **Testing**: Integration tests use `TestServer` + `GrpcChannel` with the in-memory store; framework is xUnit.

---

## Architecture Pattern

The cartservice follows a **Strategy Pattern with Dependency Injection**. The gRPC transport layer is decoupled from data persistence through the `ICartStore` interface. At startup, the ASP.NET Core DI container registers exactly one `ICartStore` implementation as a singleton based on environment configuration. The gRPC service handlers receive this implementation via constructor injection and delegate all storage operations to it.

```
┌─────────────────────────────────────────────────────────┐
│                   gRPC Clients                          │
└──────────────────────┬──────────────────────────────────┘
                       │ protobuf
┌──────────────────────▼──────────────────────────────────┐
│              gRPC Service Layer                         │
│         src/services/CartService.cs                     │
│         src/services/HealthCheckService.cs              │
└──────────────────────┬──────────────────────────────────┘
                       │ ICartStore interface
┌──────────────────────▼──────────────────────────────────┐
│            Cart Store Abstraction                       │
│         src/cartstore/ICartStore.cs                     │
├─────────────┬──────────────┬───────────────┬────────────┤
│ RedisCart    │ SpannerCart   │ AlloyDBCart   │ InMemory   │
│ Store.cs    │ Store.cs      │ Store.cs     │ Cache      │
└──────┬──────┴──────┬────────┴──────┬───────┴────────────┘
       │             │               │
   Redis DB     Cloud Spanner    AlloyDB (PostgreSQL)
                                 + Secret Manager
```

---

## Layer Structure

| Layer | Directory | Responsibility | Can Call |
|---|---|---|---|
| **Configuration & Startup** | `src/` | ASP.NET Core configuration, DI setup, service registration, `ICartStore` implementation selection | gRPC Services, Cart Store implementations |
| **gRPC Services** | `src/services/` | gRPC endpoint handlers (`CartService`, `HealthCheckService`); delegates all persistence to `ICartStore` | `ICartStore` implementations |
| **Cart Store Abstraction** | `src/cartstore/` | Data persistence abstraction via `ICartStore` interface; concrete implementations for Redis, Spanner, AlloyDB, and in-memory backends | External databases (Redis, Spanner, AlloyDB, in-memory cache) |

> **Dependency rule**: Layers may only call downward. gRPC services MUST NOT call startup configuration. Cart store implementations MUST NOT reference gRPC service classes.

---

## Naming Conventions

| Category | Convention | Examples |
|---|---|---|
| **Files** | PascalCase with `.cs` extension | `CartService.cs`, `RedisCartStore.cs`, `ICartStore.cs` |
| **Classes** | PascalCase | `CartService`, `RedisCartStore`, `AlloyDBCartStore` |
| **Public methods** | PascalCase | `AddItemAsync`, `GetCartAsync`, `EmptyCartAsync` |
| **Private fields** | camelCase | `connectionString`, `tableName` |
| **Constants / static readonly** | PascalCase | `CartFieldName`, `SpannerProjectId` |
| **Database columns** | camelCase | `userId`, `productId`, `quantity` |

---

## Error Handling

All exceptions within gRPC service handlers are caught using generic `try-catch` blocks and converted to `RpcException` with `StatusCode.FailedPrecondition`. The exception's message is included in the `RpcException` detail string. There is **no custom exception hierarchy** and **no distinction between transient errors, validation errors, and infrastructure failures**. When adding new code, follow this existing pattern but be aware that this is a known limitation — exceptions are not logged before being rethrown as `RpcException`, which makes debugging difficult. Do not introduce new exception types without a broader refactoring effort.

```csharp
try
{
    await _cartStore.AddItemAsync(request.UserId, request.Item);
}
catch (Exception ex)
{
    throw new RpcException(new Status(StatusCode.FailedPrecondition, ex.Message));
}
```

---

## Logging

Logging uses `Console.WriteLine` for basic output. There is **no structured logging framework**, no correlation IDs, and no trace context propagation. Log statements should include the operation name and `userId` for traceability. When contributing new code, follow the existing `Console.WriteLine` pattern for consistency. Do not introduce a new logging framework (e.g., Serilog, NLog) in isolated changes — that would require a service-wide migration.

```csharp
Console.WriteLine($"AddItemAsync called with userId={request.UserId}");
```

---

## Authentication

There is **no authentication implemented**. gRPC service methods accept `userId` as a plain string parameter from the client without any validation, sanitization, or identity verification. This is by design for this demo/reference application. When generating or reviewing code, do not assume any authentication middleware is present. Do not add authentication to individual endpoints without coordinating with the broader service mesh or gateway configuration.

---

## Testing Approach

Integration tests use the **xUnit** framework with ASP.NET Core's `TestServer` and `GrpcChannel` to exercise cart operations end-to-end through the gRPC layer. Tests default to the **in-memory store** implementation, avoiding external database dependencies. Tests verify complete workflows: adding items, retrieving carts, and emptying carts. When writing new tests, follow this integration-test-first approach — there are no unit test conventions for isolated class testing in this codebase.

```csharp
// Pattern: create TestServer → build GrpcChannel → call service methods → assert results
var server = new TestServer(hostBuilder);
var channel = GrpcChannel.ForAddress(server.BaseAddress, new GrpcChannelOptions { ... });
var client = new CartService.CartServiceClient(channel);
```

---

## Notable Patterns

### Strategy Pattern — Pluggable Cart Stores

The `ICartStore` interface (`src/cartstore/ICartStore.cs`) defines the contract for all persistence operations. Concrete implementations are selected at startup based on environment variables or configuration. This allows swapping backends without modifying the gRPC service layer.

| Implementation | File | Backend |
|---|---|---|
| `RedisCartStore` | `src/cartstore/RedisCartStore.cs` | Redis / `IDistributedMemoryCache` |
| `SpannerCartStore` | `src/cartstore/SpannerCartStore.cs` | Google Cloud Spanner |
| `AlloyDBCartStore` | `src/cartstore/AlloyDBCartStore.cs` | AlloyDB (PostgreSQL) + Secret Manager |

**When adding a new backend**: create a new class implementing `ICartStore` in `src/cartstore/`, then register it in the DI container in the startup configuration.

### Dependency Injection — Singleton Registration

The ASP.NET Core DI container registers the chosen `ICartStore` implementation as a **singleton**. This means all gRPC requests share the same store instance. New store implementations must be thread-safe.

```csharp
// In startup configuration
services.AddSingleton<ICartStore>(provider => new RedisCartStore(/* ... */));
```

### gRPC Service Base Class Inheritance

Service classes inherit from protobuf-generated base classes. Do not create gRPC service classes from scratch — always inherit from the generated base and override the relevant methods.

```csharp
public class CartService : Hipstershop.CartService.CartServiceBase
{
    public override async Task<Empty> AddItem(AddItemRequest request, ServerCallContext context)
    {
        // implementation
    }
}
```

---

## Anti-Patterns to Avoid

- **SQL injection via string interpolation** — `AlloyDBCartStore` uses `$"WHERE userID='{userId}'"` instead of parameterized queries. Do NOT replicate this pattern. Use parameterized queries as `SpannerCartStore` does correctly.
- **Inconsistent query parameterization** — If you add SQL-based stores, ALWAYS use parameterized queries (`@userId`), never string interpolation for user-supplied values.
- **No input validation** — `userId` and `productId` are accepted without validation or sanitization. Be aware of this when writing code that processes these values.
- **Unnecessary `Task.Run` wrapping** — Some methods (e.g., in `SpannerCartStore`) wrap already-async operations in `Task.Run`. Do not add new `Task.Run` wrappers around async calls; use `async`/`await` directly.
- **Creating new `NpgsqlDataSource` per operation** — `AlloyDBCartStore` creates a new data source per call instead of reusing a pooled connection. Do not replicate this; use a shared, pooled data source.
- **Incomplete `Ping()` implementation** — `HealthCheckService.Ping()` always returns `true` without testing actual database connectivity. Do not rely on it for real health checks.
- **Swallowing exceptions without logging** — Exceptions are caught and converted to `RpcException` but never logged. At minimum, add a `Console.WriteLine` before rethrowing.
- **Inconsistent column name casing** — `AlloyDBCartStore` uses `'userID'` in SQL but `userId` in C# parameters. Keep column references consistent with the database schema.
- **Hardcoded table names without schema validation** — Table names are stored as static strings. Do not scatter table name literals across methods; use the existing constant/field pattern.

---

## See Also

- [ICartStore interface](src/cartstore/ICartStore.cs) — Core abstraction for all storage backends
- [CartService gRPC handler](src/services/CartService.cs) — Primary gRPC endpoint implementation
- [SCENARIOS.md](SCENARIOS.md) — Common development and deployment scenarios
- [README.md](README.md) — Service overview, build instructions, and configuration
<!-- generated: 2026-04-13T05:14:27.246Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Coding Standards — checkoutservice

## TL;DR for Agents

- **Architecture**: Go-based gRPC microservice using Protocol Buffers for service contracts; three layers — gRPC handlers → business logic → generated protobuf types.
- **Key rule**: All exported functions use `PascalCase`, all files use `snake_case.go`, and error handling uses explicit error returns (avoid `Must()`/panic in new code).
- **Code generation**: Protobuf types live in `src/checkoutservice/genproto/` and are generated via `genproto.sh` using `protoc`; do not hand-edit `*.pb.go` or `*_grpc.pb.go` files.
- **Testing**: Use table-driven tests in `_test.go` files within the same package; every new function needs corresponding test cases.
- **Error types**: Return custom sentinel errors (`ErrInvalidValue`, `ErrMismatchingCurrency`) for domain logic; use `status.Errorf` with gRPC status codes at the handler layer.

---

## Architecture Pattern

The `checkoutservice` follows a **gRPC microservices architecture** with Protocol Buffers defining the service contract. The service is written in Go and communicates with other services (cart, product catalog, shipping, payment, email, currency) exclusively over gRPC.

```
┌─────────────────────────────────────────────────────┐
│                  External gRPC Clients              │
│          (frontend, other microservices)             │
└──────────────────────┬──────────────────────────────┘
                       │ gRPC
                       ▼
┌─────────────────────────────────────────────────────┐
│          gRPC Service Handlers (main.go)            │
│   src/checkoutservice/                              │
│   - Receives requests, orchestrates calls           │
│   - Returns gRPC status codes on failure            │
├─────────────────────────────────────────────────────┤
│       Business Logic & Utilities                    │
│   src/checkoutservice/money/                        │
│   - Money validation, arithmetic, comparison        │
│   - Domain error types                              │
├─────────────────────────────────────────────────────┤
│       Protocol Buffers (genproto)                   │
│   src/checkoutservice/genproto/                     │
│   - Auto-generated message types (demo.pb.go)       │
│   - Auto-generated gRPC stubs (demo_grpc.pb.go)     │
│   - DO NOT EDIT MANUALLY                            │
└─────────────────────────────────────────────────────┘
```

Each layer only calls downward. Handlers call business logic and utilities; business logic operates on protobuf-generated types. Generated code never calls upward.

---

## Layer Structure

| Layer | Directory | Responsibility | Can Call |
|---|---|---|---|
| **gRPC Service Handlers** | `src/checkoutservice/` | gRPC server implementation; request/response handling; orchestration of downstream service calls | Business Logic & Utilities, Protocol Buffers |
| **Business Logic & Utilities** | `src/checkoutservice/money/` | Domain logic — money validation, arithmetic (`Sum`, `Negate`), comparison operations; custom error types | Protocol Buffers (genproto) |
| **Protocol Buffers (genproto)** | `src/checkoutservice/genproto/` | Auto-generated service contract definitions, message types, gRPC client/server stubs | _(none — leaf layer)_ |

---

## Naming Conventions

### Files

| Convention | Format | Examples |
|---|---|---|
| Source files | `snake_case.go` | `money.go`, `main.go` |
| Test files | `snake_case_test.go` | `money_test.go` |
| Generated protobuf | `<name>.pb.go`, `<name>_grpc.pb.go` | `demo.pb.go`, `demo_grpc.pb.go` |
| Scripts | `snake_case.sh` | `genproto.sh` |

### Functions & Methods

| Convention | Format | Examples |
|---|---|---|
| Exported (public) | `PascalCase` | `IsValid`, `Sum`, `Negate`, `Must` |
| Unexported (private) | `camelCase` | `signMatches` |

### Constants & Variables

| Convention | Format | Examples |
|---|---|---|
| Unexported constants | `camelCase` | `nanosMin`, `nanosMax`, `nanosMod` |
| Exported error sentinels | `PascalCase` with `Err` prefix | `ErrInvalidValue`, `ErrMismatchingCurrency` |

### Classes / Structs

Go does not use classes. Struct types and interfaces follow standard Go `PascalCase` for exported types. Auto-generated types (e.g., `PlaceOrderRequest`, `CartServiceServer`) follow protobuf naming conventions.

### Database Columns

Not applicable — `checkoutservice` does not directly manage a database.

---

## Error Handling

The `checkoutservice` uses **explicit error returns** as the primary error-handling mechanism, following idiomatic Go conventions. Domain-level errors are expressed as custom sentinel error variables (e.g., `ErrInvalidValue`, `ErrMismatchingCurrency`) defined in the `money` package, enabling callers to check error identity with `errors.Is()`. At the gRPC handler layer, errors are translated into gRPC status codes using `status.Errorf(codes.XXX, "message")` — for example, `codes.Unimplemented` for methods not yet implemented, `codes.InvalidArgument` for bad input, and `codes.Internal` for unexpected failures. A `Must()` helper function exists that panics on error for chaining operations where failure is considered unrecoverable; however, **new code should avoid `Must()` in production paths** and prefer explicit error propagation. Every function that can fail must return an `error` as its last return value.

---

## Logging

The codebase does not currently employ a structured logging framework in the provided `money` package or generated code. gRPC error propagation via `status.Errorf` serves as the primary mechanism for communicating failures to callers. When adding logging to new code, prefer a structured logger (e.g., `log/slog` or `go.uber.org/zap`) and include contextual fields such as request IDs, order IDs, and downstream service names. Avoid logging sensitive data such as payment credentials or personally identifiable information.

---

## Authentication

Authentication is not explicitly implemented in the provided `checkoutservice` code. The gRPC framework supports an **interceptor pattern** (`grpc.UnaryServerInterceptor`, `grpc.StreamServerInterceptor`) that can be used to inject authentication and authorization middleware at the server level. If auth is required, implement it as a gRPC unary interceptor that validates credentials (e.g., JWT tokens, API keys) from request metadata before the handler executes. Do not embed authentication logic directly in service handler methods.

---

## Testing Approach

Tests follow the **table-driven test pattern**, the idiomatic Go approach for parameterized testing. Test files are placed in the same package with a `_test.go` suffix (e.g., `money_test.go` alongside `money.go`). Each test function defines a slice of anonymous structs containing a descriptive name, inputs, and expected outputs, then iterates over them using `t.Run()` for clear sub-test reporting.

Helper functions (e.g., `mmc` to construct `Money` messages, `mm` for shorthand) reduce boilerplate in test data setup. Tests cover validation (`TestIsValid`), arithmetic (`TestSum`), and edge cases (currency mismatches, overflow, sign mismatches).

**When writing new code:**
- Every exported function must have a corresponding table-driven test.
- Use `t.Run(tc.name, ...)` for each test case to enable selective test execution.
- Place test helpers as unexported functions in the `_test.go` file.

```go
// Example: table-driven test structure
func TestSum(t *testing.T) {
    tests := []struct {
        name   string
        a, b   *pb.Money
        want   *pb.Money
        hasErr bool
    }{
        {"zero+zero", mmc(0, 0, "USD"), mmc(0, 0, "USD"), mmc(0, 0, "USD"), false},
        {"currency mismatch", mmc(1, 0, "USD"), mmc(1, 0, "EUR"), nil, true},
        // ... more cases
    }
    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            got, err := Sum(tc.a, tc.b)
            if tc.hasErr && err == nil {
                t.Error("expected error, got nil")
            }
            // ... assertions
        })
    }
}
```

---

## Notable Patterns

### Protocol Buffers Code Generation

Protobuf types and gRPC stubs are generated from `.proto` files using the `genproto.sh` script. This produces two files in `src/checkoutservice/genproto/`:

- `demo.pb.go` — message types (e.g., `PlaceOrderRequest`, `OrderResult`, `Money`)
- `demo_grpc.pb.go` — gRPC client/server interfaces and registration functions

**Rule:** Never hand-edit files in `genproto/`. Regenerate by running:

```bash
src/checkoutservice/genproto.sh
```

### gRPC Service Interface Pattern

Auto-generated code provides both client and server interfaces for each service, plus an `Unimplemented` base struct for forward compatibility:

```go
// Server interface — implement this
type CheckoutServiceServer interface {
    PlaceOrder(context.Context, *PlaceOrderRequest) (*PlaceOrderResponse, error)
    mustEmbedUnimplementedCheckoutServiceServer()
}

// Embed for forward compatibility
type UnimplementedCheckoutServiceServer struct{}

// Registration
grpc.RegisterService(s, &CheckoutService_ServiceDesc, srv)
```

Always embed `UnimplementedXXXServer` in your server struct to ensure forward compatibility when new RPC methods are added to the proto definition.

### Money Value Object

The `money` package implements a domain-driven **value object** for monetary amounts, encapsulating `units` (int64), `nanos` (int32), and `currency_code` (string). It provides:

| Function | Purpose |
|---|---|
| `IsValid(m)` | Validates sign consistency, nanos range, currency presence |
| `IsZero(m)` | Checks if amount is zero |
| `IsPositive(m)` / `IsNegative(m)` | Sign checks |
| `Sum(a, b)` | Adds two `Money` values (same currency required) |
| `Negate(m)` | Returns the negated value |
| `MultiplySlow(m, n)` | Multiplies by a positive integer via repeated addition |

```go
// src/checkoutservice/money/money.go
total, err := money.Sum(subtotal, shippingCost)
if err != nil {
    return nil, status.Errorf(codes.Internal, "failed to sum: %v", err)
}
```

### Table-Driven Tests

All test functions use the table-driven pattern with named sub-tests. This ensures consistent structure, easy extensibility, and clear failure output:

```go
func TestIsValid(t *testing.T) {
    tests := []struct {
        name string
        in   *pb.Money
        want bool
    }{
        {"valid positive", mmc(1, 100000000, "USD"), true},
        {"missing currency", mmc(1, 0, ""), false},
        // ...
    }
    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            if got := IsValid(tc.in); got != tc.want {
                t.Errorf("IsValid(%v) = %v, want %v", tc.in, got, tc.want)
            }
        })
    }
}
```

### Must() Error Handling Helper

The `Must()` function wraps an operation and panics if it returns an error. It is used internally in `MultiplySlow` for chaining `Sum` calls:

```go
func Must(v *pb.Money, err error) *pb.Money {
    if err != nil {
        panic(err)
    }
    return v
}
```

> ⚠️ **Caution:** Prefer explicit error returns in new code. `Must()` is acceptable only in initialization code or tests — never in request-handling paths where a panic would crash the server.

---

## Anti-Patterns to Avoid

- **Do not hand-edit generated code.** Files in `src/checkoutservice/genproto/` (`demo.pb.go`, `demo_grpc.pb.go`) are auto-generated. Changes will be overwritten. Modify the `.proto` source and regenerate instead.
- **Do not use `Must()` / panic in request-handling code.** A panic in a gRPC handler crashes the goroutine (or the entire server without recovery middleware). Always return errors explicitly via `(result, error)` return signatures.
- **Do not skip input validation in gRPC handlers.** Validate all incoming request fields at the handler layer before passing data to business logic. Use `codes.InvalidArgument` for bad input.
- **Do not ignore context deadlines and cancellation.** Pass `context.Context` through to all downstream gRPC calls and check `ctx.Err()` for cancellation. Failing to do so can cause goroutine leaks and cascading timeouts.
- **Do not return bare `codes.Unimplemented` without logging.** When an unimplemented method is called, log the event at `WARN` level with the method name to aid debugging and monitoring.
- **Avoid checking generated code into version control when possible.** Prefer generating protobuf code at build time via CI/CD. If generated code must be committed (as currently done), ensure it is always regenerated from the canonical `.proto` files before merging.

---

## See Also

- [genproto.sh](src/checkoutservice/genproto.sh) — Protocol Buffers code generation script
- [money/money.go](src/checkoutservice/money/money.go) — Money value object implementation and domain errors
- [money/money_test.go](src/checkoutservice/money/money_test.go) — Table-driven test examples for the money package
- [genproto/demo.pb.go](src/checkoutservice/genproto/demo.pb.go) — Auto-generated protobuf message types and gRPC service definitions
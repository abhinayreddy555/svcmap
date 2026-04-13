<!-- generated: 2026-04-13T05:13:21.873Z | model: claude-opus-4-6 | sha: c9857ee5 -->



# Error Catalogue — checkoutservice

## TL;DR for Agents

- **Total catalogued error codes: 2** — `ErrInvalidValue` and `ErrMismatchingCurrency` from the `money` utility package; plus standard gRPC `Unimplemented` status on stub methods.
- **No global error handling middleware** is present in the analyzed code; errors propagate via standard Go `error` returns and gRPC status codes.
- **Neither custom error is retryable** — both `ErrInvalidValue` and `ErrMismatchingCurrency` indicate client-side logic bugs that require code or input fixes.
- **gRPC `Unimplemented`** is returned by auto-generated service stubs when a method has no concrete implementation — this is never retryable.
- If you are investigating a checkout failure involving currency or monetary amounts, this document is relevant. For upstream/downstream service errors, check the specific service's error catalogue.

## Global Error Handling

No global error handling middleware was detected in the analyzed codebase for `checkoutservice`. The inspected source consists of generated protobuf files (`demo.pb.go`, `demo_grpc.pb.go`), a shell script for proto generation (`genproto.sh`), and a money utility package (`money.go`, `money_test.go`). Errors are returned using standard Go idioms — functions return `error` values that callers are expected to check. The gRPC generated code relies on the standard `google.golang.org/grpc/status` and `google.golang.org/grpc/codes` packages to surface unimplemented method errors. The money package defines two package-level sentinel errors (`ErrInvalidValue`, `ErrMismatchingCurrency`) that are returned directly from the `Sum()` function. There is no centralized error-to-HTTP-status mapping, no interceptor chain, and no structured error logging layer in the analyzed code.

## Error Reference

| Code | gRPC / HTTP Status | Category | Retryable | Description | When It Occurs | Recovery Hint |
|---|---|---|---|---|---|---|
| `ErrInvalidValue` | No direct mapping (propagated as Go `error`) | Validation | ❌ No | A monetary value is invalid (e.g., mismatched sign between units and nanos, or nanos out of range). | Returned by `money.Sum()` when either operand or the computed result fails the `IsValid()` check. | Inspect the `Money` operands being passed to `Sum()`. Ensure `Units` and `Nanos` have the same sign and that `Nanos` is within `[-999999999, 999999999]`. This is a caller bug — fix the input data. |
| `ErrMismatchingCurrency` | No direct mapping (propagated as Go `error`) | Validation | ❌ No | Two monetary amounts with different currency codes were passed to an operation that requires them to match. | Returned by `money.Sum()` when `l.CurrencyCode != r.CurrencyCode`. | Ensure both `Money` values share the same `CurrencyCode` before calling `Sum()`. Convert one operand to the other's currency using `currencyservice` before retrying the operation. |
| `codes.Unimplemented` | gRPC `12` / HTTP `501` | Server | ❌ No | A gRPC method was called on the default stub that has no concrete implementation. | Returned by auto-generated `Unimplemented*Server` structs in `demo_grpc.pb.go` when the real service handler has not been registered or a method is missing. | This indicates a deployment or build issue — the service binary is running but the method handler was never registered. Verify the service was compiled with the correct implementation and that `Register*Server()` was called at startup. |

### Notes on Error Propagation

The `money` package errors do not carry gRPC status codes themselves. When these errors bubble up through a gRPC handler in `checkoutservice`, the gRPC framework will typically wrap them as `codes.Internal` (gRPC `13` / HTTP `500`) unless the handler explicitly maps them to a more specific status. If you see a generic `Internal` error during checkout with a message containing `"invalid value"` or `"mismatching currency"`, trace it back to the `money.Sum()` call path.

```go
// Sentinel errors defined in money.go
var ErrInvalidValue        = errors.New("one of the specified money values is invalid")
var ErrMismatchingCurrency = errors.New("mismatching currency codes")
```

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Common failure scenarios and runbooks for `checkoutservice`
- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Upstream repository and full source
- [gRPC Status Codes Reference](https://grpc.github.io/grpc/core/md_doc_statuscodes.html) — Canonical gRPC status code definitions and HTTP mappings
- [currencyservice Error Catalogue](../currencyservice/ERRORS.md) — Errors from the currency conversion service, relevant when `ErrMismatchingCurrency` requires upstream conversion
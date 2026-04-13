<!-- generated: 2026-04-13T05:07:23.297Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Error Catalogue — cartservice

## TL;DR for Agents

- **1 total error code** documented for `cartservice`: `FAILED_PRECONDITION`.
- **Most common error:** `FAILED_PRECONDITION` — a catch-all gRPC status returned when any backend storage (Redis, Spanner, AlloyDB) is unreachable or throws during cart operations.
- **All errors are retryable** — retry after confirming backend storage health and connectivity.
- This service uses **gRPC status codes**, not HTTP status codes. There are no HTTP-level error mappings.
- If you see `Grpc.Core.RpcException` with `StatusCode.FailedPrecondition` from `cartservice`, start by checking the backing datastore (Redis / Spanner / AlloyDB) connectivity and logs.

## Global Error Handling

The `cartservice` does **not** use global error-handling middleware. Instead, error handling is implemented **per-method** within each cart store implementation (`RedisCartStore`, `SpannerCartStore`, `AlloyDBCartStore`). When any of the cart operations (`AddItemAsync`, `GetCartAsync`, `EmptyCartAsync`) encounters an exception while communicating with the backing datastore, the exception is caught at the store layer and re-thrown as a `Grpc.Core.RpcException` with `StatusCode.FailedPrecondition`. This means all storage-level failures — whether they are transient network errors, authentication failures, or datastore outages — surface to the caller as the same gRPC status code. The original exception details may be included in the `RpcException` message but are not exposed as distinct error codes. In the `Development` environment, ASP.NET Core's `DeveloperExceptionPage` is enabled via `Startup.Configure()`, which can provide additional diagnostic detail for unhandled exceptions outside the gRPC pipeline, but this does not affect the gRPC error responses returned to callers.

## Error Reference

| Code | HTTP Status | Category | Retryable | Description | When It Occurs | Recovery Hint |
|------|-------------|----------|-----------|-------------|----------------|---------------|
| `FAILED_PRECONDITION` | N/A (gRPC only) | other | ✅ Yes | Cart storage is inaccessible or an internal error occurred during cart operations | `AddItemAsync`, `GetCartAsync`, or `EmptyCartAsync` encounters any exception when accessing Redis, Spanner, or AlloyDB | Retry the operation after verifying backend storage connectivity and health |

### Notes on `FAILED_PRECONDITION`

- **Root causes** can vary widely since all storage exceptions are wrapped into this single status code. Common causes include:
  - Redis connection timeout or refused connection
  - Spanner deadline exceeded or session pool exhaustion
  - AlloyDB authentication failure or network partition
- **Diagnosis steps:**
  1. Check the `cartservice` application logs for the original exception message and stack trace.
  2. Verify the backing datastore is healthy (e.g., `redis-cli ping`, Spanner instance status, AlloyDB connectivity).
  3. Confirm environment variables / connection strings for the selected storage backend are correct.
  4. Check network policies or firewall rules between `cartservice` and the datastore.
- **Retry strategy:** Because the error is retryable, implement exponential backoff. However, if the underlying datastore is down, retries alone will not resolve the issue — the storage backend must be restored first.

```
# Example: quick Redis health check from within the cluster
kubectl exec -it <redis-pod> -- redis-cli ping
# Expected response: PONG
```

## See Also

- [microservices-demo repository](https://github.com/GoogleCloudPlatform/microservices-demo) — source code and deployment manifests
- [src/cartservice/](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/src/cartservice) — `cartservice` source including store implementations
- [gRPC Status Codes reference](https://grpc.github.io/grpc/core/md_doc_statuscodes.html) — canonical gRPC status code definitions and usage guidance
- [SCENARIOS.md](SCENARIOS.md) — common failure scenarios and runbooks for this service
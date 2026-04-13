<!-- generated: 2026-04-13T05:23:49.436Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Error Catalogue — recommendationservice

## TL;DR for Agents

- **4 total error codes** documented for `recommendationservice` in `GoogleCloudPlatform/microservices-demo`.
- **Most likely error in incidents:** `GRPC_UNAVAILABLE` — the recommendation service cannot reach `productcatalogservice` via gRPC; this is the primary upstream dependency failure mode.
- **Only `GRPC_UNAVAILABLE` is retryable** — all other errors require configuration fixes or code changes.
- **`MISSING_ENV_VAR_PRODUCT_CATALOG_SERVICE_ADDR`** is a fatal startup error — the process will terminate immediately if this env var is unset.
- If you see `GRPC_UNIMPLEMENTED`, the servicer subclass is missing a method override — this is a development/deployment mismatch, not a transient issue.

## Global Error Handling

The `recommendationservice` does **not** have global error-handling middleware. Individual gRPC service methods use `context.set_code()` and `context.set_details()` to communicate error status codes back to callers. Unhandled exceptions raised within `RecommendationService.ListRecommendations` will propagate as gRPC errors to the caller. Startup-time errors — specifically a missing `PRODUCT_CATALOG_SERVICE_ADDR` environment variable — raise a Python `Exception` and terminate the process immediately. Initialization errors related to tracing and the Cloud Profiler are caught and logged at the `WARNING` level but do **not** prevent the service from starting.

## Error Reference

| Code | HTTP Status | Category | Retryable | Description | When It Occurs | Recovery Hint |
|------|-------------|----------|-----------|-------------|----------------|---------------|
| `GRPC_UNIMPLEMENTED` | N/A | other | ❌ No | gRPC method not implemented | When any base servicer method is called without being overridden in the subclass (e.g., `RecommendationServiceServicer.ListRecommendations`, `CartServiceServicer.AddItem`, `ProductCatalogServiceServicer.ListProducts`, etc.) | Implement the service method in the servicer subclass. This indicates a code or deployment issue — ensure the correct service image is deployed. |
| `GRPC_UNAVAILABLE` | N/A | upstream | ✅ Yes | gRPC service unavailable or connection failed | When `product_catalog_stub.ListProducts()` fails because the upstream service at `PRODUCT_CATALOG_SERVICE_ADDR` is unreachable inside `RecommendationService.ListRecommendations` | Verify the `PRODUCT_CATALOG_SERVICE_ADDR` environment variable is set correctly and that `productcatalogservice` is running and healthy. Check network policies, DNS resolution, and service mesh configuration. |
| `MISSING_ENV_VAR_PRODUCT_CATALOG_SERVICE_ADDR` | N/A | other | ❌ No | Required environment variable `PRODUCT_CATALOG_SERVICE_ADDR` not set | During `recommendation_server.py` startup when `PRODUCT_CATALOG_SERVICE_ADDR` resolves to an empty string | Set the `PRODUCT_CATALOG_SERVICE_ADDR` environment variable (e.g., `productcatalogservice:3550`) before starting the service. In Kubernetes, verify the Deployment manifest or ConfigMap. **This is a fatal error — the process will exit.** |
| `GRPC_HEALTH_CHECK_UNIMPLEMENTED` | N/A | other | ❌ No | gRPC health check `Watch` method not implemented | When `health_pb2_grpc.Watch()` is called on the recommendation service's health endpoint | Use the `Check` method instead of `Watch` for health status polling. Kubernetes gRPC liveness/readiness probes typically use `Check`, so this error usually only surfaces with streaming health-check clients. |

### Quick Triage by Category

| Category | Codes | Typical Action |
|----------|-------|----------------|
| **upstream** | `GRPC_UNAVAILABLE` | Check `productcatalogservice` health, network connectivity, DNS |
| **other** | `GRPC_UNIMPLEMENTED`, `MISSING_ENV_VAR_PRODUCT_CATALOG_SERVICE_ADDR`, `GRPC_HEALTH_CHECK_UNIMPLEMENTED` | Check deployment config, env vars, and service image version |

### Key Environment Variables

| Variable | Required | Example Value | Used By |
|----------|----------|---------------|---------|
| `PRODUCT_CATALOG_SERVICE_ADDR` | ✅ Yes | `productcatalogservice:3550` | gRPC stub for fetching product catalog in `ListRecommendations` |

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Common failure scenarios and runbooks for `recommendationservice`
- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Source repository and deployment manifests
- [Kubernetes gRPC health checking](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#define-a-grpc-liveness-probe) — Configuring gRPC health probes for Kubernetes
- [gRPC Status Codes](https://grpc.github.io/grpc/core/md_doc_statuscodes.html) — Official reference for gRPC status codes (`UNAVAILABLE`, `UNIMPLEMENTED`, etc.)
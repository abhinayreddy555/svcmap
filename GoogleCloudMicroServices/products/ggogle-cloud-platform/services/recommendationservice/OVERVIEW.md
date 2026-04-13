<!-- generated: 2026-04-13T05:19:38.914Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# recommendationservice

> Microservice that provides product recommendations by filtering the product catalog and returning a random sample of products not already in the user's cart.

## TL;DR for Agents

- **What it does:** Accepts a user's cart contents via gRPC, fetches the full product catalog from `product-catalog-service`, filters out products already in the cart, and returns a random subset as recommendations.
- **Key dependency:** Relies entirely on `product-catalog-service` (gRPC `ListProducts` RPC) — if that service is down, recommendations fail.
- **No database:** This service is stateless; it owns no database and persists nothing.
- **Entry point for bugs:** Start at `src/recommendationservice/recommendation_server.py` — all business logic lives there.
- **Observability:** Exports traces to an OpenTelemetry Collector via OTLP; supports Google Cloud Profiler.

## Service Identity

| Attribute          | Value                                              |
| ------------------ | -------------------------------------------------- |
| **Type**           | API (gRPC)                                         |
| **Language**       | Python                                             |
| **Framework**      | gRPC                                               |
| **Runtime**        | Python 3                                           |
| **Repo**           | `GoogleCloudPlatform/microservices-demo`            |
| **Primary Database** | None (stateless)                                 |
| **Deployed on**    | Kubernetes (as part of the microservices-demo stack) |

## Responsibilities

### What it owns

- Serving the `ListRecommendations` gRPC RPC endpoint.
- Fetching the full product list from `product-catalog-service`.
- Filtering out products that are already in the requesting user's cart.
- Returning a random sample of the remaining products as recommendations.
- Exposing a gRPC Health Check endpoint for liveness/readiness probes.

### This service does NOT handle:

- **Product catalog management** — delegates entirely to `product-catalog-service`.
- **Profiling** — uses Google Cloud Profiler as an external concern.
- **Distributed tracing** — uses OpenTelemetry with an OTLP exporter; trace collection/storage is handled by the OpenTelemetry Collector.
- **User or cart state management** — cart product IDs are passed in per-request; no user state is stored.

## Entry Points

| File | Description |
| ---- | ----------- |
| `src/recommendationservice/recommendation_server.py` | gRPC server bootstrap: initializes `RecommendationService`, sets up tracing/profiling, connects to `ProductCatalogService`, and listens on the configured port. **Start here for all debugging.** |
| `src/recommendationservice/client.py` | Test client that makes `ListRecommendations` RPC calls to the service for manual/ad-hoc testing. |

## Key Abstractions

| Abstraction | Description |
| ----------- | ----------- |
| **RecommendationService** | Core service class implementing the `ListRecommendations` RPC handler. Contains the filtering and random-sampling logic. |
| **ProductCatalogServiceStub** | gRPC client stub used to call `ListProducts` on the upstream `product-catalog-service`. |
| **ListRecommendationsRequest** | Protobuf message containing the user ID and a list of product IDs currently in the user's cart. |
| **ListRecommendationsResponse** | Protobuf message containing the list of recommended product IDs. |
| **CustomJsonFormatter** | Log formatter that outputs structured JSON logs for cloud-native log aggregation. |
| **GrpcInstrumentorClient / GrpcInstrumentorServer** | OpenTelemetry instrumentors that automatically create trace spans for inbound and outbound gRPC calls. |

## What an Agent Needs to Know to Work on This Service

### Where to start

All meaningful logic is in a single file: `src/recommendationservice/recommendation_server.py`. The recommendation algorithm is straightforward:

1. Call `product-catalog-service.ListProducts()` to get all products.
2. Remove any product IDs found in the incoming request's `product_ids` (cart items).
3. Return a random sample from the remaining products.

### Key patterns

- **Stateless design** — no database, no cache, no local state. Every request is self-contained.
- **gRPC throughout** — both the server interface and the outbound call to `product-catalog-service` use gRPC. Protobuf definitions live in the shared `protos/` directory at the repo root.
- **OpenTelemetry auto-instrumentation** — `GrpcInstrumentorClient` and `GrpcInstrumentorServer` are attached at startup; no manual span creation is needed for standard RPC calls.
- **Health checks** — the service registers a gRPC Health Check handler. Kubernetes probes should target this.
- **Environment-driven config** — the port, upstream service address, and collector endpoint are configured via environment variables (check the Kubernetes manifests or `recommendation_server.py` for `os.environ` calls).

### Common debugging steps

1. Verify `product-catalog-service` is reachable — this is the single point of failure.
2. Check structured JSON logs for gRPC error codes.
3. Use `src/recommendationservice/client.py` to send test requests directly.

## Related Documents

- [API.md](API.md) — gRPC API surface, request/response schemas, and error codes.
- [SCENARIOS.md](SCENARIOS.md) — Common operational scenarios and edge cases.
- [DEPENDENCIES.md](DEPENDENCIES.md) — Full dependency graph including `product-catalog-service` and OpenTelemetry Collector.
- [RUNBOOK.md](RUNBOOK.md) — Incident response procedures and health check details.

## See Also

- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Parent repository with deployment manifests and architecture overview.
- [gRPC Health Checking Protocol](https://github.com/grpc/grpc/blob/master/doc/health-checking.md) — Specification for the health check mechanism used by this service.
- [OpenTelemetry Python SDK](https://opentelemetry.io/docs/languages/python/) — Documentation for the tracing instrumentation used in this service.
- [DEPENDENCIES.md](DEPENDENCIES.md) — Detailed outbound dependency configuration and failure modes.
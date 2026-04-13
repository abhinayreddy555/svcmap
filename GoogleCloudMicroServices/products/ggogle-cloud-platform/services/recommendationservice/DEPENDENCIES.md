<!-- generated: 2026-04-13T05:21:57.930Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Dependencies — recommendationservice

## TL;DR for Agents

- **recommendationservice** makes **2 outbound gRPC calls**: one to `product-catalog-service` (critical data dependency) and one to `opentelemetry-collector` (observability).
- **No databases or persistent storage** — this service is stateless and derives recommendations from the product catalog at request time.
- Key third-party integrations: **OpenTelemetry** (tracing), **gRPC** (server/client), **gRPC Health Check** (K8s probes), **Google Cloud Profiler** (currently disabled).
- If `product-catalog-service` is down or degraded, **recommendationservice will fail to generate recommendations** — there is no configured timeout or retry policy on that call.
- Written in **Python**; uses structured JSON logging via `python-json-logger`.

---

## Outbound Calls

| Target | Type | Endpoint / Topic | Purpose | Timeout | Retries | External? |
|---|---|---|---|---|---|---|
| `product-catalog-service` | gRPC | `ListProducts` | Fetch full product list to generate recommendations | None configured | None configured | No |
| `opentelemetry-collector` | gRPC | `OTLPSpanExporter` | Export distributed tracing spans | None configured | None configured | No |

> **⚠️ Risk Note:** The call to `product-catalog-service` has **no explicit timeout or retry policy**. A hang or slowdown in the product catalog will propagate directly to recommendation latency. See [SCENARIOS.md](SCENARIOS.md) for failure mode analysis.

---

## Databases & Storage

| Name | Type | Purpose | Shared / Private |
|---|---|---|---|
| *(none)* | — | — | — |

This service is **fully stateless**. It does not use any database, cache, or persistent storage. All recommendation logic operates on the product list fetched in real time from `product-catalog-service`.

---

## Third-Party Integrations

| Name | Category | SDK / Package | Purpose |
|---|---|---|---|
| OpenTelemetry | Observability | `opentelemetry-api`, `opentelemetry-sdk`, `opentelemetry-exporter-otlp` | Distributed tracing and span export |
| gRPC | RPC Framework | `grpc` | gRPC server (serving recommendations) and client (calling product catalog) |
| gRPC Health Check | Health Check | `grpc-health-probe` | Health check service for Kubernetes liveness/readiness probes |
| Python JSON Logger | Logging | `python-json-logger` | Structured JSON logging for log aggregation |
| Google Cloud Profiler | Profiling | `google-cloud-profiler` | Performance profiling (**currently disabled**) |
| Google Auth | Authentication | `google-auth` | Google Cloud authentication |

---

## Inbound Calls

> **Note:** This section is populated from the product-level service graph and may be incomplete.

| Source | Type | Endpoint | Purpose |
|---|---|---|---|
| `frontend` | gRPC | `ListRecommendations` | Frontend requests product recommendations to display on product and home pages |

The `frontend` service is the primary (and likely only) consumer of `recommendationservice`. When the frontend renders a product page or the home page, it calls `ListRecommendations` to fetch suggested products for the user.

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Failure scenarios and cascading impact analysis for recommendationservice
- [product-catalog-service/DEPENDENCIES.md](../productcatalogservice/DEPENDENCIES.md) — Dependency documentation for the upstream product catalog service
- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Source repository and architecture overview
- [ARCHITECTURE.md](ARCHITECTURE.md) — Overall system architecture and service topology
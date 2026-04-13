<!-- generated: 2026-04-13T05:24:42.488Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Coding Standards — recommendationservice

## TL;DR for Agents

- **Architecture**: Python gRPC microservice that calls `productcatalogservice` via gRPC stubs, implements the `RecommendationService` servicer, and returns product recommendations.
- **Key Rule**: All service logic lives in a single flat directory (`src/recommendationservice/`); implement generated `Servicer` base classes, use `context.set_code()`/`context.set_details()` for errors, and configure everything via environment variables.
- **Naming**: Files are `snake_case.py`, classes are `PascalCase`, functions are `snake_case`, constants are `UPPER_SNAKE_CASE`.
- **Logging**: Use the custom `logger.py` `JsonFormatter` for structured JSON logs to stdout — never use `print()`.
- **Observability**: OpenTelemetry tracing is opt-in via the `ENABLE_TRACING` environment variable; instrument both gRPC client and server sides.

---

## Architecture Pattern

**gRPC Microservice with Service-to-Service Communication**

The `recommendationservice` is a Python gRPC server that receives recommendation requests, calls the `productcatalogservice` over gRPC to fetch the product catalog, filters and samples products, and returns recommendations. It exposes a gRPC health check endpoint for orchestration platforms (e.g., Kubernetes).

```
┌──────────────────────┐         gRPC          ┌──────────────────────────┐
│                      │ ◄───── request ─────── │                          │
│ recommendationservice│                        │   upstream caller        │
│                      │ ────── response ─────► │   (e.g. frontend)        │
└──────────┬───────────┘                        └──────────────────────────┘
           │
           │  gRPC (product_catalog_stub)
           ▼
┌──────────────────────────┐
│  productcatalogservice   │
│  (ListProducts RPC)      │
└──────────────────────────┘

Internal components:
┌─────────────────────────────────────────────────────┐
│  src/recommendationservice/                         │
│                                                     │
│  recommendation_server.py   ← service impl + main  │
│  demo_pb2.py / demo_pb2_grpc.py  ← generated code  │
│  logger.py                  ← structured logging    │
│  client.py                  ← manual test client    │
└─────────────────────────────────────────────────────┘
```

---

## Layer Structure

| Layer | Directory | Responsibility | Can Call |
|---|---|---|---|
| **gRPC Service Implementation** | `src/recommendationservice/` | gRPC service handlers implementing business logic for recommendations | gRPC Stubs (other services), Logging |
| **gRPC Generated Code** | `src/recommendationservice/` | Protocol buffer generated stubs and servicers for gRPC communication | — (leaf layer) |
| **Client Layer** | `src/recommendationservice/` | gRPC client for testing and inter-service calls | gRPC Stubs |

> **Note:** This service uses a flat directory structure — there are no sub-packages. All source files reside directly in `src/recommendationservice/`.

---

## Naming Conventions

| Category | Convention | Example |
|---|---|---|
| Files | `snake_case.py` | `recommendation_server.py`, `logger.py` |
| Classes | `PascalCase` | `RecommendationService`, `JsonFormatter` |
| Functions / Methods | `snake_case` | `ListRecommendations`, `Check` (gRPC servicer methods follow proto naming) |
| Constants | `UPPER_SNAKE_CASE` | `PRODUCT_CATALOG_SERVICE_ADDR`, `ENABLE_TRACING` |
| DB Columns | N/A | This service has no database |

> **gRPC method names** follow the casing defined in the `.proto` file (typically `PascalCase`). Python helper functions and internal methods use `snake_case`.

---

## Error Handling

Error handling follows the **gRPC context-based pattern**. Within service handler methods, errors are communicated to callers by calling `context.set_code()` with a `grpc.StatusCode` (e.g., `INTERNAL`, `INVALID_ARGUMENT`) and `context.set_details()` with a human-readable message. Do **not** raise raw Python exceptions from handler methods — always translate them into gRPC status codes so upstream callers receive well-formed gRPC error responses. Initialization errors (e.g., failure to connect to downstream services or configure tracing) should be caught with `try`/`except` blocks, logged with full context, and handled gracefully. Currently there is no retry or circuit-breaker logic for downstream calls; contributors should be aware of this gap (see [Anti-Patterns](#anti-patterns-to-avoid)).

```python
# Correct: set gRPC status on the context
def ListRecommendations(self, request, context):
    try:
        # ... business logic ...
    except Exception as e:
        context.set_code(grpc.StatusCode.INTERNAL)
        context.set_details(f"Failed to fetch recommendations: {e}")
        return demo_pb2.ListRecommendationsResponse()
```

---

## Logging

All logging uses the custom `JsonFormatter` defined in `src/recommendationservice/logger.py`, which wraps `pythonjsonlogger` to produce **structured JSON output** on `stdout`. Each log line includes `timestamp`, `severity`, `logger` (name), and `message` fields. Use the standard Python `logging` module configured with this formatter — never use bare `print()` statements. Log at appropriate severity levels: `INFO` for normal operations (server start, configuration), `WARNING` for recoverable issues, and `ERROR` for failures that affect request handling. There is a known `TODO` in `logger.py` about duplicated logging code across services; if modifying the formatter, be aware that changes may need to be mirrored in other services.

```python
import logging
logger = logging.getLogger("recommendationservice")
logger.info("Starting server on port %s", port)
logger.error("Failed to call ProductCatalogService: %s", err)
```

---

## Authentication

There is **no explicit authentication** in this service. gRPC channels to downstream services use `grpc.insecure_channel()`, and no auth middleware, token validation, or mTLS configuration is present in the application code. In production deployments, authentication and encryption are expected to be handled at the infrastructure layer (e.g., Istio service mesh, Kubernetes network policies). Contributors should **not** add ad-hoc auth mechanisms without coordinating with the broader platform architecture.

---

## Testing Approach

Testing is currently limited to **manual gRPC client testing** via `src/recommendationservice/client.py`, which connects to the service on `localhost` and invokes `ListRecommendations`. There are no unit tests, integration tests, or automated test suites in the service directory. When contributing new logic, consider:

- Writing unit tests that mock the `product_catalog_stub` to test recommendation logic in isolation.
- Using `grpcio-testing` or similar libraries for gRPC handler tests.
- Avoiding reliance on the manual `client.py` as a substitute for automated tests.

```bash
# Manual test (requires running service + productcatalogservice)
cd src/recommendationservice
python client.py
```

---

## Notable Patterns

### gRPC Service Pattern

The service class extends the generated `Servicer` base class from `demo_pb2_grpc`. Each RPC method receives a protobuf `request` object and a `context`, and must return the corresponding protobuf response type.

```python
# src/recommendationservice/recommendation_server.py
class RecommendationService(demo_pb2_grpc.RecommendationServiceServicer):
    def ListRecommendations(self, request, context):
        # request: ListRecommendationsRequest (protobuf)
        # returns: ListRecommendationsResponse (protobuf)
        ...
```

### Service-to-Service gRPC Communication

Downstream services are called via gRPC stubs instantiated with a channel. The `productcatalogservice` address is read from the `PRODUCT_CATALOG_SERVICE_ADDR` environment variable.

```python
# src/recommendationservice/recommendation_server.py
channel = grpc.insecure_channel(catalog_addr)
product_catalog_stub = demo_pb2_grpc.ProductCatalogServiceStub(channel)
response = product_catalog_stub.ListProducts(demo_pb2.Empty())
```

### Health Check Implementation

The service implements the standard gRPC health check protocol (`grpc.health.v1`), enabling Kubernetes liveness/readiness probes and load balancer health checks.

```python
# src/recommendationservice/recommendation_server.py
def Check(self, request, context):
    return health_pb2.HealthCheckResponse(
        status=health_pb2.HealthCheckResponse.SERVING
    )

def Watch(self, request, context):
    return health_pb2.HealthCheckResponse(
        status=health_pb2.HealthCheckResponse.UNIMPLEMENTED
    )
```

### OpenTelemetry Instrumentation

Distributed tracing is opt-in, controlled by the `ENABLE_TRACING` environment variable. When enabled, both the gRPC client and server are instrumented using `GrpcInstrumentorClient` and `GrpcInstrumentorServer`, and traces are exported via OTLP.

```python
# src/recommendationservice/recommendation_server.py
if os.environ.get("ENABLE_TRACING") == "1":
    GrpcInstrumentorClient().instrument()
    GrpcInstrumentorServer().instrument()
```

### Environment-Based Configuration

All runtime configuration is read from environment variables. No config files, CLI argument parsing, or config management libraries are used.

| Variable | Purpose | Example |
|---|---|---|
| `PORT` | gRPC server listen port | `8080` |
| `PRODUCT_CATALOG_SERVICE_ADDR` | Address of productcatalogservice | `productcatalogservice:3550` |
| `ENABLE_TRACING` | Enable OpenTelemetry tracing (`1` to enable) | `1` |

---

## Anti-Patterns to Avoid

- **Insecure gRPC channels in application code** — `grpc.insecure_channel()` is used; do not add sensitive data to channel metadata without TLS.
- **No input validation on gRPC request parameters** — always validate `request` fields (e.g., `product_ids`) before processing.
- **Hardcoded `localhost` in `client.py`** — test clients should use configurable addresses via environment variables.
- **Missing graceful failure for required environment variables** — if `PRODUCT_CATALOG_SERVICE_ADDR` is unset, the service logs an error but behavior is undefined; fail fast with a clear error message instead.
- **Duplicated logging code across services** — the `logger.py` module is copy-pasted; do not diverge it further without a plan to consolidate.
- **No timeout configuration on gRPC channels or calls** — always set deadlines on outbound RPCs to avoid hanging indefinitely.
- **Non-deterministic `random.sample()` without seed control** — `ListRecommendations` uses random sampling; be aware this makes output non-reproducible in tests.
- **Commented-out profiler code left in source** — remove dead code; do not leave commented-out blocks in production files.
- **No circuit breaker or retry logic for downstream calls** — a `productcatalogservice` outage will cascade; consider adding retry with backoff or a circuit breaker pattern.

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Common development scenarios and workflows for this service
- [src/recommendationservice/recommendation_server.py](../../src/recommendationservice/recommendation_server.py) — Main service implementation
- [src/recommendationservice/logger.py](../../src/recommendationservice/logger.py) — Structured JSON logging module
- [pb/demo.proto](../../pb/demo.proto) — Protocol buffer definitions for all service RPCs and messages
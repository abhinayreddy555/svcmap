<!-- generated: 2026-04-13T05:12:53.760Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Configuration — checkoutservice

## TL;DR for Agents

- **6 required service-URL environment variables** must all be set or the service **panics on startup**: `SHIPPING_SERVICE_ADDR`, `PRODUCT_CATALOG_SERVICE_ADDR`, `CART_SERVICE_ADDR`, `CURRENCY_SERVICE_ADDR`, `EMAIL_SERVICE_ADDR`, `PAYMENT_SERVICE_ADDR`.
- **No secrets required** — all inter-service communication uses insecure gRPC credentials.
- **Two feature flags** (`ENABLE_TRACING`, `ENABLE_PROFILER`) are disabled by default; enabling tracing additionally requires `COLLECTOR_SERVICE_ADDR` to be set.
- gRPC server listens on port `5050` by default (override with `PORT`); health check available at `/grpc.health.v1.Health/Check`.
- Part of [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo).

## Environment Variables

| Key | Required | Default | Category | Description | Sensitivity Note |
|-----|----------|---------|----------|-------------|------------------|
| `SHIPPING_SERVICE_ADDR` | **Yes** | — | service-url | gRPC address of shipping service for quote and shipment operations | — |
| `PRODUCT_CATALOG_SERVICE_ADDR` | **Yes** | — | service-url | gRPC address of product catalog service for product information | — |
| `CART_SERVICE_ADDR` | **Yes** | — | service-url | gRPC address of cart service for user cart operations | — |
| `CURRENCY_SERVICE_ADDR` | **Yes** | — | service-url | gRPC address of currency service for currency conversion | — |
| `EMAIL_SERVICE_ADDR` | **Yes** | — | service-url | gRPC address of email service for sending order confirmations | — |
| `PAYMENT_SERVICE_ADDR` | **Yes** | — | service-url | gRPC address of payment service for credit card charging | — |
| `COLLECTOR_SERVICE_ADDR` | No (required when `ENABLE_TRACING=1`) | — | service-url | gRPC address of OpenTelemetry collector for trace export | — |
| `PORT` | No | `5050` | other | TCP port for gRPC server to listen on | — |
| `ENABLE_TRACING` | No | `0` | feature-flag | Feature flag to enable OpenTelemetry tracing and export to collector service | — |
| `ENABLE_PROFILER` | No | `0` | feature-flag | Feature flag to enable Google Cloud Profiler for performance profiling | — |
| `GOTRACEBACK` | No | `single` | other | Go runtime traceback behavior for panic diagnostics | — |

## Feature Flags

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `ENABLE_TRACING` | boolean (`0`/`1`) | `0` | Enables OpenTelemetry distributed tracing with gRPC export to collector service. When enabled, all outbound gRPC calls are instrumented with OpenTelemetry interceptors. **`COLLECTOR_SERVICE_ADDR` must be set when this flag is `1`.** |
| `ENABLE_PROFILER` | boolean (`0`/`1`) | `0` | Enables Google Cloud Profiler for continuous performance profiling. Requires the service to run in a GCP environment with appropriate IAM permissions. |

## Deployment Notes

All six downstream service addresses (`SHIPPING_SERVICE_ADDR`, `PRODUCT_CATALOG_SERVICE_ADDR`, `CART_SERVICE_ADDR`, `CURRENCY_SERVICE_ADDR`, `EMAIL_SERVICE_ADDR`, `PAYMENT_SERVICE_ADDR`) are **required** and must be set before the process starts — the service will **panic** if any are missing. The gRPC server listens on TCP port `5050` by default (configurable via `PORT`) and exposes a standard gRPC health check at `/grpc.health.v1.Health/Check`, which can be used for Kubernetes liveness and readiness probes.

Inter-service communication uses **insecure gRPC credentials**, so transport-layer security (mTLS, service mesh, etc.) should be handled at the infrastructure level. When `ENABLE_TRACING=1`, the service initializes an OpenTelemetry gRPC exporter targeting `COLLECTOR_SERVICE_ADDR` (e.g., `otel-collector:4317`) and wraps all outbound gRPC calls with tracing interceptors. Ensure the collector is reachable before enabling this flag to avoid export errors.

Example minimal environment block for Kubernetes:

```yaml
env:
  - name: PORT
    value: "5050"
  - name: SHIPPING_SERVICE_ADDR
    value: "shippingservice:50051"
  - name: PRODUCT_CATALOG_SERVICE_ADDR
    value: "productcatalogservice:3550"
  - name: CART_SERVICE_ADDR
    value: "cartservice:7070"
  - name: CURRENCY_SERVICE_ADDR
    value: "currencyservice:7000"
  - name: EMAIL_SERVICE_ADDR
    value: "emailservice:5000"
  - name: PAYMENT_SERVICE_ADDR
    value: "paymentservice:50051"
```

## See Also

- [GoogleCloudPlatform/microservices-demo repository](https://github.com/GoogleCloudPlatform/microservices-demo)
- [Kubernetes deployment manifests](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/kubernetes-manifests)
- [OpenTelemetry Collector configuration](https://opentelemetry.io/docs/collector/configuration/)
- [gRPC Health Checking Protocol](https://github.com/grpc/grpc/blob/master/doc/health-checking.md)
<!-- generated: 2026-04-13T05:17:14.014Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Configuration — paymentservice

## TL;DR for Agents

- **Zero required secrets or credentials** needed for basic operation — no sensitive environment variables.
- **Two feature flags** control optional integrations: `DISABLE_PROFILER` (Google Cloud Profiler) and `ENABLE_TRACING` (OpenTelemetry).
- When `ENABLE_TRACING=1`, you **must** also set `COLLECTOR_SERVICE_ADDR` or traces will have no export destination.
- gRPC server defaults to port `50051`; override with `PORT`.
- Part of the [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) reference architecture.

## Environment Variables

| Key | Required | Default | Category | Description | Sensitivity Note |
|---|---|---|---|---|---|
| `PORT` | No | _(none — defaults to `50051` by convention)_ | other | gRPC server listening port | — |
| `DISABLE_PROFILER` | No | _(unset)_ | feature-flag | Disables Google Cloud Profiler when set to any value | — |
| `ENABLE_TRACING` | No | _(unset)_ | feature-flag | Feature flag to enable OpenTelemetry distributed tracing (set to `1` to enable) | — |
| `COLLECTOR_SERVICE_ADDR` | No | _(none)_ | observability | OpenTelemetry collector gRPC endpoint URL for trace export (e.g. `http://otel-collector:4317`) | — |
| `OTEL_SERVICE_NAME` | No | `paymentservice` | observability | OpenTelemetry service name for trace resource attributes | — |

> **Note:** While `COLLECTOR_SERVICE_ADDR` is not globally required, it is **effectively required** whenever `ENABLE_TRACING=1`. Without it, the tracing exporter has no destination.

## Feature Flags

| Key | Type | Default | Description |
|---|---|---|---|
| `DISABLE_PROFILER` | boolean | _(unset / disabled)_ | Disables Google Cloud Profiler integration when set to any truthy value. Leave unset to keep profiling enabled in GCP environments. |
| `ENABLE_TRACING` | boolean | _(unset / disabled)_ | Enables OpenTelemetry distributed tracing with a gRPC exporter. Set to `1` to activate. Requires `COLLECTOR_SERVICE_ADDR` to be configured. |

## Deployment Notes

The payment service is a gRPC server exposing two RPC methods: `PaymentService.Charge` and `Health.Check`. By default it listens on port **50051**, configurable via the `PORT` environment variable. The service has **no external dependencies or secrets** required for basic operation — it can start and serve charge requests with zero configuration.

Two optional integrations are available via feature flags:

1. **Google Cloud Profiler** — enabled by default when running on GCP. Set `DISABLE_PROFILER` to any value (e.g. `true`) to turn it off, which is recommended for local development or non-GCP environments where the profiler agent would fail to initialize.
2. **OpenTelemetry Tracing** — opt-in via `ENABLE_TRACING=1`. When enabled, the service exports traces over gRPC to the endpoint specified in `COLLECTOR_SERVICE_ADDR`. If you enable tracing but omit the collector address, the exporter will have no destination and trace data will be lost. A typical collector address in a Kubernetes deployment is `http://otel-collector:4317`.

The `OTEL_SERVICE_NAME` variable defaults to `paymentservice` and controls how this service identifies itself in trace data. Override it only if you need to disambiguate multiple instances in your tracing backend.

## See Also

- [GoogleCloudPlatform/microservices-demo — Source Repository](https://github.com/GoogleCloudPlatform/microservices-demo)
- [Kubernetes Manifests](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/kubernetes-manifests) — deployment specs including `paymentservice` env var configuration
- [OpenTelemetry Collector Configuration](https://opentelemetry.io/docs/collector/configuration/) — reference for setting up the collector endpoint used by `COLLECTOR_SERVICE_ADDR`
- [SCENARIOS.md](SCENARIOS.md) — common deployment and debugging scenarios
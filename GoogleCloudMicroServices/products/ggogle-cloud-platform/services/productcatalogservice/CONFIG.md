<!-- generated: 2026-04-13T05:14:15.147Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Configuration — productcatalogservice

## TL;DR for Agents

- **0 secrets required** — this service has no sensitive credentials in its environment configuration.
- **1 conditionally required variable**: `COLLECTOR_SERVICE_ADDR` is required only when `ENABLE_TRACING=1`.
- **2 feature flags**: `ENABLE_TRACING` (opt-in tracing) and `DISABLE_PROFILER` (opt-out profiler).
- **Chaos testing support**: `EXTRA_LATENCY` injects artificial latency using Go duration strings (e.g., `100ms`).
- **Runtime signal control**: catalog reloading can be toggled live via `SIGUSR1`/`SIGUSR2` — no restart needed.

## Environment Variables

| Key | Required | Default | Category | Description | Sensitivity |
|-----|----------|---------|----------|-------------|-------------|
| `COLLECTOR_SERVICE_ADDR` | Yes (when `ENABLE_TRACING=1`) | — | service-url | gRPC address of OpenTelemetry collector service for trace export | None |
| `ENABLE_TRACING` | No | `0` | feature-flag | Enable OpenTelemetry tracing integration with collector service | None |
| `DISABLE_PROFILER` | No | — | feature-flag | Disable Google Cloud Profiler (Stackdriver). If set to any non-empty value, profiler is disabled | None |
| `PORT` | No | `3550` | other | gRPC server listening port | None |
| `EXTRA_LATENCY` | No | `0` | other | Injected latency for testing purposes, specified as Go duration string (e.g., `100ms`, `2s`) | None |
| `GOTRACEBACK` | No | `single` | other | Go runtime traceback behavior on panic | None |

## Feature Flags

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `ENABLE_TRACING` | boolean | `0` (disabled) | Enables OpenTelemetry distributed tracing. When set to `1`, connects to `COLLECTOR_SERVICE_ADDR` for trace export. |
| `DISABLE_PROFILER` | boolean | unset (profiler enabled) | Disables Google Cloud Profiler (Stackdriver). When unset or empty, profiler is enabled; any non-empty value disables it. |

> **Note:** These two flags use opposite semantics — `ENABLE_TRACING` is opt-**in** (default off), while `DISABLE_PROFILER` is opt-**out** (default on). Be deliberate when toggling both.

## Deployment Notes

`COLLECTOR_SERVICE_ADDR` is required **only** when `ENABLE_TRACING=1`; if tracing is disabled (the default), the variable is ignored and can be omitted. The service runs a gRPC server on the port specified by `PORT` (default `3550`) and includes gRPC health check support for liveness/readiness probes. Google Cloud Profiler (Stackdriver) is **enabled by default** — set `DISABLE_PROFILER` to any non-empty value (e.g., `1`) to turn it off, which is recommended for local development or non-GCP environments where the profiler agent would fail to connect.

For chaos testing or latency simulation, set `EXTRA_LATENCY` to a valid Go duration string such as `100ms` or `2s`. This injects artificial delay into product catalog responses and should **never** be set in production.

At runtime, the product catalog supports live reload toggling via OS signals:

```bash
# Enable catalog reloading
kill -SIGUSR1 <pid>

# Disable catalog reloading
kill -SIGUSR2 <pid>
```

This allows operators to update the product catalog without restarting the service.

## See Also

- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — upstream repository and full architecture overview
- [src/productcatalogservice](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/src/productcatalogservice) — service source code and Dockerfile
- [kubernetes-manifests](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/kubernetes-manifests) — Kubernetes deployment specs referencing these environment variables
- [OpenTelemetry Collector configuration](https://opentelemetry.io/docs/collector/configuration/) — relevant when `ENABLE_TRACING=1`
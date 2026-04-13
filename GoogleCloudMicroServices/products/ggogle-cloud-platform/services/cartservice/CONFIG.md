<!-- generated: 2026-04-13T05:07:02.730Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Configuration — cartservice

## TL;DR for Agents

- **Zero required secrets** — no sensitive credentials detected in the configuration surface.
- **Zero feature flags** — no runtime feature toggles are defined for this service.
- Service is a **.NET 10 ASP.NET Core** application listening on **port 7070** (HTTP/2).
- Runs as **non-root** (UID 1000); only two environment variables to configure, both optional with sane defaults.
- No external service dependencies (databases, caches, queues) are detected in the provided configuration files.

## Environment Variables

| Key | Required | Default | Category | Description | Sensitivity Note |
|---|---|---|---|---|---|
| `DOTNET_EnableDiagnostics` | No | `0` | other | Disables .NET diagnostics to reduce overhead in production. Set to `0` to disable, `1` to enable. | None |
| `ASPNETCORE_HTTP_PORTS` | No | `7070` | other | HTTP port for the ASP.NET Core Kestrel server. Must match the container port exposed in your Kubernetes manifest or Docker configuration. | None |

## Feature Flags

| Key | Type | Default | Description |
|---|---|---|---|
| *(none)* | — | — | No feature flags are defined for this service. |

## Deployment Notes

Cart service is a .NET 10 ASP.NET Core application. The Kestrel server listens on **port 7070** using the **HTTP/2** protocol — ensure your Kubernetes `Service`, health-check probes, and any upstream proxy (e.g., Envoy sidecar in a service mesh) target this port and protocol accordingly. The container runs as a **non-root user (UID 1000)**, so filesystem paths written to at runtime must be writable by that UID. No external service dependencies or secrets were detected in the provided configuration files; if the service connects to a backing store (e.g., Redis) at runtime, those connection parameters may be injected through additional environment variables not captured here. Logging is configured at the `Information` level by default, with the `Microsoft` namespace scoped to `Warning` to reduce noise. To change log verbosity, override the relevant keys in `appsettings.json` or supply them via environment variables using the standard ASP.NET Core configuration provider hierarchy (`Logging__LogLevel__Default`, etc.).

## See Also

- [microservices-demo repository](https://github.com/GoogleCloudPlatform/microservices-demo)
- [ASP.NET Core Kestrel server configuration (Microsoft Docs)](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/kestrel)
- [SCENARIOS.md](SCENARIOS.md)
- [Kubernetes deployment manifests](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/kubernetes-manifests)
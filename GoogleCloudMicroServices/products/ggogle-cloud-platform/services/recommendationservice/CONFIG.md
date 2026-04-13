<!-- generated: 2026-04-13T05:23:27.214Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Configuration — recommendationservice

## TL;DR for Agents

- **Zero required secrets or sensitive variables** — this service has no credentials configured via environment variables.
- **No feature flags** are defined for this service.
- Only **3 environment variables**, all optional with defaults, declared in the Dockerfile (`PORT`, `PYTHONDONTWRITEBYTECODE`, `PYTHONUNBUFFERED`).
- Service listens on port **8080** by default; override with the `PORT` env var.
- Python runtime is configured for **container-friendly logging** (unbuffered stdout, no `.pyc` files).

## Environment Variables

| Key | Required | Default | Category | Description | Sensitivity Note |
|---|---|---|---|---|---|
| `PORT` | No | `8080` | other | HTTP server listen port for recommendation service | None |
| `PYTHONDONTWRITEBYTECODE` | No | `1` | other | Prevents Python from writing `.pyc` files | None |
| `PYTHONUNBUFFERED` | No | `1` | other | Ensures Python output is sent straight to logs without buffering | None |

> **Note:** All configuration is sourced exclusively from Dockerfile `ENV` declarations. No `.env` files, Kubernetes ConfigMaps, or external configuration files were detected in the codebase.

## Feature Flags

| Key | Type | Default | Description |
|---|---|---|---|
| *(none)* | — | — | No feature flags are defined for this service. |

## Deployment Notes

The recommendation service runs on a **Python 3.14.3-alpine** base image and is started via `recommendation_server.py`. It listens on port `8080` by default. All environment variables are optional and ship with sensible defaults baked into the Dockerfile — no external configuration files (`.env`, `config.ts`, `settings.py`, Kubernetes ConfigMaps, or Secrets) were found in the provided code sample.

The two Python runtime variables (`PYTHONDONTWRITEBYTECODE=1` and `PYTHONUNBUFFERED=1`) are standard container best practices: disabling `.pyc` generation avoids unnecessary filesystem writes in an ephemeral container, and unbuffered output ensures log lines from `stdout`/`stderr` are immediately visible to container log collectors (e.g., `kubectl logs`, Fluentd, Cloud Logging) without delay. These should generally not be changed in production.

If you need to change the listen port (for example, to avoid a conflict in a sidecar-proxy setup), set the `PORT` environment variable in your Kubernetes Deployment manifest or `docker run` invocation:

```bash
docker run -e PORT=9090 recommendationservice
```

## See Also

- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — upstream repository
- [SCENARIOS.md](SCENARIOS.md) — common deployment and debugging scenarios
- [Kubernetes manifests](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/kubernetes-manifests) — reference Deployment and Service definitions
- [Dockerfile reference](https://github.com/GoogleCloudPlatform/microservices-demo/blob/main/src/recommendationservice/Dockerfile) — source of all `ENV` declarations
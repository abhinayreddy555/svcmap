<!-- generated: 2026-04-13T04:08:20.126Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Configuration — spring-petclinic-config-server

## TL;DR for Agents

- **Zero required secrets** — all configuration entries have defaults or are only needed under specific profiles.
- Config Server listens on port **8888** by default; this is the well-known endpoint other microservices use to fetch configuration.
- Two backend modes: **Git-based** (default, pulls from a remote GitHub repo) and **native file-system** (activated via `spring.profiles.active=native`, requires `GIT_REPO` env var).
- No feature flags are defined for this service.
- If clients cannot reach `localhost:8888` or the configured Git URI is unreachable, all downstream microservices will fail to start.

## Environment Variables

| Key | Required | Default | Category | Description | Sensitivity Note |
|-----|----------|---------|----------|-------------|------------------|
| `GIT_REPO` | No | — | other | File system path to local git repository for the native profile configuration backend. **Required when the `native` Spring profile is active.** | — |
| `server.port` | No | `8888` | other | HTTP server port for Config Server. | — |
| `spring.cloud.config.server.git.uri` | No | `https://github.com/spring-petclinic/spring-petclinic-microservices-config` | other | Git repository URI for centralized configuration. | — |
| `spring.cloud.config.server.git.default-label` | No | `main` | other | Default git branch for configuration repository. | — |
| `spring.cloud.config.server.native.searchLocations` | No | — | other | File system search locations for native profile (file-based configuration backend). Typically set to `file:///${GIT_REPO}`. | — |

## Feature Flags

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| — | — | — | No feature flags are defined for this service. |

## Deployment Notes

Spring Cloud Config Server provides centralized configuration for all microservices in the spring-petclinic-microservices stack. It exposes port **8888** and must be reachable by every downstream service before they complete startup.

**Git backend (default):** Out of the box the server clones configuration from `https://github.com/spring-petclinic/spring-petclinic-microservices-config` on the `main` branch. No additional environment variables are needed. Ensure the deployment environment has outbound HTTPS access to GitHub (or whichever Git host you override `spring.cloud.config.server.git.uri` to point at).

**Native / file-system backend:** Activate the `native` Spring profile (e.g., `SPRING_PROFILES_ACTIVE=native`) and set the `GIT_REPO` environment variable to the absolute path of a local directory containing the configuration files. The server will then resolve `spring.cloud.config.server.native.searchLocations` to `file:///${GIT_REPO}`. This mode is useful for Docker Compose setups where a config repo is mounted as a volume, or for air-gapped environments.

**Startup ordering:** Because all other microservices depend on Config Server for their configuration, ensure this service is healthy before starting consumers. In Docker Compose use `depends_on` with a health check; in Kubernetes use an init container or readiness probe against `http://<config-server>:8888/actuator/health`.

## See Also

- [spring-petclinic-microservices-config repository](https://github.com/spring-petclinic/spring-petclinic-microservices-config) — the default configuration files served by this Config Server
- [spring-petclinic-microservices root repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — parent project with Docker Compose and orchestration files
- [Spring Cloud Config Server reference documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_spring_cloud_config_server)
- [SCENARIOS.md](SCENARIOS.md) — common deployment and debugging scenarios
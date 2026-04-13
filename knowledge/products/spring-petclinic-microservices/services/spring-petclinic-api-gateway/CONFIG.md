<!-- generated: 2026-04-13T04:11:27.099Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Configuration — spring-petclinic-api-gateway

## TL;DR for Agents

- **No environment variables, feature flags, or secrets were found** in the extracted configuration for this service.
- The analyzed code only contains frontend AngularJS application configuration and Spring test-context circuit breaker bean definitions — neither exposes deployable config.
- **Critical gap:** Configuration files (`application.yml`, `Dockerfile`, Kubernetes manifests, `.env`) were not available during extraction; this document is incomplete.
- To unblock further analysis, locate `application.yml` or `bootstrap.yml` under `spring-petclinic-api-gateway/src/main/resources/`.
- This service likely inherits configuration from a **Spring Cloud Config Server** at runtime (standard pattern in `spring-petclinic-microservices`).

## Environment Variables

No environment variables were detected in the provided code extraction.

| Key | Required | Default | Category | Description | Sensitivity |
|-----|----------|---------|----------|-------------|-------------|
| _None found_ | — | — | — | — | — |

> **⚠️ Expected but missing variables:** In a typical `spring-petclinic-microservices` deployment, the API gateway usually requires configuration for:
>
> | Expected Key | Likely Purpose |
> |---|---|
> | `SPRING_CLOUD_CONFIG_URI` | URI of the Spring Cloud Config Server |
> | `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` | Eureka service discovery endpoint |
> | `SERVER_PORT` | HTTP listen port (commonly `8080`) |
> | `SPRING_PROFILES_ACTIVE` | Active Spring profile (`docker`, `kubernetes`, etc.) |
>
> These should be confirmed by inspecting the actual `application.yml`, `Dockerfile`, or Kubernetes manifests.

## Feature Flags

No feature flags were detected in the provided code extraction.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| _None found_ | — | — | — |

> **Note:** The test context includes a circuit breaker bean definition (`Resilience4J` / `Hystrix`), which may imply circuit breaker configuration exists in the full `application.yml`. Verify whether `spring.cloud.circuitbreaker.resilience4j.enabled` or equivalent flags are set in the config server repository.

## Deployment Notes

**This configuration document is incomplete.** The extraction process did not have access to the primary configuration sources for this service. In the standard `spring-petclinic-microservices` architecture, the `api-gateway` service retrieves its configuration at startup from a centralized **Spring Cloud Config Server** (typically the `spring-petclinic-config-server` service), which serves configuration from a Git-backed repository (often `spring-petclinic-microservices-config`).

To produce a complete configuration reference, provide one or more of the following:

- `spring-petclinic-api-gateway/src/main/resources/application.yml` or `bootstrap.yml`
- The config server's backing repository (e.g., `api-gateway.yml` or `api-gateway-docker.yml`)
- `Dockerfile` with `ENV` declarations from `spring-petclinic-api-gateway/`
- Kubernetes manifests (`Deployment`, `ConfigMap`, `Secret`) if deploying to K8s
- Any `.env` or `.env.example` files in the repository root or service directory

Without these files, operators should inspect the running container's environment (`docker exec <container> env`) or the config server's `/api-gateway/default` endpoint to determine the active configuration.

## See Also

- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Spring Cloud Config Server documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/)
- [SCENARIOS.md](SCENARIOS.md) — Deployment scenarios and environment-specific overrides
- [spring-petclinic-microservices-config](https://github.com/spring-petclinic/spring-petclinic-microservices-config) — Externalized configuration repository (config server backend)
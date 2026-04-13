<!-- generated: 2026-04-13T04:15:39.711Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Configuration — spring-petclinic-discovery-server

## TL;DR for Agents

- **No configuration files were found** in the provided code sample for `spring-petclinic-discovery-server`.
- **Zero required secrets** and **zero feature flags** were extracted from the repository data.
- This service is the **Eureka-based discovery server** for the `spring-petclinic-microservices` ecosystem.
- Configuration is likely inherited from a **Spring Cloud Config Server** or defined in a centralized config repo — check the `spring-petclinic-microservices` parent project.
- If you are debugging missing config, look for `application.yml` in the [Spring Cloud Config repo](https://github.com/spring-petclinic/spring-petclinic-microservices-config) or in a mounted volume / ConfigMap at runtime.

## Environment Variables

No configuration files (`.env`, `.env.example`, `application.yml`, `config.ts/js`, `settings.py`, Dockerfile `ENV` declarations, or Kubernetes ConfigMaps) were provided in the analyzed code sample. The table below is empty as a result.

| Key | Required | Default | Category | Description | Sensitivity |
|-----|----------|---------|----------|-------------|-------------|
| —  | —        | —       | —        | —           | —           |

> **Note:** Spring Boot services in this architecture typically resolve configuration at runtime from the **Spring Cloud Config Server**. Common expected variables for a Eureka discovery server include `server.port`, `eureka.client.register-with-eureka`, `eureka.client.fetch-registry`, and `eureka.instance.hostname`. Consult the centralized config repository for actual values.

## Feature Flags

No feature flags were detected in the provided code sample.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| —   | —    | —       | —           |

## Deployment Notes

No Dockerfile `ENV` declarations, Kubernetes manifests, or local configuration files were included in the analyzed code sample for `spring-petclinic-discovery-server`. In the standard `spring-petclinic-microservices` architecture, this service acts as the **Netflix Eureka discovery server** — all other microservices (`api-gateway`, `customers-service`, `vets-service`, `visits-service`) register with it at startup. Configuration is typically externalized to the **Spring Cloud Config Server** (`spring-petclinic-config-server`), which serves `application.yml` / `discovery-server.yml` from a dedicated Git-backed config repository (commonly [`spring-petclinic-microservices-config`](https://github.com/spring-petclinic/spring-petclinic-microservices-config)). When deploying, ensure the config server is reachable **before** starting the discovery server, or provide a local `bootstrap.yml` / `application.yml` with fallback values. The default Eureka dashboard is typically exposed on port `8761`. If deploying to Kubernetes, verify that a `ConfigMap` or `Secret` supplies any environment-specific overrides (e.g., `SPRING_PROFILES_ACTIVE`, `SPRING_CLOUD_CONFIG_URI`).

## See Also

- [spring-petclinic-microservices (parent project)](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [spring-petclinic-microservices-config (centralized config repo)](https://github.com/spring-petclinic/spring-petclinic-microservices-config)
- [Spring Cloud Netflix Eureka — Official Docs](https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/)
- [SCENARIOS.md](SCENARIOS.md)
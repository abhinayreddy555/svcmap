<!-- generated: 2026-04-13T04:09:11.203Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Configuration — spring-petclinic-admin-server

## TL;DR for Agents

- **No configuration files were found** in the provided code sample for `spring-petclinic-admin-server`.
- **0 required secrets**, **0 environment variables**, and **0 feature flags** were extracted.
- The service is part of the `spring-petclinic-microservices` multi-module project and likely inherits configuration from a centralized Spring Cloud Config Server or parent POM.
- Configuration may reside in an external config repository, a shared `application.yml` served by the config server, or be injected at deployment time via environment variables or orchestration tooling.
- Review the upstream config server and any deployment manifests (Docker Compose, Kubernetes) for the actual runtime configuration.

## Environment Variables

No configuration files (`.env`, `.env.example`, `application.yml`, `config.ts/js`, `settings.py`, Dockerfile `ENV` declarations, or Kubernetes ConfigMaps) were provided in the code sample. The table below is empty as a result.

| Key | Required | Default | Category | Description | Sensitivity |
|-----|----------|---------|----------|-------------|-------------|
| —  | —        | —       | —        | —           | —           |

> **Note:** In a typical `spring-petclinic-microservices` deployment, the admin server commonly uses variables such as `SERVER_PORT`, `SPRING_CLOUD_CONFIG_URI`, and `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE`. These are expected to be defined in the centralized config server repository or in deployment-time orchestration files (e.g., `docker-compose.yml`, Kubernetes manifests).

## Feature Flags

No feature flags were detected in the provided code sample.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| —   | —    | —       | —           |

## Deployment Notes

No deployment-relevant configuration artifacts were included in the analyzed code sample for `spring-petclinic-admin-server`. In the standard `spring-petclinic-microservices` architecture, this service acts as a [Spring Boot Admin](https://github.com/codecentric/spring-boot-admin) dashboard that monitors all registered microservices. It typically depends on **Eureka** for service discovery and on the **Spring Cloud Config Server** for externalized configuration. This means the actual runtime configuration (server port, config server URI, Eureka endpoint, admin credentials, etc.) is most likely stored in one or more of the following locations:

1. **A dedicated config repository** served by `spring-petclinic-config-server` (e.g., `admin-server.yml` or `admin-server-docker.yml`).
2. **`docker-compose.yml`** in the repository root, which may inject environment variables or override Spring profiles.
3. **Kubernetes manifests or Helm charts** if deployed to a cluster, potentially using ConfigMaps and Secrets.

When deploying or debugging this service, start by inspecting the config server's backing repository and the orchestration layer rather than looking for local configuration files within this module.

## See Also

- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — parent project with Docker Compose and shared infrastructure definitions
- [Spring Boot Admin documentation](https://docs.spring-boot-admin.com/) — upstream docs for the admin server framework
- [spring-petclinic-config-server](https://github.com/spring-petclinic/spring-petclinic-microservices/tree/main/spring-petclinic-config-server) — centralized config server that likely holds this service's configuration
- [SCENARIOS.md](SCENARIOS.md) — deployment and troubleshooting scenarios for the microservices suite
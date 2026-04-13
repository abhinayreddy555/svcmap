<!-- generated: 2026-04-13T04:17:23.683Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Configuration — spring-petclinic-customers-service

## TL;DR for Agents

- **Zero environment variables or feature flags** were detected in the analyzed code for this service.
- Configuration is **likely externalized** in `application.yml` or `application.properties` files that were not included in this analysis.
- A `MetricConfig` class exists for Micrometer metrics with a **hardcoded application name `petclinic`**.
- No secrets or sensitive credentials were found in the extracted configuration surface.
- To fully understand this service's runtime behavior, locate and inspect the Spring Boot externalized config files (see [Deployment Notes](#deployment-notes)).

## Environment Variables

No environment variables were detected in the provided code analysis.

| Key | Required | Default | Category | Description | Sensitivity Note |
|-----|----------|---------|----------|-------------|------------------|
| _None detected_ | — | — | — | — | — |

> **Note:** Spring Boot services typically consume environment variables via `application.yml` / `application.properties` or Spring Cloud Config Server. The absence of entries here indicates these files were not part of the analyzed source, **not** that the service requires zero configuration at runtime. Common Spring Boot variables such as `SERVER_PORT`, `SPRING_DATASOURCE_URL`, and `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` are likely required.

## Feature Flags

No feature flags were detected in the provided code analysis.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| _None detected_ | — | — | — |

## Deployment Notes

No environment variables or feature flags were detected in the provided code. The `MetricConfig` class is a Spring Boot `@Configuration` bean that registers Micrometer `MeterRegistryCustomizer` with a hardcoded application tag of `petclinic`. This means all metrics emitted by this service will carry the tag `application=petclinic` regardless of environment.

Configuration for this service is almost certainly externalized in `application.yml` or `application.properties` files that were **not provided** in this analysis. When deploying or debugging this service, engineers and agents should:

1. **Locate the externalized config** — check `src/main/resources/application.yml`, `src/main/resources/application.properties`, and any Spring Cloud Config Server repository linked to the `spring-petclinic-microservices` project.
2. **Inspect for database, discovery, and gateway settings** — as a customers-service in a microservices architecture, expect configuration for a datasource (e.g., MySQL/HSQLDB), a service registry (e.g., Eureka), and possibly Spring Cloud Gateway routes.
3. **Check for profile-specific files** — Spring Boot supports `application-{profile}.yml` files (e.g., `application-docker.yml`) that override defaults per environment.
4. **Review the parent POM / Docker Compose** — the `spring-petclinic-microservices` repository typically includes a `docker-compose.yml` that passes environment variables to each service at container startup.

If the hardcoded metrics application name `petclinic` needs to vary per environment, the `MetricConfig` class must be modified to read from an externalized property instead.

## See Also

- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Spring Boot Externalized Configuration Reference](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config)
- [Micrometer MeterRegistryCustomizer Documentation](https://micrometer.io/docs/concepts#_common_tags)
- [SCENARIOS.md](SCENARIOS.md)
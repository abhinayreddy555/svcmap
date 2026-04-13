<!-- generated: 2026-04-13T04:26:39.343Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Configuration — spring-petclinic-vets-service

## TL;DR for Agents

- **No environment variables, secrets, or feature flags** are explicitly defined in the analyzed configuration source for this service.
- The service uses a **Spring `@Profile("production")` annotation** to conditionally enable caching only in the `production` profile.
- Full configuration extraction requires analysis of `application.yml`, `application.properties`, `bootstrap.yml`, or centralized config server sources — these were **not provided** in the current dataset.
- This document reflects a **partial extraction** from a single Spring `@Configuration` class; expect additional config in sibling files or the config server repo.
- Related microservices configuration may be managed centrally via `spring-petclinic-microservices`' config server.

## Environment Variables

No environment variables were extracted from the analyzed source file.

| Key | Required | Default | Category | Description | Sensitivity |
|-----|----------|---------|----------|-------------|-------------|
| _None found in analyzed source_ | — | — | — | — | — |

> **Note:** The `spring-petclinic-vets-service` almost certainly consumes environment variables (e.g., `SPRING_PROFILES_ACTIVE`, database connection strings, config server URI). These are expected to be defined in `application.yml`, `bootstrap.yml`, Docker Compose files, or Kubernetes manifests. A broader repository scan is required to populate this table.

## Feature Flags

No feature flags were extracted from the analyzed source file.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| _None found in analyzed source_ | — | — | — |

The **Spring profile `production`** functions similarly to a feature flag for caching behavior:

| Mechanism | Type | Default | Description |
|-----------|------|---------|-------------|
| `@Profile("production")` | Spring Profile | _inactive_ (caching disabled unless profile is set) | Enables the caching configuration class only when `SPRING_PROFILES_ACTIVE` includes `production`. When inactive, the caching `@Configuration` bean is not loaded. |

Activate via:

```bash
SPRING_PROFILES_ACTIVE=production
```

or

```bash
java -jar vets-service.jar --spring.profiles.active=production
```

## Deployment Notes

The analyzed code snippet is a Spring `@Configuration` class that conditionally enables caching using `@Profile("production")`. This means **caching is disabled by default** in non-production environments (e.g., `default`, `dev`, `test` profiles) and is only activated when the `production` profile is explicitly set. Operators must ensure `SPRING_PROFILES_ACTIVE=production` is configured in production deployments (via environment variable, Kubernetes ConfigMap, or container orchestration) to benefit from caching.

No secrets, connection strings, or configuration properties were found in the analyzed file. The `spring-petclinic-microservices` project typically uses a **Spring Cloud Config Server** to centralize configuration across its microservices. The authoritative configuration for database URLs, service discovery endpoints, and other runtime properties is expected to reside in a separate config repository or in `application.yml` / `bootstrap.yml` files within the service module. A complete configuration audit should include those files, any Docker Compose or Kubernetes manifests in the repository root, and the config server's backing store.

## See Also

- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Spring Boot Externalized Configuration Reference](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config)
- [Spring Cloud Config Documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/)
- [SCENARIOS.md](SCENARIOS.md)
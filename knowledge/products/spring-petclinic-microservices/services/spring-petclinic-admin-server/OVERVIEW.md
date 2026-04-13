<!-- generated: 2026-04-13T04:06:50.111Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# spring-petclinic-admin-server

> Centralized monitoring and administration dashboard for all microservices in the Spring PetClinic ecosystem.

## TL;DR for Agents

- **What it does:** Spring Boot Admin server providing a web UI and REST API for monitoring health, metrics, logs, and managing all registered microservice instances.
- **Key dependencies:** Requires `config-server` for centralized configuration and `eureka-service-registry` for discovering microservice instances — both are outbound REST calls.
- **No database:** This service owns no database and persists no data; it is a read-only monitoring/admin layer.
- **Entry point for bugs:** Start at `SpringBootAdminApplication.java` — the single entry point annotated with `@EnableAdminServer` and `@EnableDiscoveryClient`.
- **Not business logic:** This service has zero responsibility for pet clinic domain operations (pets, owners, visits, vets).

## Service Identity

| Attribute          | Value                                                                                  |
|--------------------|----------------------------------------------------------------------------------------|
| **Type**           | API (Admin / Monitoring)                                                               |
| **Language**       | Java                                                                                   |
| **Framework**      | Spring Boot + Spring Boot Admin                                                        |
| **Runtime**        | Java 11+                                                                               |
| **Repo**           | `spring-petclinic/spring-petclinic-microservices`                                      |
| **Primary Database** | None                                                                                 |
| **Deployed on**    | Same infrastructure as other PetClinic microservices (typically Docker / Kubernetes)    |

## Responsibilities

### What it owns

- Aggregating health, metrics, and environment information from all registered microservices via Eureka discovery.
- Providing a web-based admin UI (Spring Boot Admin dashboard) for operators.
- Exposing REST endpoints for programmatic access to instance status and management operations.
- Caching service metadata using Caffeine Cache for performance.
- Bridging JMX management operations via Jolokia.

### This service does NOT handle:

- Business logic for pet clinic operations (pets, owners, visits, vets).
- Data persistence for any clinic entities.
- Individual microservice implementations or their internal logic.
- Configuration server implementation — it is a **consumer** of `config-server`, not the provider.

## Entry Points

| File | Description |
|------|-------------|
| `src/main/java/org/springframework/samples/petclinic/admin/SpringBootAdminApplication.java` | Spring Boot application entry point annotated with `@EnableAdminServer` and `@EnableDiscoveryClient`. This is the only application class. |

## Key Abstractions

| Abstraction | Description |
|-------------|-------------|
| **Spring Boot Admin Server** | Core module (`@EnableAdminServer`) that provides the admin dashboard UI and REST API for monitoring registered application instances. |
| **Eureka Discovery Client** | `@EnableDiscoveryClient` integration that auto-discovers all microservices registered with the Eureka service registry, eliminating manual instance configuration. |
| **Spring Cloud Config Client** | Pulls externalized configuration from the central `config-server` at startup, enabling environment-specific settings without code changes. |
| **Jolokia JMX Bridge** | Exposes JMX MBeans over HTTP/JSON, allowing the admin server to read JMX metrics from registered services without native JMX connectivity. |
| **Caffeine Cache** | In-memory caching layer used to reduce redundant calls when aggregating status and metadata from discovered services. |

## What an Agent Needs to Know to Work on This Service

### Where to start

1. **Single entry point:** `SpringBootAdminApplication.java` is the only application class. All behavior is driven by Spring Boot Admin auto-configuration and the two key annotations (`@EnableAdminServer`, `@EnableDiscoveryClient`).
2. **Configuration is external:** Look in the `config-server` repo (or its backing Git repository) for this service's `application.yml` / `bootstrap.yml` — not just the local `src/main/resources`.

### Key patterns

- **No custom controllers or services** — this is a thin wrapper around Spring Boot Admin's auto-configured functionality. Most customization happens through configuration properties, not code.
- **Dependency startup order matters:** `config-server` must be running before this service starts (bootstrap config fetch). `eureka-service-registry` must be running for instance discovery to work.
- **Debugging connectivity issues:** If the dashboard shows no instances, verify Eureka connectivity first. Check `eureka.client.serviceUrl.defaultZone` in the resolved configuration.
- **Testing approach:** No custom test suite is evident. Validation is typically done via integration tests that spin up the full Spring context or by verifying the admin UI manually.

### Useful commands

```bash
# Build the service
./mvnw -pl spring-petclinic-admin-server clean package

# Run locally (requires config-server and eureka to be up)
./mvnw -pl spring-petclinic-admin-server spring-boot:run
```

## Related Documents

- [API.md](API.md) — REST API surface and admin endpoints
- [SCENARIOS.md](SCENARIOS.md) — Common operational scenarios and workflows
- [DEPENDENCIES.md](DEPENDENCIES.md) — Full dependency graph including config-server and eureka
- [RUNBOOK.md](RUNBOOK.md) — Troubleshooting, startup order, and operational procedures

## See Also

- [Spring Boot Admin Reference Documentation](https://docs.spring-boot-admin.com/)
- [Spring Cloud Netflix Eureka Client Docs](https://cloud.spring.io/spring-cloud-netflix/reference/html/)
- [spring-petclinic-microservices root README](../../README.md)
- [config-server OVERVIEW](../spring-petclinic-config-server/OVERVIEW.md)
<!-- generated: 2026-04-13T04:26:23.703Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Dependencies — spring-petclinic-visits-service

## TL;DR for Agents

- **0 outbound service calls**, 1 private database, 6 third-party integrations — this is a leaf service with no downstream microservice dependencies.
- The service owns `visits-db` (private datastore) for all visit records and pet-visit relationships; no shared database risk.
- Relies on **Eureka** for service discovery and **Spring Cloud Config Server** for centralized configuration at startup — failure of either blocks bootstrap.
- Exposes metrics via **Prometheus** and distributed traces via **Zipkin** (OpenTelemetry exporter); relevant for observability pipeline impact analysis.
- **Chaos Monkey** is included as a dependency — resilience/fault-injection testing is available in this service.

## Outbound Calls

| Target | Type | Endpoint / Topic | Purpose | Timeout | Retries | Is External |
|--------|------|-------------------|---------|---------|---------|-------------|
| _None_ | — | — | — | — | — | — |

> This service makes **no outbound calls** to other microservices. It is a leaf node in the service topology.

## Databases & Storage

| Name | Type | Purpose | Shared / Private |
|------|------|---------|------------------|
| `visits-db` | Other (embedded/configurable) | Primary datastore for visit records, pet-visit relationships, and visit metadata | **Private** — exclusively owned by `spring-petclinic-visits-service` |

### Notes

- The database type is configurable via Spring profiles (e.g., HSQLDB in-memory for development, MySQL for production). The concrete engine is determined by the active profile and configuration served by Spring Cloud Config Server.
- Because `visits-db` is **not shared**, schema migrations or data changes have **no cross-service impact**.

## Third-Party Integrations

| Name | Category | SDK / Package | Purpose |
|------|----------|---------------|---------|
| Eureka | Service Discovery | `spring-cloud-starter-netflix-eureka-client` | Service discovery and registration for microservices architecture |
| Spring Cloud Config Server | Configuration Management | `spring-cloud-starter-config` | Centralized configuration management, loaded from config server at startup |
| Prometheus | Monitoring | `micrometer-registry-prometheus` | Metrics collection and exposure via `/actuator/prometheus` endpoint |
| Zipkin | Distributed Tracing | `opentelemetry-exporter-zipkin`, `micrometer-tracing-bridge-brave`, `zipkin-reporter-brave` | Distributed tracing and observability across microservices |
| Jolokia | JMX Bridge | `jolokia-core` | JMX bridge for remote monitoring and management via HTTP |
| Chaos Monkey | Chaos Engineering | `chaos-monkey-spring-boot` | Resilience testing and fault injection |

### Startup-Critical Dependencies

The following integrations are required during application bootstrap. If unavailable, the service **may fail to start**:

| Dependency | Failure Mode |
|------------|-------------|
| Spring Cloud Config Server | Service cannot load externalized configuration; startup fails or falls back to local defaults (if configured) |
| Eureka | Service starts but cannot register itself; other services cannot discover it via service registry |

## Inbound Calls

> **Note:** This section is populated from the product-level service graph and may be incomplete.

| Source Service | Method / Endpoint | Purpose |
|----------------|-------------------|---------|
| `spring-petclinic-api-gateway` | `GET /visits/**` | The API gateway routes client requests for visit data to this service |
| `spring-petclinic-customers-service` _(potential)_ | `GET /pets/{petId}/visits` | Customers service may query visits per pet (verify in product-level topology) |

Since `spring-petclinic-visits-service` has **0 outbound calls**, any incident in this service is **contained** — it will not cascade downstream. However, callers (primarily the API gateway) will experience degraded functionality if this service becomes unavailable.

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Failure scenarios and resilience analysis for this service
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Source repository and architecture overview
- [Spring Cloud Netflix Eureka documentation](https://cloud.spring.io/spring-cloud-netflix/reference/html/) — Service discovery configuration reference
- [Spring Cloud Config documentation](https://cloud.spring.io/spring-cloud-config/reference/html/) — Centralized configuration server reference
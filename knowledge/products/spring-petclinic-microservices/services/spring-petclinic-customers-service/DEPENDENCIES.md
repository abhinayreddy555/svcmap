<!-- generated: 2026-04-13T04:16:05.794Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Dependencies — spring-petclinic-customers-service

## TL;DR for Agents

- **0 outbound service calls** — this is a leaf service with no downstream microservice dependencies.
- **1 private database** (`petclinic-db`) stores owners, pets, and pet types.
- **5 third-party integrations**: Config Server, Eureka, Prometheus, Zipkin, and Jolokia.
- If this service goes down, any upstream service (e.g., API Gateway) that queries owner/pet data will be impacted.
- No outbound calls means this service cannot be the *cause* of a cascading downstream failure to other microservices.

---

## Outbound Calls

This service makes **no outbound calls** to other microservices.

| Target | Type | Endpoint / Topic | Purpose | Timeout | Retries | Is External |
|--------|------|-------------------|---------|---------|---------|-------------|
| *(none)* | — | — | — | — | — | — |

> **Note:** Connections to infrastructure components (Config Server, Eureka, Zipkin) are listed under [Third-Party Integrations](#third-party-integrations) rather than as outbound service calls.

---

## Databases & Storage

| Name | Type | Purpose | Shared / Private |
|------|------|---------|------------------|
| `petclinic-db` | Other (configurable — HSQLDB in-memory by default, MySQL/PostgreSQL via profile) | Primary datastore for owners, pets, and pet types | **Private** |

> The database is private to this service. Schema changes or outages will **not** directly affect other microservices' data stores, but will make owner/pet data unavailable to any caller.

---

## Third-Party Integrations

| Name | Category | SDK / Package | Purpose |
|------|----------|---------------|---------|
| Spring Cloud Config Server | Configuration Management | `spring-cloud-starter-config` | Centralized configuration management — service fetches its config at startup |
| Eureka Service Discovery | Service Discovery | `spring-cloud-starter-netflix-eureka-client` | Registers this service instance so upstream consumers (e.g., API Gateway) can discover it |
| Prometheus | Monitoring | `micrometer-registry-prometheus` | Exposes `/actuator/prometheus` endpoint for metrics scraping |
| Zipkin | Distributed Tracing | `opentelemetry-exporter-zipkin`, `micrometer-tracing-bridge-brave`, `zipkin-reporter-brave` | Exports distributed trace spans for end-to-end request visibility |
| Jolokia | JMX Bridge | `jolokia-core` | Exposes JMX MBeans over HTTP for remote management and monitoring |

### Startup-Critical Dependencies

The following must be reachable **at boot time** or the service may fail to start:

| Dependency | Failure Behavior |
|------------|-----------------|
| Spring Cloud Config Server | Service cannot load externalized configuration; startup will fail or fall back to local defaults (if `optional:` prefix or fail-fast is disabled) |
| Eureka Service Discovery | Service starts but will not be discoverable by upstream consumers until Eureka is available |

---

## Inbound Calls

> **Note:** This section is populated from the product-level service graph and may be incomplete.

| Source | Type | Endpoint(s) | Purpose |
|--------|------|-------------|---------|
| `spring-petclinic-api-gateway` | HTTP (REST) | `GET /owners`, `GET /owners/{ownerId}`, `PUT /owners/{ownerId}`, `POST /owners`, `GET /petTypes`, `GET /owners/*/pets/{petId}`, `PUT /owners/*/pets/{petId}`, `POST /owners/*/pets` | Proxies client requests for owner and pet CRUD operations |

> Other services in the `spring-petclinic-microservices` product (e.g., `visits-service`) do **not** call this service directly — they rely on the client passing owner/pet IDs.

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Failure scenarios and blast-radius analysis for this service
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Source code and Docker Compose setup
- [Spring Cloud Netflix Eureka documentation](https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/) — Service discovery configuration reference
- [Spring Cloud Config documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/) — Centralized configuration reference
<!-- generated: 2026-04-13T04:08:26.303Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Dependencies — spring-petclinic-admin-server

## TL;DR for Agents

- **spring-petclinic-admin-server** makes **2 outbound REST calls** (config-server, eureka-service-registry) and has **0 databases**.
- This service is the **Spring Boot Admin monitoring UI** — it discovers and monitors all other microservices in the petclinic ecosystem via Eureka.
- Key third-party integrations: **Spring Boot Admin Server**, **Jolokia** (JMX-over-HTTP), and **Caffeine** (in-memory cache).
- If **config-server** is down, this service cannot start or fetch its configuration. If **eureka-service-registry** is down, it cannot discover services to monitor.
- This service has **no database dependencies** — all state is transient/in-memory.

---

## Outbound Calls

| Target | Type | Endpoint / Topic | Purpose | Timeout (ms) | Retries | Is External |
|---|---|---|---|---|---|---|
| `config-server` | REST | `configserver` | Fetch centralized configuration at startup and runtime | N/A | N/A | No |
| `eureka-service-registry` | REST | `service-discovery` | Register as a discovery client and discover other microservices for monitoring | N/A | N/A | No |

> **Note:** Timeout and retry values are not explicitly configured in the service source and will fall back to Spring Cloud defaults (e.g., Eureka heartbeat interval of 30s, config retry disabled unless `spring-retry` is on the classpath).

## Databases & Storage

| Name | Type | Purpose | Shared / Private |
|---|---|---|---|
| _None_ | — | — | — |

This service is stateless. Any cached data is held in-memory via Caffeine and is ephemeral.

## Third-Party Integrations

| Name | Category | SDK / Package | Purpose |
|---|---|---|---|
| Spring Boot Admin | Monitoring | `spring-boot-admin-starter-server` | Server-side monitoring and management UI for all registered Spring Boot applications |
| Jolokia | Monitoring | `jolokia-core` | JMX-over-HTTP bridge enabling remote JVM monitoring of discovered services |
| Caffeine | Caching | `caffeine` | In-memory caching library (likely used for caching service instance metadata or actuator responses) |

## Inbound Calls

| Source | Type | Endpoint / Topic | Purpose |
|---|---|---|---|
| All registered microservices (via Eureka) | REST (Actuator) | `/actuator/**` on target services | Admin server **pulls** health, metrics, and management data from discovered services; services do not push to admin-server directly |
| End users / Operators | HTTP | Admin Server UI (default port `9090`) | Operators access the Spring Boot Admin web dashboard to view service health and manage instances |

> **Note:** This section is populated from product-level knowledge and may be incomplete. The admin-server primarily acts as a **consumer** — it discovers services via Eureka and polls their actuator endpoints. No other microservice in the petclinic topology makes direct programmatic calls to the admin-server.

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Failure scenarios and impact analysis for the admin server
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Source repository and architecture overview
- [Spring Boot Admin Reference Guide](https://docs.spring-boot-admin.com/) — Official documentation for the Spring Boot Admin framework
- [CONFIG_SERVER.md](../spring-petclinic-config-server/DEPENDENCIES.md) — Dependencies for the config-server (upstream dependency)
<!-- generated: 2026-04-13T04:14:52.899Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Dependencies — spring-petclinic-discovery-server

## TL;DR for Agents

- **1 outbound REST call** to `config-server` for centralized configuration fetching at startup.
- **0 databases** — this service holds no persistent storage; all registry state is in-memory.
- **Core function**: runs a **Netflix Eureka Server** instance — all other microservices in the product register here and discover each other through this service.
- **Critical path**: if `config-server` is unreachable at boot, this service will fail to start with its intended configuration.
- **Inbound dependency fan-in is high** — every microservice in `spring-petclinic-microservices` depends on this service for registration and discovery.

---

## Outbound Calls

| Target | Type | Endpoint / Topic | Purpose | Timeout | Retries | Is External |
|---|---|---|---|---|---|---|
| `config-server` | REST | `GET /` | Fetch centralized configuration from Spring Cloud Config Server | Not configured (default) | Not configured (default) | No |

> **Note:** The outbound call to `config-server` occurs during the bootstrap phase of the Spring application context. If the config server is unavailable, the service falls back to local configuration (if `spring.cloud.config.fail-fast` is not set to `true`) or fails to start entirely.

---

## Databases & Storage

| Name | Type | Purpose | Shared / Private |
|---|---|---|---|
| *(none)* | — | — | — |

This service maintains no persistent storage. The Eureka service registry is held **entirely in-memory** and is rebuilt from heartbeat registrations sent by client microservices. A restart of this service means all clients must re-register.

---

## Third-Party Integrations

| Name | Category | SDK / Package | Purpose |
|---|---|---|---|
| Netflix Eureka | Service Discovery | `spring-cloud-starter-netflix-eureka-server` | Provides the service registry and discovery server that all microservices register with and query for peer endpoints |
| Spring Cloud Config | Configuration Management | `spring-cloud-starter-config` | Pulls externalized, centralized configuration from `config-server` at startup |

---

## Inbound Calls

> **Note:** This table is populated from the product-level service graph and may be incomplete.

| Source | Type | Endpoint / Topic | Purpose |
|---|---|---|---|
| `api-gateway` | REST (Eureka client) | `POST /eureka/apps/{appId}`, `GET /eureka/apps` | Registers itself and discovers downstream service instances for routing |
| `customers-service` | REST (Eureka client) | `POST /eureka/apps/{appId}`, `PUT /eureka/apps/{appId}/{instanceId}` | Registers itself; sends periodic heartbeats |
| `visits-service` | REST (Eureka client) | `POST /eureka/apps/{appId}`, `PUT /eureka/apps/{appId}/{instanceId}` | Registers itself; sends periodic heartbeats |
| `vets-service` | REST (Eureka client) | `POST /eureka/apps/{appId}`, `PUT /eureka/apps/{appId}/{instanceId}` | Registers itself; sends periodic heartbeats |
| `admin-server` | REST (Eureka client) | `GET /eureka/apps` | Discovers all registered instances for monitoring dashboard |

All inbound traffic uses the standard **Eureka REST API** (typically served on port `8761`). Clients interact via:

- `POST /eureka/apps/{appId}` — registration
- `PUT /eureka/apps/{appId}/{instanceId}` — heartbeat renewal
- `GET /eureka/apps` — full registry fetch
- `GET /eureka/apps/delta` — incremental registry fetch

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Failure scenarios including config-server unavailability and discovery-server downtime impact
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Product-level repository and architecture overview
- [Spring Cloud Netflix Eureka documentation](https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/) — Official reference for Eureka server configuration and tuning
- [config-server DEPENDENCIES.md](../spring-petclinic-config-server/DEPENDENCIES.md) — Dependency documentation for the upstream config-server
<!-- generated: 2026-04-13T04:13:22.694Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# spring-petclinic-discovery-server

> Eureka-based service discovery server enabling dynamic registration and lookup of microservices in the Spring PetClinic architecture.

## TL;DR for Agents

- **What it does:** Runs a Netflix Eureka server that allows all PetClinic microservices to register themselves and discover each other at runtime.
- **Key dependency:** Fetches its configuration from `config-server` via Spring Cloud Config on startup — if config-server is down, this service will fail to start correctly.
- **No database:** This service owns no database; all registry state is held in-memory by Eureka.
- **Entry point for bugs:** Single application class at `DiscoveryServerApplication.java` — almost all issues will be configuration or networking related, not code logic.
- **Blast radius:** If this service goes down, inter-service discovery breaks across the entire PetClinic system.

## Service Identity

| Attribute         | Value                                                                                      |
|-------------------|--------------------------------------------------------------------------------------------|
| **Type**          | API (Infrastructure / Service Registry)                                                    |
| **Language**      | Java                                                                                       |
| **Framework**     | Spring Boot + Spring Cloud Netflix Eureka Server                                           |
| **Runtime**       | Java 11+                                                                                   |
| **Repo**          | `spring-petclinic/spring-petclinic-microservices`                                          |
| **Primary Database** | None (in-memory Eureka registry)                                                        |
| **Deployed on**   | Typically `localhost:8761` in dev; containerized or VM-based in production                  |

## Responsibilities

### What it owns

- Hosting the Eureka Server instance for the entire microservices topology.
- Accepting service registration requests from all PetClinic microservices (customers, vets, visits, api-gateway, etc.).
- Providing a service registry that clients query to resolve service locations dynamically.
- Exposing the Eureka dashboard UI for operational visibility into registered instances.
- Performing health-check eviction of stale service instances.

### This service does NOT handle:

- Business logic for pet clinic operations (pets, owners, visits, vets).
- Data persistence of any kind.
- Configuration management — delegates entirely to `config-server`.
- Individual microservice implementations or routing (handled by the API gateway).

## Entry Points

| File | Description |
|------|-------------|
| `src/main/java/org/springframework/samples/petclinic/discovery/DiscoveryServerApplication.java` | Spring Boot application entry point annotated with `@EnableEurekaServer` to bootstrap the Eureka discovery server. |

## Key Abstractions

| Abstraction | Description |
|-------------|-------------|
| **`@EnableEurekaServer`** | Spring Cloud annotation that activates the embedded Netflix Eureka server within this Spring Boot application. This is the core of the service. |
| **`@SpringBootApplication`** | Standard Spring Boot bootstrap annotation providing auto-configuration, component scanning, and application context initialization. |
| **ServiceRegistry (Eureka)** | The in-memory registry maintained by Eureka that tracks all registered microservice instances, their health status, and network locations. Not a custom class — provided by the Eureka Server library. |

## What an Agent Needs to Know to Work on This Service

### Where to start

- The entire service is essentially a single class: `DiscoveryServerApplication.java`. The heavy lifting is done by the `@EnableEurekaServer` annotation and Spring Cloud auto-configuration.
- Configuration is the most important artifact. Look in `src/main/resources/application.yml` (or `bootstrap.yml`) for local defaults, but remember that **runtime configuration is pulled from `config-server`** — check the config repo for the `discovery-server` profile.

### Key patterns

- **Config-first bootstrap:** This service uses Spring Cloud Config Client to fetch configuration before the application context fully initializes. The `config-server` must be reachable at startup.
- **Self-registration prevention:** In typical Eureka server setups, the server is configured with `eureka.client.register-with-eureka=false` and `eureka.client.fetch-registry=false` to prevent it from trying to register with itself.
- **Minimal custom code:** Nearly all behavior comes from Spring Cloud libraries. Bugs are almost always configuration issues (wrong ports, unreachable config-server, network policies) rather than code defects.

### Testing

- Tests use `@SpringBootTest` for context loading verification. Run with:
  ```bash
  ./mvnw test -pl spring-petclinic-discovery-server
  ```

### Common troubleshooting

| Symptom | Likely Cause |
|---------|-------------|
| Service fails to start | `config-server` is unreachable or not started yet |
| Other services can't register | Discovery server port mismatch or firewall/network issue |
| Instances evicted too quickly | Eureka lease/renewal configuration too aggressive |
| Dashboard shows no instances | Services are pointing to wrong Eureka URL in their config |

## Related Documents

- [API.md](API.md) — API surface and Eureka endpoints
- [SCENARIOS.md](SCENARIOS.md) — Common operational scenarios and workflows
- [DEPENDENCIES.md](DEPENDENCIES.md) — Full dependency graph and outbound connections
- [TABLE_MAP.md](TABLE_MAP.md) — Not applicable (no database)
- [RUNBOOK.md](RUNBOOK.md) — Operational runbook for incidents and restarts

## See Also

- [Spring Cloud Netflix Eureka Documentation](https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/)
- [spring-petclinic-microservices root README](https://github.com/spring-petclinic/spring-petclinic-microservices/blob/master/README.md)
- [config-server OVERVIEW.md](../spring-petclinic-config-server/OVERVIEW.md) — The config server this service depends on at startup
- [api-gateway OVERVIEW.md](../spring-petclinic-api-gateway/OVERVIEW.md) — Primary consumer of the discovery registry
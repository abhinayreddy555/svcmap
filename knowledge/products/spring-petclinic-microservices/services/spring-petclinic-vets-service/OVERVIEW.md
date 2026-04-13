<!-- generated: 2026-04-13T04:21:35.971Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# spring-petclinic-vets-service

> Microservice providing a REST API for managing and retrieving veterinarian information in the Spring PetClinic system.

## TL;DR for Agents

- **What it does:** Exposes a `GET /vets` REST endpoint that returns all veterinarians and their specialties, with caching support.
- **Key dependencies:** Requires **config-server** for configuration and **eureka-server** for service discovery registration; owns a dedicated **vets-db** database.
- **Entry point for bugs:** Start at `VetResource.java` (REST controller) and `VetRepository.java` (data access); caching issues trace to `CacheConfig`.
- **Database ownership:** Owns `vets-db` exclusively — stores vet and specialty entities. This database is **not shared** with other services.
- **Testing:** Uses `@WebMvcTest` with mocked repositories, JUnit 5/Mockito, and in-memory HSQLDB under a test profile that disables cloud config and Eureka.

## Service Identity

| Attribute          | Value                                                              |
| ------------------ | ------------------------------------------------------------------ |
| **Type**           | API (REST microservice)                                            |
| **Language**       | Java                                                               |
| **Framework**      | Spring Boot                                                        |
| **Runtime**        | Java 11+                                                           |
| **Repo**           | `spring-petclinic/spring-petclinic-microservices`                  |
| **Primary Database** | `vets-db` (dedicated, not shared)                                |
| **Deployed on**    | Registers with Eureka; configuration fetched from Spring Cloud Config Server |

## Responsibilities

### What this service owns

- Serving veterinarian data via the `GET /vets` REST endpoint
- Persisting and querying vet and specialty entities in `vets-db`
- Caching vet query results to reduce database load
- Registering itself with Eureka for service discovery by other microservices
- Externalizing configuration via Spring Cloud Config Server

### This service does NOT handle:

- **Pet management** — handled by a separate service
- **Visit scheduling** — handled by a separate service
- **Owner management** — handled by a separate service
- **Authentication and authorization**
- **Email notifications**

## Entry Points

| File | Description |
| ---- | ----------- |
| `src/main/java/org/springframework/samples/petclinic/vets/VetsServiceApplication.java` | Spring Boot application entry point; enables Eureka discovery client and configuration properties |
| `src/main/java/org/springframework/samples/petclinic/vets/web/VetResource.java` | REST controller exposing `GET /vets` for retrieving all veterinarians |

## Key Abstractions

| Class / Module     | Description |
| ------------------ | ----------- |
| **VetResource**    | `@RestController` that handles incoming HTTP requests on `/vets` and delegates to the repository layer. The primary surface area for API bugs. |
| **VetRepository**  | Spring Data repository interface for querying vet entities from `vets-db`. The single data-access abstraction for this service. |
| **Vet**            | JPA entity representing a veterinarian, including associations to specialties. Maps to the `vets` table. |
| **VetsProperties** | `@ConfigurationProperties` bean exposing externalized configuration (e.g., cache settings). Values are sourced from config-server. |
| **CacheConfig**    | Configuration class that sets up the caching layer for vet queries, reducing repeated database hits on the `GET /vets` endpoint. |

## What an Agent Needs to Know to Work on This Service

### Where to start

1. **REST layer:** Open `VetResource.java` — it contains the sole endpoint (`GET /vets`). All request/response shaping happens here.
2. **Data layer:** `VetRepository` is a Spring Data JPA interface; query behavior is derived from method names or annotations — no manual SQL.
3. **Configuration:** Runtime config is pulled from **config-server** at startup. Look for `application.yml` / `bootstrap.yml` for local overrides and the config repo for environment-specific values.

### Key patterns

- **Spring Cloud Config + Eureka:** The service will fail to start if config-server is unreachable (unless a `native` profile or fallback is configured). Eureka registration is automatic via `@EnableDiscoveryClient`.
- **Caching:** `CacheConfig` wires a cache (typically Caffeine or simple in-memory) over the vet query. If stale data is reported, inspect cache TTL in `VetsProperties`.
- **Test profile:** Tests use a dedicated profile that disables cloud config (`spring.cloud.config.enabled=false`) and Eureka, substituting an in-memory HSQLDB. Run tests with:
  ```bash
  ./mvnw test -pl spring-petclinic-vets-service
  ```
- **No cross-service writes:** This service only reads/writes its own `vets-db`. It never calls the pets, visits, or owners services.

## Related Documents

- [API.md](API.md) — Endpoint contracts, request/response schemas, and status codes
- [SCENARIOS.md](SCENARIOS.md) — Common operational and debugging scenarios
- [DEPENDENCIES.md](DEPENDENCIES.md) — Full dependency graph including config-server and eureka-server
- [TABLE_MAP.md](TABLE_MAP.md) — Database schema for `vets-db` (tables, columns, relationships)
- [RUNBOOK.md](RUNBOOK.md) — Startup, health checks, and incident response procedures

## See Also

- [Spring PetClinic Microservices (parent repo)](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Spring Cloud Netflix Eureka documentation](https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/)
- [Spring Cloud Config documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/)
- [Spring Boot Caching Guide](https://docs.spring.io/spring-boot/docs/current/reference/html/io.html#io.caching)
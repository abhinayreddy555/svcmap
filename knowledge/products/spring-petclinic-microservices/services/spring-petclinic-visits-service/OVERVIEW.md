<!-- generated: 2026-04-13T04:22:59.526Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# spring-petclinic-visits-service

> Microservice responsible for managing pet visit records in the Spring PetClinic system.

## TL;DR for Agents

- **What it does:** Provides REST APIs to create and retrieve pet visit records (`POST`/`GET`). This is the single source of truth for visit data.
- **Database ownership:** Owns `visits-db` exclusively — no other service reads from or writes to this database.
- **Key entry point for bugs:** Start at `VisitResource.java` (REST controller) and `VisitRepository` (data access). All business logic flows through these two classes.
- **Service discovery:** Registers with Eureka; other services (e.g., `api-gateway`) discover it by service name `visits-service`.
- **No outbound service calls:** This service does not call any other microservice — it only serves data from its own database.

## Service Identity

| Attribute          | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Type**           | API (REST microservice)                                               |
| **Language**       | Java                                                                  |
| **Framework**      | Spring Boot                                                           |
| **Runtime**        | Java 17+                                                              |
| **Repo**           | `spring-petclinic/spring-petclinic-microservices`                     |
| **Primary Database** | `visits-db` (dedicated, not shared)                                 |
| **Deployed on**    | Eureka-registered service within the Spring PetClinic microservices cluster |

## Responsibilities

### What this service owns

- Creating new visit records for a given pet
- Retrieving visit history for one or more pets
- Persisting visit data (date, description, pet association) to `visits-db`
- Exposing Micrometer metrics for visit operations (via `MetricConfig`)

### This service does NOT handle:

- **Pet management** — delegates to `pets-service`
- **Owner management** — delegates to `customers-service`
- **Authentication and authorization** — no security layer in this service
- **Email notifications** — not in scope

## Entry Points

| File | Description |
|------|-------------|
| `src/main/java/org/springframework/samples/petclinic/visits/VisitsServiceApplication.java` | Spring Boot application entry point; enables Eureka discovery client via `@EnableDiscoveryClient` |
| `src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java` | REST controller exposing `POST` and `GET` endpoints for visit management |

## Key Abstractions

| Class / Module | Role |
|----------------|------|
| **`VisitResource`** | REST controller — the single entry point for all HTTP requests. Handles request validation and delegates to the repository. |
| **`Visit`** | JPA entity representing a visit record (date, description, pet ID). Maps directly to the `visits` table. |
| **`VisitRepository`** | Spring Data JPA repository interface. Provides CRUD operations and custom query methods for visits by pet ID(s). |
| **`MetricConfig`** | Configuration class that registers custom Micrometer metrics for monitoring visit operations. |

## What an Agent Needs to Know to Work on This Service

1. **Where to start:** Open `VisitResource.java` — it contains all REST endpoints and is the only controller in the service. The codebase is intentionally small.
2. **Data access pattern:** Spring Data JPA with `VisitRepository`. No custom SQL or service layer — the controller talks directly to the repository.
3. **Testing:** Tests use `@WebMvcTest` with a mocked `VisitRepository`. The test profile disables Eureka and Spring Cloud Config Server to allow isolated local testing. Run tests with:
   ```bash
   ./mvnw test -pl spring-petclinic-visits-service
   ```
4. **Configuration:** Application config is externalized via Spring Cloud Config Server in production. For local development, check `src/main/resources/application.yml` and any `bootstrap.yml`.
5. **No outbound dependencies:** Unlike other services in this system, `visits-service` makes zero outbound HTTP calls. If you see a bug involving cross-service data, the issue is likely in the caller (e.g., `api-gateway` or `customers-service`), not here.
6. **Database schema:** The service owns its schema in `visits-db`. Look for `schema.sql` / `data.sql` in `src/main/resources` or Flyway/Liquibase migrations if present.

## Related Documents

- [API.md](API.md) — REST endpoint contracts, request/response schemas
- [SCENARIOS.md](SCENARIOS.md) — Key usage scenarios and data flows
- [DEPENDENCIES.md](DEPENDENCIES.md) — Full dependency graph and integration points
- [TABLE_MAP.md](TABLE_MAP.md) — Database schema and table ownership
- [RUNBOOK.md](RUNBOOK.md) — Operational procedures, common issues, and troubleshooting

## See Also

- [Spring PetClinic Microservices (parent repo)](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Spring Boot Reference Documentation](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/)
- [Spring Cloud Netflix Eureka](https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/)
- [Spring Data JPA Reference](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/)
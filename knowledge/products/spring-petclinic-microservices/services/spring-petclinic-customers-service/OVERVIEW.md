<!-- generated: 2026-04-13T04:14:13.862Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# spring-petclinic-customers-service

> Microservice responsible for managing customer (owner) and pet data in the PetClinic system.

## TL;DR for Agents

- **What it does:** Provides REST APIs for CRUD operations on owners and their pets (create, read, update). This is the single source of truth for customer and pet data in the PetClinic microservices ecosystem.
- **Key dependencies:** Spring Boot + Spring Data JPA, Eureka service discovery client, no outbound calls to other services.
- **Database ownership:** Owns the `petclinic-db` database exclusively — stores owners, pets, and pet types.
- **Entry point for bugs:** Start at `OwnerResource.java` and `PetResource.java` for API issues; check `OwnerRepository` / `PetRepository` for data-layer problems.
- **Testing:** JUnit 5 + Mockito with `@WebMvcTest` for controllers; test profile disables Eureka and Spring Cloud Config.

## Service Identity

| Attribute          | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Type**           | API (REST microservice)                                               |
| **Language**       | Java                                                                  |
| **Framework**      | Spring Boot                                                           |
| **Runtime**        | Java 17+                                                              |
| **Repo**           | `spring-petclinic/spring-petclinic-microservices`                     |
| **Primary Database** | `petclinic-db` (exclusive ownership — owners, pets, pet types)      |
| **Deployed on**    | Registered with Eureka; typically deployed as a containerized service |

## Responsibilities

### What this service owns

- CRUD operations for **owners** (customers) via `/owners` endpoints
- CRUD operations for **pets** via `/owners/{ownerId}/pets` endpoints
- Management of **pet types** (e.g., cat, dog, bird)
- Persistence of all owner and pet data in `petclinic-db`
- Service registration with Eureka for discovery by other microservices (e.g., API gateway)
- Exposing metrics for monitoring

### This service does NOT handle:

- **Visits management** — handled by a separate visits service
- **Veterinary data** — handled by a separate vets service
- **Authentication/Authorization** — handled by the API gateway or a dedicated auth service
- **Email notifications** — not in scope

## Entry Points

| File | Description |
|------|-------------|
| `src/main/java/org/springframework/samples/petclinic/customers/CustomersServiceApplication.java` | Spring Boot application entry point with `@EnableDiscoveryClient` for Eureka registration |
| `src/main/java/org/springframework/samples/petclinic/customers/web/OwnerResource.java` | REST controller exposing `/owners` endpoints for owner CRUD operations |
| `src/main/java/org/springframework/samples/petclinic/customers/web/PetResource.java` | REST controller exposing `/owners/{ownerId}/pets` endpoints for pet CRUD operations |

## Key Abstractions

| Class / Interface | Purpose |
|-------------------|---------|
| **`Owner`** | JPA entity representing a customer (owner). Root aggregate that contains a collection of pets. |
| **`Pet`** | JPA entity representing a pet, always associated with an `Owner` and a `PetType`. |
| **`PetType`** | JPA entity representing the species/type of a pet (e.g., cat, dog). |
| **`OwnerRepository`** | Spring Data JPA repository for `Owner` persistence and queries. |
| **`PetRepository`** | Spring Data JPA repository for `Pet` persistence and queries. |
| **`OwnerEntityMapper`** | Mapper that converts between `OwnerRequest` DTOs and `Owner` entities, decoupling the API contract from the persistence model. |
| **`ResourceNotFoundException`** | Custom exception thrown when an owner or pet is not found; likely mapped to HTTP 404 responses. |

Supporting DTOs: `OwnerRequest`, `PetRequest` (inbound), and `PetDetails` (outbound) define the API contract separately from the JPA entities.

## What an Agent Needs to Know to Work on This Service

### Where to start

1. **API issues** → Look at `OwnerResource.java` and `PetResource.java` in `src/main/java/.../web/`.
2. **Data/persistence issues** → Check `OwnerRepository` and `PetRepository`, then the `Owner` and `Pet` entity classes in the `model` package.
3. **Mapping/DTO issues** → Inspect `OwnerEntityMapper` and the request/response DTOs (`OwnerRequest`, `PetRequest`, `PetDetails`).

### Key patterns

- **Standard Spring Boot layering:** Controller → Repository → Database. There is no explicit service layer; controllers interact with repositories directly.
- **DTOs decouple API from persistence:** Inbound requests use `OwnerRequest` / `PetRequest`; outbound responses use entity projections or `PetDetails`.
- **Exception handling:** `ResourceNotFoundException` is thrown when entities are not found — look for `@ControllerAdvice` or `@ExceptionHandler` for HTTP status mapping.
- **Test profile:** Tests disable Eureka and Spring Cloud Config. Use `@WebMvcTest` for controller tests with mocked repositories.

### Useful commands

```bash
# Run the service locally
./mvnw spring-boot:run -pl spring-petclinic-customers-service

# Run tests
./mvnw test -pl spring-petclinic-customers-service
```

## Related Documents

- [API.md](API.md) — REST endpoint details, request/response schemas, and status codes
- [SCENARIOS.md](SCENARIOS.md) — Common workflows and interaction patterns
- [DEPENDENCIES.md](DEPENDENCIES.md) — Full dependency graph and outbound integrations
- [TABLE_MAP.md](TABLE_MAP.md) — Database schema: owners, pets, and pet_types tables
- [RUNBOOK.md](RUNBOOK.md) — Operational guide for deployment, troubleshooting, and monitoring

## See Also

- [spring-petclinic-microservices (parent repo)](https://github.com/spring-petclinic/spring-petclinic-microservices) — Architecture overview and service topology
- [Spring Boot Reference Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/) — Framework reference
- [Spring Cloud Netflix Eureka](https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/) — Service discovery configuration
- [Spring Data JPA Reference](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/) — Repository and query patterns
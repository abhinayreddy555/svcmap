<!-- generated: 2026-04-13T04:27:50.992Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Coding Standards — spring-petclinic-vets-service

## TL;DR for Agents

- **Architecture**: Layered Spring Boot microservice using **Web → Repository → Entity/Model** (no service layer exists today; controllers call repositories directly).
- **Key rule**: Follow existing conventions — PascalCase classes, camelCase methods, interface-based Spring Data JPA repositories, and `@Cacheable` caching on controller methods.
- **Code generation**: Entities live in `model/`, controllers in `web/`, config in `system/`. Do **not** introduce custom exception classes or DTOs unless explicitly asked — the codebase uses Spring defaults and exposes entities directly.
- **Testing**: Use `@WebMvcTest` + `@MockitoBean` for controller tests; test profile uses in-memory HSQLDB with cloud config disabled.
- **Service discovery**: The application registers with Eureka via `@EnableDiscoveryClient`; do not remove or bypass this annotation.

---

## Architecture Pattern

The vets service follows a **simplified Layered Architecture** built on Spring Boot. There is no explicit service/business-logic layer; controllers interact directly with Spring Data JPA repositories.

```
┌─────────────────────────────────────────────────┐
│                   HTTP Client                   │
└────────────────────┬────────────────────────────┘
                     │  REST (JSON)
                     ▼
┌─────────────────────────────────────────────────┐
│          Web / Controller Layer                  │
│   (VetResource — @RestController, @Cacheable)   │
└────────────────────┬────────────────────────────┘
                     │  calls
                     ▼
┌─────────────────────────────────────────────────┐
│            Repository Layer                      │
│   (VetRepository — extends JpaRepository)       │
└────────────────────┬────────────────────────────┘
                     │  JPA / Hibernate
                     ▼
┌─────────────────────────────────────────────────┐
│          Model / Entity Layer                    │
│   (Vet, Specialty — @Entity, @Table)            │
└─────────────────────────────────────────────────┘
                     │
                     ▼
              ┌──────────────┐
              │   Database   │
              │  (MySQL /    │
              │   HSQLDB)    │
              └──────────────┘
```

A separate **System/Configuration** layer holds cross-cutting concerns (caching config, externalized properties).

---

## Layer Structure

| Layer | Directory | Responsibility | Can Call |
|---|---|---|---|
| **Web / Controller** | `src/main/java/org/springframework/samples/petclinic/vets/web/` | HTTP request handling and REST response formatting | Repository, Model |
| **Model / Entity** | `src/main/java/org/springframework/samples/petclinic/vets/model/` | Domain objects and JPA entity definitions | — |
| **Repository** | `src/main/java/org/springframework/samples/petclinic/vets/model/` | Data access abstraction via Spring Data JPA interfaces | — |
| **System / Configuration** | `src/main/java/org/springframework/samples/petclinic/vets/system/` | Application configuration, caching setup, type-safe properties | — |

> **Note:** Repository interfaces currently co-locate with entity classes inside the `model/` package. This is the established convention for this service — do not move them without a broader refactor.

---

## Naming Conventions

| Category | Convention | Example |
|---|---|---|
| **Files** | PascalCase with `.java` extension | `VetResource.java`, `VetRepository.java` |
| **Classes** | PascalCase | `Vet`, `Specialty`, `VetResource` |
| **Functions / Methods** | camelCase | `showResourcesVetList()`, `getSpecialtiesInternal()` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| **Database Columns** | snake_case | `first_name`, `last_name`, `vet_id` |

---

## Error Handling

The service relies entirely on **Spring framework default exception handling**. There are no custom exception classes, `@ControllerAdvice` handlers, or explicit validation annotations in the controller layer. When a repository call fails or an invalid request is received, Spring Boot's built-in `BasicErrorController` produces a standard JSON error response with an appropriate HTTP status code. If you need to add custom error handling, the recommended approach would be to introduce a `@RestControllerAdvice` class in the `web/` package — but be aware this would be a new pattern for this codebase.

---

## Logging

Logging is configured via **Logback** using the `logback-spring.xml` configuration file with Spring Boot defaults. The configuration includes JMX support, allowing runtime log level management without redeployment. There is no structured JSON logging in place — log output follows Logback's default pattern format. When adding log statements, use SLF4J's `LoggerFactory` (`private static final Logger log = LoggerFactory.getLogger(MyClass.class);`) and follow standard level conventions: `DEBUG` for flow tracing, `INFO` for significant lifecycle events, `WARN` for recoverable issues, and `ERROR` for failures requiring attention.

---

## Authentication

No authentication or authorization mechanism is visible in the vets service codebase. The service operates as an **internal microservice** behind the API gateway and relies on the gateway (or infrastructure layer) for any access control. Do not add security filters or auth middleware to this service unless the broader architecture explicitly requires it.

---

## Testing Approach

Tests follow a **unit testing strategy** focused on the web layer:

- **Framework**: `@WebMvcTest` slices the Spring context to load only the controller under test.
- **Mocking**: Repositories are mocked using `@MockitoBean` (Spring Boot's Mockito integration).
- **Assertions**: BDD-style Mockito (`given(...).willReturn(...)`) combined with MockMvc result matchers.
- **Test profile**: Disables Spring Cloud Config (`spring.cloud.config.enabled=false`) and uses an **in-memory HSQLDB** database to avoid external dependencies.

Example test execution:

```bash
./mvnw test -pl spring-petclinic-vets-service
```

When writing new tests, follow the existing pattern: one test class per controller, mock all repository dependencies, and verify JSON response structure via `MockMvc`.

---

## Notable Patterns

### Spring Data Repository Pattern

Repositories are defined as **interfaces** extending `JpaRepository`, letting Spring Data auto-generate CRUD implementations at runtime. No implementation classes are written manually.

```java
// src/main/java/org/springframework/samples/petclinic/vets/model/VetRepository.java
public interface VetRepository extends JpaRepository<Vet, Integer> {
}
```

Custom query methods can be added by declaring method signatures following Spring Data's [query derivation naming conventions](https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html).

---

### Spring Caching Abstraction

Declarative caching is applied via the `@Cacheable` annotation directly on the controller method. The cache is named `"vets"` and is enabled globally through `@EnableCaching` in the configuration layer.

```java
// VetResource.java
@GetMapping
@Cacheable("vets")
public List<Vet> showResourcesVetList() {
    return vetRepository.findAll();
}
```

Cache configuration (TTL, eviction policy) is managed externally via `application.yml` or the cache provider's settings.

---

### Configuration Properties (Type-safe)

Externalized configuration is bound to Java records using `@ConfigurationProperties`, providing compile-time type safety and IDE support.

```java
// src/main/java/org/springframework/samples/petclinic/vets/system/VetsProperties.java
@ConfigurationProperties(prefix = "vets")
public record VetsProperties(Cache cache) {
    public record Cache(int ttl, int heapSize) {}
}
```

Access properties by injecting the record into any Spring-managed bean.

---

### Profile-based Configuration

Environment-specific behavior is controlled via **Spring profiles** (`production`, `docker`, `test`). Profile-specific sections in `application.yml` override defaults.

```yaml
# application.yml
spring:
  profiles:
    active: production

---
spring:
  config:
    activate:
      on-profile: docker
  # docker-specific overrides here
```

Activate profiles via `SPRING_PROFILES_ACTIVE` environment variable or `--spring.profiles.active` CLI argument.

---

### Service Discovery

The application registers itself with **Eureka** for service discovery using the `@EnableDiscoveryClient` annotation on the main application class.

```java
// VetsServiceApplication.java
@EnableDiscoveryClient
@SpringBootApplication
public class VetsServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(VetsServiceApplication.class, args);
    }
}
```

The Eureka server URL and instance metadata are configured in `application.yml`.

---

## Anti-Patterns to Avoid

- **Direct repository injection into controllers** — The controller (`VetResource`) calls `VetRepository` directly, bypassing a service layer. This violates separation of concerns. In new features with business logic, consider introducing a service class, but maintain consistency with the existing codebase for simple CRUD.
- **Business logic in the controller layer** — The `@Cacheable` annotation sits on the controller method rather than a service method. Caching decisions are a cross-cutting concern better placed in a service layer.
- **No explicit error handling or input validation** — The controller has zero `@Valid` annotations, no `@ExceptionHandler`, and no `@ControllerAdvice`. This means malformed requests produce generic Spring error responses.
- **No service layer abstraction** — Controllers are tightly coupled to repositories, making it harder to add business rules, transaction boundaries, or unit-test logic independently.
- **Mutable entity objects with public setters** — Entities like `Vet` expose setters, allowing uncontrolled state mutation. Prefer builder patterns or factory methods for new entities.
- **`protected` method `getSpecialtiesInternal()` leaks internal collection management** — Exposes the raw mutable collection backing a `@OneToMany` relationship. Callers can modify the collection outside entity control.
- **No DTOs or ViewModels** — JPA entities are serialized directly to JSON responses. This couples the API contract to the database schema and risks exposing internal fields or lazy-loading issues.

---

## See Also

- [Spring PetClinic Microservices — Main Repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Spring Data JPA Reference — Query Methods](https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html)
- [Spring Boot Caching Guide](https://docs.spring.io/spring-boot/reference/io/caching.html)
- [Spring Cloud Netflix Eureka — Service Discovery](https://docs.spring.io/spring-cloud-netflix/reference/spring-cloud-netflix.html)
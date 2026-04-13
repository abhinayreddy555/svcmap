<!-- generated: 2026-04-13T04:28:39.775Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Coding Standards — spring-petclinic-visits-service

## TL;DR for Agents

- **Architecture:** Layered Spring Boot app with **Controllers → Repositories → JPA/Database** (no service layer exists; controllers call repositories directly).
- **Key Rule:** Follow Spring Data Repository pattern — define query methods by naming convention on `JpaRepository` interfaces; do **not** write manual SQL or introduce a service layer unless refactoring is explicitly scoped.
- **Naming:** Java files/classes in `PascalCase`, methods in `camelCase`, constants in `UPPER_SNAKE_CASE`, database columns in `snake_case`.
- **Testing:** Use `@WebMvcTest` + `MockMvc` + `@MockitoBean` for controller tests; isolate with `@ActiveProfiles("test")`.
- **Metrics:** Annotate controller methods with `@Timed("petclinic.visit")` for Micrometer instrumentation — do not skip this on new endpoints.

---

## Architecture Pattern

The visits service follows a **simplified Layered Architecture** built on Spring Boot. There is no explicit service/business-logic layer; controllers interact with Spring Data JPA repositories directly.

```
┌──────────────────────────────────────────────┐
│              HTTP Client / API Gateway        │
└──────────────────┬───────────────────────────┘
                   │  REST (JSON)
                   ▼
┌──────────────────────────────────────────────┐
│         Controllers / Resources              │
│  (VisitResource)                             │
│  - Request validation (@Valid, @Min, etc.)   │
│  - Response formatting                       │
│  - @Timed metrics                            │
└──────────────────┬───────────────────────────┘
                   │  Direct injection
                   ▼
┌──────────────────────────────────────────────┐
│         Repositories (Spring Data JPA)       │
│  (VisitRepository extends JpaRepository)     │
│  - Query method naming conventions           │
└──────────────────┬───────────────────────────┘
                   │  JPA / Hibernate
                   ▼
┌──────────────────────────────────────────────┐
│              Database (HSQLDB / MySQL)        │
└──────────────────────────────────────────────┘
```

> **Note:** The service registers itself with Spring Cloud Discovery (`@EnableDiscoveryClient`) and is consumed by the API gateway and other microservices.

---

## Layer Structure

| Layer | Directory | Responsibility | Can Call |
|---|---|---|---|
| **Controllers / Resources** | `src/main/java/org/springframework/samples/petclinic/visits/web/` | HTTP request handling, input validation (`@Valid`), response formatting, metrics (`@Timed`) | Repositories |
| **Models / Domain** | `src/main/java/org/springframework/samples/petclinic/visits/model/` | JPA entity definitions (`Visit`) and Spring Data repository interfaces (`VisitRepository`) | — |
| **Configuration** | `src/main/java/org/springframework/samples/petclinic/visits/config/` | Spring bean definitions, Micrometer `TimedAspect`, application configuration | — |

**Dependency rule:** Controllers depend on Repositories. No layer depends upward. Models/Domain and Configuration are leaf layers with no outbound calls.

---

## Naming Conventions

| Category | Convention | Example |
|---|---|---|
| **Files** | `PascalCase.java` | `VisitResource.java`, `VisitRepository.java` |
| **Classes** | `PascalCase` | `VisitResource`, `Visit`, `MetricConfig` |
| **Methods / Functions** | `camelCase` | `findByPetId()`, `create()` |
| **Constants** | `UPPER_SNAKE_CASE` | `MAX_DESCRIPTION_LENGTH` |
| **Database Columns** | `snake_case` | `pet_id`, `visit_date`, `description` |

When mapping between Java fields and database columns, use JPA `@Column(name = "snake_case")` or rely on Spring's implicit naming strategy.

---

## Error Handling

The service relies on **Spring's default exception handling** and Jakarta Bean Validation annotations (`@Valid`, `@Min`, `@Size`) applied at the controller method parameter level. When validation fails, Spring automatically returns an HTTP `400 Bad Request` with a structured error body. For missing resources or unexpected errors, the framework's default `404` / `500` responses are used. There are **no custom exception classes** and **no `@ControllerAdvice` / `@ExceptionHandler`** defined in this service. If you add a new endpoint, apply validation annotations on request DTOs and entity fields; do not introduce try-catch blocks for flow control. Use `@ResponseStatus` on controller methods to declare the expected success HTTP status code (e.g., `@ResponseStatus(HttpStatus.CREATED)`).

---

## Logging

Logging uses **SLF4J with Logback** as the underlying implementation. Obtain a logger via:

```java
private static final Logger log = LoggerFactory.getLogger(YourClass.class);
```

Runtime configuration is managed through `logback-spring.xml`, and log levels can be adjusted at runtime via JMX through the Spring Boot Admin server. Current logging in the codebase is minimal and does **not** use structured context or correlation IDs. When adding log statements, prefer `log.info()` / `log.debug()` with parameterized messages (e.g., `log.info("Creating visit for pet {}", petId)`) to avoid string concatenation overhead.

---

## Authentication

There is **no authentication or authorization** implemented in this service. The visits service is designed to sit behind an API gateway (Spring Cloud Gateway) that is expected to handle security concerns. Do not add security dependencies or `@Secured` / `@PreAuthorize` annotations to this service without coordinating with the gateway configuration in the parent `spring-petclinic-microservices` project.

---

## Testing Approach

Tests follow a **controller-slice testing** strategy:

- **`@WebMvcTest`** — loads only the web layer (controller under test), not the full application context.
- **`MockMvc`** — used to perform HTTP requests and assert responses without starting a real server.
- **`@MockitoBean`** — mocks repository dependencies injected into the controller.
- **`@ActiveProfiles("test")`** — activates the `test` profile for configuration isolation.
- **BDD-style Mockito** — use `given(...).willReturn(...)` for stubbing.

Example test structure:

```java
@WebMvcTest(VisitResource.class)
@ActiveProfiles("test")
class VisitResourceTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    VisitRepository visitRepository;

    @Test
    void shouldFetchVisits() throws Exception {
        given(visitRepository.findByPetId(111))
            .willReturn(List.of(/* ... */));

        mvc.perform(get("/pets/111/visits"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));
    }
}
```

There are no integration tests or contract tests in this service. If you add new endpoints, add corresponding `@WebMvcTest` tests following this pattern.

---

## Notable Patterns

### Spring Data Repository Pattern

Repository interfaces extend `JpaRepository` and rely on **query method naming conventions** for automatic query generation. Do not write `@Query` annotations or native SQL unless the naming convention cannot express the query.

```java
// src/main/java/org/springframework/samples/petclinic/visits/model/VisitRepository.java
public interface VisitRepository extends JpaRepository<Visit, Integer> {
    List<Visit> findByPetId(int petId);
    List<Visit> findByPetIdIn(Collection<Integer> petIds);
}
```

### Builder Pattern

The `Visit` entity provides a static inner `VisitBuilder` class for fluent object construction. Use the builder in tests and anywhere new `Visit` instances are created programmatically.

```java
Visit visit = Visit.VisitBuilder.aVisit()
    .id(1)
    .petId(111)
    .date(LocalDate.now())
    .description("Routine checkup")
    .build();
```

### Metrics via Micrometer

Controller classes and methods are annotated with **`@Timed`** for automatic metrics collection. A `TimedAspect` bean is registered in the configuration layer to enable AOP-based timing.

```java
@Timed("petclinic.visit")
@PostMapping("owners/*/pets/{petId}/visits")
@ResponseStatus(HttpStatus.CREATED)
public Visit create(@Valid @RequestBody Visit visit, @PathVariable("petId") int petId) {
    visit.setPetId(petId);
    return visitRepository.save(visit);
}
```

> **Rule:** Every new public endpoint **must** include a `@Timed` annotation with a metric name prefixed by `petclinic.`.

### Service Discovery

The application main class is annotated with `@EnableDiscoveryClient` for Spring Cloud service registration (typically Eureka). No additional discovery configuration is needed in the service code.

```java
@EnableDiscoveryClient
@SpringBootApplication
public class VisitsServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(VisitsServiceApplication.class, args);
    }
}
```

---

## Anti-Patterns to Avoid

- **Introducing a service layer without explicit refactoring scope.** The current codebase has controllers calling repositories directly. Adding a partial service layer creates inconsistency — either refactor all endpoints or keep the existing pattern.
- **Direct repository calls with business logic in the controller.** This is an acknowledged shortcoming (e.g., `visit.setPetId(petId)` in `create()`). Do not make it worse by adding complex business logic to controllers; if logic grows, propose a service layer refactoring.
- **Mutable entity objects exposed directly to the HTTP layer.** `Visit` has setters that are called from the controller. Avoid adding more mutation points; prefer the Builder for construction.
- **Missing `@Timed` annotations on new endpoints.** All existing endpoints are instrumented — do not break this convention.
- **Custom exception handling that conflicts with Spring defaults.** Do not add `@ControllerAdvice` or catch-all exception handlers without coordinating across all microservices for consistency.
- **Logging without parameterized messages.** Do not use string concatenation (`"msg " + var`); use SLF4J placeholders (`"msg {}", var`).
- **Writing native SQL or `@Query` annotations** when Spring Data query method naming can express the query.
- **Adding security annotations or filters** to this service — security is handled at the gateway layer.
- **Skipping `@ActiveProfiles("test")` in test classes** — this can cause tests to load production configuration or attempt real database connections.

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Common development scenarios and workflows for this service
- [spring-petclinic-microservices (parent repo)](https://github.com/spring-petclinic/spring-petclinic-microservices) — Gateway, discovery server, and cross-service configuration
- [Spring Data JPA Reference — Query Methods](https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html) — Naming conventions for repository query derivation
- [Micrometer @Timed Documentation](https://micrometer.io/docs/concepts#_the_timed_annotation) — How `@Timed` and `TimedAspect` work together
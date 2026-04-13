<!-- generated: 2026-04-13T04:18:33.018Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Coding Standards — spring-petclinic-customers-service

## TL;DR for Agents

- **Architecture**: Layered architecture using Spring Data Repository Pattern — Web/Resource classes call repositories directly (no service layer). Do **not** introduce a service layer unless explicitly asked.
- **Key rule**: DTOs (Java records with validation annotations) handle request/response; JPA entities live in the `model` package alongside repository interfaces. Mappers convert between them.
- **Naming**: Classes are `PascalCase`, methods are `camelCase`, files are `PascalCase.java`, DB columns are `snake_case`.
- **Testing**: Use `@WebMvcTest` + `MockMvc` with `@MockitoBean` for repositories; test profile uses in-memory HSQLDB and disables cloud config.
- **Metrics**: Every resource class must have a class-level `@Timed` annotation for Micrometer metrics collection.

---

## Architecture Pattern

The service follows a **Layered Architecture with Spring Data Repository Pattern**. There is no explicit service layer — web/resource handlers invoke Spring Data JPA repositories directly.

```
┌─────────────────────────────────────────────────┐
│                  HTTP Client                     │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│           Web / Resource Layer                   │
│  (REST controllers, validation, @Timed metrics) │
│  OwnerResource, PetResource                      │
└──────┬──────────────────┬───────────────────────┘
       │                  │
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│   Mappers    │   │ Repositories │
│ (DTO→Entity) │   │ (JpaRepository│
│              │   │  interfaces)  │
└──────┬───────┘   └──────┬───────┘
       │                  │
       ▼                  ▼
┌─────────────────────────────────────────────────┐
│              Model / Domain Layer                │
│   (JPA entities: Owner, Pet, PetType)           │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│              Database (HSQLDB / MySQL)           │
└─────────────────────────────────────────────────┘
```

---

## Layer Structure

| Layer | Directory | Responsibility | Can Call |
|---|---|---|---|
| **Web/Resource** | `src/main/java/org/springframework/samples/petclinic/customers/web/` | HTTP request handling, validation, response formatting, routing to repositories | Repositories, Mappers, Models |
| **Mapper** | `src/main/java/org/springframework/samples/petclinic/customers/web/mapper/` | DTO-to-Entity mapping and transformation | Models |
| **Model/Domain** | `src/main/java/org/springframework/samples/petclinic/customers/model/` | Domain entities with JPA persistence annotations | — |
| **Repository** | `src/main/java/org/springframework/samples/petclinic/customers/model/` | Spring Data JPA interfaces for database access (co-located with models) | — |
| **Configuration** | `src/main/java/org/springframework/samples/petclinic/customers/config/` | Spring beans, metrics, application configuration | All layers |

> **Note:** Repository interfaces live in the `model` package, not in a separate `repository` package.

---

## Naming Conventions

| Category | Convention | Example |
|---|---|---|
| Files | `PascalCase.java` | `OwnerResource.java`, `PetRepository.java` |
| Classes | `PascalCase` | `OwnerResource`, `PetDetails`, `OwnerEntityMapper` |
| Functions/Methods | `camelCase` | `findOwner`, `processCreationForm`, `addPet` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRIES`, `DEFAULT_PAGE_SIZE` |
| Database columns | `snake_case` | `first_name`, `pet_type_id`, `birth_date` |
| DTOs (request) | `{Entity}Request` (Java record) | `OwnerRequest`, `PetRequest` |
| DTOs (response) | `{Entity}Details` (Java record) | `PetDetails` |
| Repositories | `{Entity}Repository` | `OwnerRepository`, `PetRepository` |
| Resource classes | `{Entity}Resource` | `OwnerResource`, `PetResource` |
| Mappers | `{Entity}EntityMapper` | `OwnerEntityMapper` |

---

## Error Handling

The service uses a custom `ResourceNotFoundException` thrown directly in resource/controller handlers when an entity lookup fails (e.g., owner or pet not found by ID). There is **no global exception handler** (`@ControllerAdvice`) in the codebase — exceptions propagate to Spring Boot's default error handling mechanism, which returns a standard JSON error response with appropriate HTTP status codes. When adding new endpoints, throw `ResourceNotFoundException` with a descriptive inline message for 404 cases. Do not catch and swallow exceptions silently; let Spring handle unexpected errors. If you need richer error responses, consider introducing a `@RestControllerAdvice` class in the `web` package, but this is not currently part of the codebase.

---

## Logging

Logging uses **SLF4J with Logback** (`logback-spring.xml` for configuration). Each class declares a private static logger:

```java
private static final Logger log = LoggerFactory.getLogger(OwnerResource.class);
```

Current logging is **basic info-level** logging of operations (e.g., saving an owner, fetching a pet). There are no structured JSON logs, correlation IDs, or MDC context propagation in the existing code. When adding log statements, use `log.info()` for successful operations and `log.error()` for failures. Include relevant entity IDs in log messages for traceability.

---

## Authentication

There is **no authentication or authorization** implemented within this service. The service uses `@EnableDiscoveryClient` for Spring Cloud service discovery, indicating it operates within a microservice architecture where authentication is expected to be handled externally (e.g., by an API gateway or OAuth2 resource server). Do not add security dependencies or filters to this service without coordinating with the broader system architecture.

---

## Testing Approach

Tests use **`@WebMvcTest`** for slice testing of the web layer with **`MockMvc`** for HTTP request simulation. Repositories are mocked using **`@MockitoBean`**. The test profile:

- Disables Spring Cloud Config (`spring.cloud.config.enabled=false`)
- Uses an **in-memory HSQLDB** database
- Focuses on controller behavior: request validation, response status codes, JSON serialization

```java
@WebMvcTest(OwnerResource.class)
class OwnerResourceTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    OwnerRepository ownerRepository;

    @Test
    void shouldGetOwner() throws Exception {
        given(ownerRepository.findById(1)).willReturn(Optional.of(owner));
        mockMvc.perform(get("/owners/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.firstName").value("George"));
    }
}
```

When writing new tests, follow this pattern. Do not use `@SpringBootTest` for controller tests — use `@WebMvcTest` to keep tests fast and focused.

---

## Notable Patterns

### Spring Data Repository Pattern

Repository interfaces extend `JpaRepository` and use Spring Data query method naming conventions or `@Query` annotations. No implementation classes are needed.

```java
public interface OwnerRepository extends JpaRepository<Owner, Integer> {
    @Query("SELECT DISTINCT owner FROM Owner owner LEFT JOIN FETCH owner.pets")
    List<Owner> findAll();
}
```

### DTO / Request-Response Pattern

HTTP request and response bodies use **Java records** with Jakarta Validation annotations. Records are immutable and concise.

```java
public record OwnerRequest(
    @NotBlank String firstName,
    @NotBlank String lastName,
    @NotBlank String address,
    @NotBlank String city,
    @NotBlank @Digits(fraction = 0, integer = 10) String telephone
) {}
```

```java
public record PetDetails(long id, String name, String owner, ...) {}
```

### Entity Mapper Pattern

A generic `Mapper<S, T>` interface defines the contract for DTO-to-entity conversion. Concrete mappers implement this interface manually.

```java
public interface Mapper<S, T> {
    T map(S source);
}

@Component
public class OwnerEntityMapper implements Mapper<OwnerRequest, Owner> {
    @Override
    public Owner map(OwnerRequest request) {
        Owner owner = new Owner();
        owner.setFirstName(request.firstName());
        owner.setLastName(request.lastName());
        // ...
        return owner;
    }
}
```

> **Note:** A code comment suggests MapStruct should replace manual mapping. If you introduce MapStruct, follow the existing `Mapper<S, T>` interface contract.

### Metrics via Micrometer

Every resource class must have a class-level `@Timed` annotation for automatic metrics collection:

```java
@RequestMapping("/owners")
@RestController
@Timed("petclinic.owner")
class OwnerResource {
    // ...
}
```

The `TimedAspect` bean is registered in the configuration layer to enable this.

### JPA Entity Relationships

Bidirectional `@OneToMany` / `@ManyToOne` relationships use cascade operations. The owning side (e.g., `Pet.owner`) uses `@JsonIgnore` to prevent infinite serialization loops. Entity synchronization is done via helper methods.

```java
// Owner entity
@OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER, mappedBy = "owner")
private Set<Pet> pets = new HashSet<>();

public void addPet(Pet pet) {
    pets.add(pet);
    pet.setOwner(this);
}
```

```java
// Pet entity
@ManyToOne
@JoinColumn(name = "owner_id")
@JsonIgnore
private Owner owner;
```

---

## Anti-Patterns to Avoid

- **Do not introduce a service layer** unless explicitly required — the current pattern calls repositories directly from resource handlers.
- **Do not return JPA entities directly** from new endpoints without considering the tight coupling between domain and API; prefer DTOs (Java records) for responses where possible. (Note: existing code does this in some places — follow the DTO pattern for new code.)
- **Do not add business logic beyond validation** into resource handlers; if complex business rules emerge, discuss introducing a service layer first.
- **Do not create `findAll` endpoints without pagination** — the current `findAll` returns all records with no pagination or filtering, which does not scale.
- **Do not rely on bidirectional entity synchronization** without using the helper method (e.g., always use `owner.addPet(pet)` instead of `pet.setOwner(owner)` alone).
- **Do not implement manual DTO mapping** for new mappers without considering MapStruct (existing code has a comment acknowledging this tech debt).
- **Do not add logging without entity IDs** — always include identifiers for traceability.
- **Do not add inline exception handling** that swallows errors; let `ResourceNotFoundException` propagate for 404s and Spring's default handler for 500s.
- **Do not skip the `@Timed` annotation** on new resource classes — all controllers must be instrumented.
- **Do not add explicit `@Transactional` annotations** unless you have a specific multi-step write operation; the current codebase relies on Spring's implicit transaction handling via repository methods.

---

## See Also

- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Spring Data JPA Reference Documentation](https://docs.spring.io/spring-data/jpa/reference/jpa.html)
- [Micrometer @Timed Annotation](https://micrometer.io/docs/concepts#_the_timed_annotation)
- [Spring Boot Testing — @WebMvcTest](https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html#testing.spring-boot-applications.spring-mvc-tests)
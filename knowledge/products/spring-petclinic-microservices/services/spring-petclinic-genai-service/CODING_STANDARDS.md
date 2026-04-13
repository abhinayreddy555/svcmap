<!-- generated: 2026-04-13T04:23:29.599Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Coding Standards — spring-petclinic-genai-service

## TL;DR for Agents

- **Architecture**: Spring Boot microservice using component-based architecture with Spring AI for LLM integration, tool-based function calling (`@Tool`), and vector store for RAG.
- **Key Rule**: Layer discipline — Controllers call Services/Components, Services call DTOs and external APIs. DTOs (Java records) are leaf nodes with no outbound dependencies.
- **Most Important Convention for Code Gen**: Use `camelCase` for methods, `PascalCase` for classes/files, Java `record` types for DTOs, `@Tool` annotation for LLM-callable functions, and SLF4J for all logging.
- **Service Communication**: Uses Spring Cloud `DiscoveryClient` for dynamic service location; prefer `WebClient` (reactive) for inter-service HTTP calls — do not hardcode service hostnames.
- **Error Handling**: Catch specific exceptions, log at `error` level with context, and avoid returning `null` — use `Optional` or propagate errors instead.

## Architecture Pattern

Spring Boot Microservice with Component-based Architecture, integrating Spring AI for LLM chat capabilities, tool-based function calling, and vector store (RAG) for veterinarian data retrieval.

```
┌─────────────────────────────────────────────────────────────┐
│                    GenAI Service                            │
│                                                             │
│  ┌──────────────────┐    ┌─────────────────────────────┐   │
│  │  REST Controllers │───▶│  Services / Components      │   │
│  │  (HTTP endpoints) │    │  (PetclinicChatClient,      │   │
│  └──────────────────┘    │   AIDataProvider,            │   │
│                          │   PetclinicTools)            │   │
│                          └──────┬──────┬──────┬────────┘   │
│                                 │      │      │            │
│                    ┌────────────┘      │      └─────────┐  │
│                    ▼                   ▼                 ▼  │
│             ┌────────────┐   ┌──────────────┐  ┌────────┐  │
│             │ Vector     │   │ External APIs │  │  DTOs  │  │
│             │ Store      │   │ (vets-svc,   │  │(records)│  │
│             │ (Spring AI)│   │  customers-  │  └────────┘  │
│             └────────────┘   │  svc via     │              │
│                              │  Discovery)  │              │
│                              └──────────────┘              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Configuration (AIBeanConfiguration)                  │  │
│  │  ChatClient, VectorStore, Embedding Model beans       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
   ┌───────────┐               ┌────────────────┐
   │  LLM API  │               │ Peer Services  │
   │ (OpenAI / │               │ (vets-service, │
   │  Ollama)  │               │  customers-    │
   └───────────┘               │  service)      │
                               └────────────────┘
```

## Layer Structure

| Layer | Directory | Responsibility | Can Call |
|---|---|---|---|
| Controllers / REST Endpoints | `src/main/java/org/springframework/samples/petclinic/genai/` | HTTP request handling and response formatting | Services, Components |
| Services / Components | `src/main/java/org/springframework/samples/petclinic/genai/` | Business logic, data transformation, external service integration, LLM tool functions | DTOs, External APIs, Vector Store |
| DTOs | `src/main/java/org/springframework/samples/petclinic/genai/dto/` | Immutable data transfer objects for serialization/deserialization | *(none — leaf layer)* |
| Configuration | `src/main/java/org/springframework/samples/petclinic/genai/` | Spring bean configuration and dependency injection setup | Spring Framework |

## Naming Conventions

| Category | Convention | Example |
|---|---|---|
| Files | `PascalCase.java` | `PetclinicChatClient.java`, `AIDataProvider.java` |
| Classes | `PascalCase` | `PetclinicTools`, `VectorStoreController` |
| Functions / Methods | `camelCase` | `loadVetDataToVectorStoreOnStartup()`, `getCustomerServiceUri()` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT` |
| Database Columns | N/A | This service does not directly manage a database schema |

## Error Handling

This service uses try-catch blocks with SLF4J logging at the `error` level. When catching exceptions, log the exception with sufficient context (method name, input parameters, service being called) before deciding on a fallback. Specific exception types (e.g., `JacksonException`) should be caught rather than generic `Exception` wherever possible. **Do not return `null`** from methods on failure — prefer returning `Optional`, an empty collection with a logged warning, or propagating the exception to the caller. When returning error messages to the chat user, keep them generic and user-friendly (e.g., `"I encountered an error processing your request"`) while logging the full stack trace internally. All external service calls (WebClient, RestClient) should anticipate and handle connection failures, timeouts, and unexpected response codes.

## Logging

Logging uses **SLF4J with Logback**. Each class declares its own logger instance:

```java
private static final Logger log = LoggerFactory.getLogger(MyClass.class);
```

Use `log.info()` for significant operational events (startup, data loading, LLM invocations) and `log.error()` for exception handling with the full exception object as the last argument. There is no structured JSON logging configured in this service. When adding new log statements, include enough context (e.g., service name, entity ID, operation) to support debugging in a distributed microservices environment.

## Authentication

No authentication or authorization is implemented within this service. Inter-service communication uses `WebClient` and `RestClient` over HTTP without tokens or credentials. Service-to-service trust is implicit within the cluster. If authentication is added in the future, it should be implemented at the gateway level or via Spring Security filters — not inline in business logic.

## Testing Approach

No test files are currently present in the codebase for this service. When adding tests:

- Use **JUnit 5** with **Spring Boot Test** (`@SpringBootTest`) for integration tests.
- Use `@WebMvcTest` for controller-layer unit tests.
- Mock external dependencies (`WebClient`, `DiscoveryClient`, `ChatClient`, `VectorStore`) using Mockito or `@MockBean`.
- Test `@Tool`-annotated methods in `PetclinicTools` as unit tests, verifying correct data transformation and external call orchestration.
- Validate DTO serialization/deserialization with Jackson `ObjectMapper` in dedicated tests.

## Notable Patterns

### Spring AI Integration

The service uses the **Spring AI** framework to integrate with large language models. `ChatClient` is configured as a Spring bean in `AIBeanConfiguration.java` and injected into `PetclinicChatClient.java` for conversational interactions. The `VectorStore` and embedding models are used for retrieval-augmented generation (RAG) over veterinarian data.

```java
// AIBeanConfiguration.java
@Bean
ChatClient chatClient(ChatClient.Builder builder) {
    return builder.build();
}
```

### Tool-based LLM Function Calling

Methods annotated with `@Tool` in `PetclinicTools.java` are exposed to the LLM, allowing it to invoke backend functions (e.g., fetching owners, adding pets) as part of a conversation. Each tool method should have a clear description and well-typed parameters.

```java
@Tool(description = "List all pet owners in the system")
public List<OwnerDetails> listOwners() {
    // fetch from customers-service
}
```

### Event-driven Initialization

The `VectorStoreController` uses `@EventListener` on `ApplicationStartedEvent` to load veterinarian data into the vector store at startup. This ensures the RAG knowledge base is populated before the service begins handling requests.

```java
@EventListener(ApplicationStartedEvent.class)
public void loadVetDataToVectorStoreOnStartup() {
    // fetch vet data and load into VectorStore
}
```

### Service Discovery

Dynamic service location is performed via Spring Cloud `DiscoveryClient`. Service URIs are resolved at runtime rather than hardcoded.

```java
// AIDataProvider.java
private URI getCustomerServiceUri() {
    ServiceInstance instance = discoveryClient.getInstances("customers-service").get(0);
    return instance.getUri();
}
```

### Reactive WebClient

`WebClient` is used for non-blocking HTTP calls to peer microservices (vets-service, customers-service). It is the preferred HTTP client for inter-service communication in this codebase.

```java
webClient.get()
    .uri(serviceUri + "/vets")
    .retrieve()
    .bodyToFlux(Vet.class)
    .collectList()
    .block();
```

### Record-based DTOs

All data transfer objects are implemented as Java `record` types for immutability and conciseness. Records live in the `dto/` package.

```java
// dto/Vet.java
public record Vet(int id, String firstName, String lastName, List<String> specialties) {}
```

## Anti-Patterns to Avoid

- **Returning `null` on exception** — `convertListToJsonResource()` returns `null` when serialization fails. Use `Optional` or throw a meaningful exception instead.
- **Swallowing exceptions with empty fallback** — Catching `JacksonException` and returning an empty `List` hides data issues. Log at `error` level and consider propagating.
- **Hardcoded service hostnames** — `VectorStoreController` uses `"http://vets-service/"` directly instead of resolving via `DiscoveryClient`. Always use service discovery.
- **No null-safety on `DiscoveryClient` results** — Calling `.get(0)` on `discoveryClient.getInstances()` without checking for empty results will throw `IndexOutOfBoundsException`. Validate the list first.
- **No null check on `WebClient.block()` return value** — `block()` can return `null`; guard against it.
- **Generic `Exception` catch with insufficient logging context** — `PetclinicChatClient` catches `Exception` and returns a user-facing message without logging the full context. Always log method, parameters, and stack trace.
- **Temporary file operations without cleanup guarantee** — Use try-with-resources or `finally` blocks to ensure temp files are deleted.
- **Mixing `RestClient` and `WebClient`** — The codebase uses both for similar inter-service calls. Standardize on `WebClient` for consistency unless a synchronous call is explicitly required.
- **No circuit breaker or retry logic** — External service calls have no resilience patterns. Use Spring Cloud Circuit Breaker or Resilience4j for production readiness.
- **Synchronous vector store loading on startup** — `loadVetDataToVectorStoreOnStartup()` blocks application initialization. Consider `@Async` or a readiness probe that waits for loading to complete.

## See Also

- [Spring AI Reference Documentation](https://docs.spring.io/spring-ai/reference/)
- [Spring Cloud Discovery Client](https://docs.spring.io/spring-cloud-commons/reference/spring-cloud-commons/discovery.html)
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Spring Boot Microservices Architecture Guide](https://spring.io/microservices)
<!-- generated: 2026-04-13T04:12:44.821Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Coding Standards — spring-petclinic-api-gateway

## TL;DR for Agents

- **Architecture**: API Gateway pattern (Spring Cloud) using reactive programming (WebFlux + Project Reactor) to aggregate calls to `customers-service`, `visits-service`, and `vet-service`.
- **Key rule**: Respect the strict layer hierarchy — Controllers → Service Clients → DTOs. Controllers must never call WebClient directly; always go through a dedicated Service Client class.
- **Code generation convention**: Use Java Records for DTOs, return `Mono<T>` / `Flux<T>` from all service methods and controllers, and wire Resilience4j circuit breakers around every remote call.
- **Testing**: Use `@WebFluxTest` with `@MockitoBean` for controller unit tests; use `MockWebServer` for integration tests simulating downstream services.
- **Frontend**: AngularJS module pattern with UI Router — controllers live in `scripts/` and call API Gateway endpoints only.

## Architecture Pattern

The `spring-petclinic-api-gateway` implements the **API Gateway Pattern** as the single entry point for all client requests in the Spring PetClinic microservices ecosystem. It aggregates data from multiple downstream microservices using non-blocking reactive calls and provides fault tolerance via circuit breakers.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (AngularJS)                      │
│                  src/main/resources/static/scripts/              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (REST)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway (Spring WebFlux)                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Controllers (boundary/web/)                             │   │
│  │  - ApiGatewayController                                  │   │
│  │  - FallbackController                                    │   │
│  └────────────┬─────────────────────────────────────────────┘   │
│               │ calls                                           │
│  ┌────────────▼─────────────────────────────────────────────┐   │
│  │  Service Clients (application/)                          │   │
│  │  - CustomersServiceClient                                │   │
│  │  - VisitsServiceClient                                   │   │
│  │  Uses: WebClient + ReactiveCircuitBreakerFactory         │   │
│  └────────────┬─────────────────────────────────────────────┘   │
│               │ uses                                            │
│  ┌────────────▼─────────────────────────────────────────────┐   │
│  │  DTOs (dto/)                                             │   │
│  │  - OwnerDetails, PetDetails, VisitDetails, Visits        │   │
│  │  (Java Records — immutable)                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────┬──────────────────┬──────────────────┬────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │  customers-  │  │   visits-    │  │    vet-      │
   │   service    │  │   service    │  │   service    │
   └──────────────┘  └──────────────┘  └──────────────┘
```

Service discovery is handled by **Spring Cloud Discovery Client**, enabling load-balanced `WebClient` calls to downstream services by logical service name rather than hardcoded URLs.

## Layer Structure

| Layer | Directory | Responsibility | Can Call |
|---|---|---|---|
| **Controllers (Web Boundary)** | `src/main/java/org/springframework/samples/petclinic/api/boundary/web/` | HTTP request handling, routing, response formatting, circuit breaker orchestration | Service Clients, `ReactiveCircuitBreakerFactory` |
| **Service Clients (Application)** | `src/main/java/org/springframework/samples/petclinic/api/application/` | Remote service communication via `WebClient`, orchestration of external microservice calls | DTOs, `WebClient` |
| **DTOs (Data Transfer Objects)** | `src/main/java/org/springframework/samples/petclinic/api/dto/` | Data serialization/deserialization, API contracts between gateway and downstream services | Nothing (leaf layer) |
| **Frontend (AngularJS)** | `src/main/resources/static/scripts/` | UI rendering, user interaction, HTTP client calls to gateway | API Gateway endpoints only |

> **Strict rule**: Dependencies flow downward only. A Controller must never instantiate a `WebClient` directly — it delegates to a Service Client. A Service Client must never return raw HTTP responses — it deserializes into DTOs. DTOs must have zero dependencies on any other layer.

## Naming Conventions

### Files

| Category | Convention | Example |
|---|---|---|
| Java classes | PascalCase with `.java` extension | `ApiGatewayController.java`, `CustomersServiceClient.java` |
| JavaScript files | camelCase with `.js` extension | `ownerDetails.js`, `vetList.js` |
| Configuration files | Spring Boot defaults | `application.yml` |

### Classes

| Category | Convention | Example |
|---|---|---|
| Controllers | `{Domain}Controller` | `ApiGatewayController`, `FallbackController` |
| Service Clients | `{ServiceName}ServiceClient` | `CustomersServiceClient`, `VisitsServiceClient` |
| DTOs (Records) | `{Entity}Details` or domain noun | `OwnerDetails`, `PetDetails`, `VisitDetails`, `Visits` |
| Builders | `{DTO}Builder` (inner static class) | `OwnerDetails.OwnerDetailsBuilder`, `PetDetails.PetDetailsBuilder` |

### Functions / Methods

| Category | Convention | Example |
|---|---|---|
| Controller endpoints | `get{Resource}` / `verb{Resource}` | `getOwnerDetails` |
| Service Client methods | `get{Resource}ForX` | `getVisitsForPets` |
| AngularJS controllers | camelCase | `ownerDetails`, `vetList` |

### Constants

| Category | Convention | Example |
|---|---|---|
| Java constants | `UPPER_SNAKE_CASE` | (not heavily used in this service) |

### Database Columns

Not applicable — the API Gateway does not own a database. All persistence is delegated to downstream microservices.

## Error Handling

The service uses a **fallback controller pattern** powered by **Resilience4j Circuit Breaker** via `ReactiveCircuitBreakerFactory`. When a downstream microservice call fails or times out, the circuit breaker trips and routes the request to `FallbackController`, which returns an **HTTP 503 Service Unavailable** with a generic error message. This provides graceful degradation — the gateway remains responsive even when backend services are down. However, the current fallback does not include context about *which* service failed, and there is no centralized error-handling middleware. Controllers do not perform input validation on route parameters (e.g., `ownerId`, `petId`) before forwarding to service clients. On the frontend, AngularJS controllers lack error handling on HTTP promises, meaning failures are silently swallowed without user feedback.

## Logging

Logging uses **Logback** with Spring Boot's default configuration. Log levels can be managed at runtime via **JMX** through the Spring Admin Server. There is no structured JSON logging configured, and no request correlation IDs or distributed tracing headers (e.g., Sleuth/Zipkin trace IDs) are visible in the current codebase. When adding new log statements, use SLF4J's `LoggerFactory` and prefer parameterized messages (`log.info("Fetching owner {}", ownerId)`) over string concatenation.

## Authentication

There is **no explicit authentication or authorization** implemented in the API Gateway. The gateway acts as a public entry point without auth middleware, token validation, or security filters. If authentication is required, it should be added as a Spring Security `WebFilter` in the gateway's reactive filter chain, ideally validating tokens before requests are routed to downstream services.

## Testing Approach

| Test Type | Annotation / Tool | Purpose |
|---|---|---|
| Controller unit tests | `@WebFluxTest` + `@MockitoBean` | Test controller logic in isolation; mock service clients and circuit breaker factory |
| Service client integration tests | `MockWebServer` (from `mockwebserver3`) | Simulate downstream microservice HTTP responses; verify WebClient request construction and response deserialization |
| Mocking | Mockito (`@MockitoBean`) | Inject mock dependencies into Spring context for focused testing |

Tests should follow the existing pattern:

- **Controller tests**: Use `WebTestClient` (provided by `@WebFluxTest`) to issue requests and assert on response status, headers, and body. Mock all `*ServiceClient` beans and `ReactiveCircuitBreakerFactory`.
- **Service client tests**: Start a `MockWebServer`, enqueue canned responses, point the client's `WebClient` at the mock server, and verify the deserialized DTO output.

## Notable Patterns

### API Gateway Pattern

The gateway aggregates calls to multiple downstream microservices into a single client-facing endpoint. For example, `getOwnerDetails` fetches owner data from `customers-service` and then enriches it with visit data from `visits-service`, returning a unified response.

```
File: src/main/java/org/springframework/samples/petclinic/api/boundary/web/ApiGatewayController.java
```

### Circuit Breaker Pattern

Every remote call is wrapped in a Resilience4j circuit breaker via `ReactiveCircuitBreakerFactory`. When a downstream service is unavailable, the circuit opens and the `FallbackController` returns HTTP 503 instead of propagating the failure.

```java
// Pattern: wrap reactive call with circuit breaker
circuitBreakerFactory.create("ownerDetails")
    .run(serviceClient.getOwner(ownerId), throwable -> fallback());
```

### Service Client Pattern

Each downstream microservice has a dedicated client class that encapsulates `WebClient` calls and response mapping. This keeps HTTP communication concerns out of controllers.

```
CustomersServiceClient  → customers-service
VisitsServiceClient     → visits-service
```

### Builder Pattern

DTOs use inner static `Builder` classes for construction, enabling readable and flexible object creation — especially useful when aggregating data from multiple service responses.

```java
OwnerDetails owner = new OwnerDetails.OwnerDetailsBuilder()
    .id(1)
    .firstName("George")
    .lastName("Franklin")
    .build();
```

### Java Records

DTOs are implemented as Java 14+ records, providing immutability, automatic `equals()`/`hashCode()`/`toString()`, and compact syntax.

```java
// File: src/main/java/org/springframework/samples/petclinic/api/dto/VisitDetails.java
public record VisitDetails(Integer id, Integer petId, LocalDate date, String description) {}
```

### Reactive Programming

All service methods and controller endpoints return Project Reactor types (`Mono<T>`, `Flux<T>`) for non-blocking asynchronous execution. Never block the reactive chain with `.block()` in production code.

```java
public Mono<OwnerDetails> getOwnerDetails(@PathVariable int ownerId) {
    // Returns Mono — non-blocking end-to-end
}
```

### AngularJS Module Pattern

The frontend is organized into AngularJS modules with dedicated controllers, components, and `$stateProvider` routing. Each feature (e.g., owner details, vet list) is a self-contained module.

```javascript
// File: src/main/resources/static/scripts/owner-details/owner-details.js
angular.module('ownerDetails', ['ui.router'])
    .config(['$stateProvider', function ($stateProvider) {
        $stateProvider.state('ownerDetails', { /* ... */ });
    }]);
```

## Anti-Patterns to Avoid

- **No error handling in AngularJS controllers** — HTTP call failures are silently swallowed. Always add `.catch()` or error callbacks to `$http` promises.
- **Hardcoded service URLs** — `VisitsServiceClient` uses a `hostname` field instead of pulling from configuration/discovery. Always resolve service addresses through Spring Cloud Discovery Client.
- **No request/response validation in controllers** — Route parameters like `ownerId` and `petId` are passed directly to service clients without validation. Add `@Validated` or manual checks.
- **AngularJS controllers making direct HTTP calls** — Controllers should delegate to an AngularJS service layer rather than calling `$http` directly.
- **No centralized error-handling middleware** — The gateway lacks a global `@ControllerAdvice` or `WebExceptionHandler` for consistent error responses.
- **Generic fallback messages** — `FallbackController` returns a generic 503 without indicating which downstream service failed. Include service context in fallback responses.
- **No request correlation IDs or distributed tracing** — Makes debugging cross-service issues extremely difficult. Consider adding Spring Cloud Sleuth or Micrometer Tracing.
- **Package-private setter for testing** — `VisitsServiceClient.setHostname()` breaks encapsulation. Use constructor injection or `@TestConfiguration` instead.
- **No input sanitization on `localStorage` usage** — `chat.js` reads/writes `localStorage` without encryption or validation, risking XSS or data tampering.
- **Raw JSON string in Fetch API** — `chat.js` sends raw JSON strings instead of using proper object serialization via `JSON.stringify()` on structured objects.

## See Also

- [Spring Cloud Circuit Breaker Documentation](https://spring.io/projects/spring-cloud-circuitbreaker)
- [Spring WebFlux Reference](https://docs.spring.io/spring-framework/reference/web/webflux.html)
- [Resilience4j Documentation](https://resilience4j.readme.io/docs)
- [Spring PetClinic Microservices Repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
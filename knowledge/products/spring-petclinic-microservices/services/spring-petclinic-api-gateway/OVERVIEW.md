<!-- generated: 2026-04-13T04:09:04.494Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# spring-petclinic-api-gateway

> Single entry point API Gateway and AngularJS web UI for the Spring PetClinic microservices architecture.

## TL;DR for Agents

- **API Gateway** built on Spring Cloud Gateway (WebFlux) that routes all client traffic to `customers-service`, `visits-service`, and a GenAI chat endpoint — it owns **no database** and persists **no data**.
- **Aggregation layer**: the one place where owner details and visit data are merged (see `ApiGatewayController`) — bugs involving combined owner+visit responses start here.
- **Outbound REST dependencies**: `customers-service` (`GET /owners/{ownerId}`), `visits-service` (`GET /pets/visits?petId={petId}`), GenAI chat (`POST /api/genai/chatclient`). All use reactive `WebClient` with Resilience4J circuit breakers.
- **Frontend SPA**: serves an AngularJS single-page app from `src/main/resources/static/` — UI routing bugs live in `scripts/app.js`.
- **Entry point for debugging**: start at `ApiGatewayApplication.java` for routing/resilience config, or `ApiGatewayController.java` for the aggregation endpoint.

## Service Identity

| Attribute | Value |
|---|---|
| **Type** | API Gateway |
| **Language** | Java |
| **Framework** | Spring Boot |
| **Runtime** | Java (Spring Cloud Gateway WebFlux) |
| **Repo** | `spring-petclinic/spring-petclinic-microservices` |
| **Primary Database** | None — stateless gateway |
| **Deployed on** | Typically containerized (Docker); registers with Spring Cloud Discovery |

## Responsibilities

- Routes all inbound HTTP requests to the appropriate backend microservice
- Aggregates data from `customers-service` and `visits-service` into a unified owner-details response (owner + pets + visits)
- Applies circuit-breaker resilience (Resilience4J) to all outbound service calls
- Provides client-side load balancing via Spring Cloud LoadBalancer
- Serves the AngularJS single-page application (static assets, HTML templates)
- Proxies chat requests to the GenAI service

### This service does NOT handle:

- **Customer/owner data persistence** — delegated to `customers-service`
- **Visit data persistence** — delegated to `visits-service`
- **Veterinarian data management** — delegated to the vets backend service
- **Business logic for pet clinic operations** — all domain logic lives in downstream services

## Entry Points

| File | Description |
|---|---|
| `src/main/java/org/springframework/samples/petclinic/api/ApiGatewayApplication.java` | Spring Boot main class; configures gateway routing, circuit breaker resilience, load balancing, and static resource serving |
| `src/main/resources/static/scripts/app.js` | AngularJS application bootstrap; configures client-side routing, HTTP interceptors, and module dependencies for the SPA |

## Key Abstractions

| Abstraction | Description |
|---|---|
| **`ApiGatewayApplication`** | Boot entry point and `@Bean` configuration for route definitions (`RouterFunction`), circuit breaker factory, and load-balanced `WebClient.Builder`. |
| **`CustomersServiceClient`** | Reactive HTTP client wrapping calls to `customers-service`. Fetches owner details by ID via `WebClient`. |
| **`VisitsServiceClient`** | Reactive HTTP client wrapping calls to `visits-service`. Fetches visits for a set of pet IDs via `WebClient`. |
| **`ReactiveResilience4JCircuitBreakerFactory`** | Configures circuit breaker defaults (timeout, fallback) applied to outbound service calls to prevent cascading failures. |
| **`WebClient.Builder`** | Load-balanced, discovery-aware HTTP client builder injected into service clients. Resolves service names (e.g., `customers-service`) via service registry. |
| **`OwnerDetails`** | DTO that aggregates owner info with their pets and associated visits — the primary response model for the aggregation endpoint. |
| **`Visits`** | DTO representing a collection of visit records returned from `visits-service`, mapped onto pet entities during aggregation. |

## What an Agent Needs to Know to Work on This Service

### Where to start

1. **Routing configuration** lives in `ApiGatewayApplication.java` — look for `RouterFunction<ServerResponse>` beans and Spring Cloud Gateway route definitions in `application.yml`.
2. **The aggregation endpoint** (typically `GET /api/gateway/owners/{ownerId}`) is in `ApiGatewayController.java`. This is the only place that calls multiple downstream services and merges results.
3. **Frontend changes** go in `src/main/resources/static/` — AngularJS controllers are in `scripts/`, HTML templates in the corresponding feature directories.

### Key patterns

- **Reactive pipeline**: all backend calls use Project Reactor (`Mono`/`Flux`). Blocking calls will break the Netty event loop — never use `.block()` in production code paths.
- **Circuit breakers**: each outbound call is wrapped with Resilience4J. Default timeout is **10 000 ms**. Fallback behavior should return a graceful degradation (e.g., empty visits list).
- **Service discovery**: downstream services are referenced by logical name (e.g., `http://customers-service/`), resolved at runtime via Eureka or equivalent registry.
- **No database**: if a test or feature requires persisted state, it belongs in a downstream service, not here.

### Testing

- Unit tests use `@SpringBootTest` with test profiles.
- HTTP client tests use `MockWebServer` to simulate downstream service responses.
- Run tests: `./mvnw test -pl spring-petclinic-api-gateway`

## Related Documents

- [API.md](API.md) — API endpoint reference and request/response contracts
- [SCENARIOS.md](SCENARIOS.md) — Key user-facing scenarios and data flow walkthroughs
- [DEPENDENCIES.md](DEPENDENCIES.md) — Full dependency graph and outbound service details
- [TABLE_MAP.md](TABLE_MAP.md) — Database table ownership (N/A for this service)
- [RUNBOOK.md](RUNBOOK.md) — Operational playbook for incidents and common failure modes

## See Also

- [Spring Cloud Gateway Reference](https://docs.spring.io/spring-cloud-gateway/docs/current/reference/html/)
- [Resilience4J Circuit Breaker Documentation](https://resilience4j.readme.io/docs/circuitbreaker)
- [spring-petclinic-microservices root README](../../README.md)
- [customers-service OVERVIEW](../spring-petclinic-customers-service/OVERVIEW.md)
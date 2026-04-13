<!-- generated: 2026-04-13T04:10:26.806Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Dependencies — spring-petclinic-api-gateway

## TL;DR for Agents

- **API Gateway** with **3 outbound REST calls** to `customers-service`, `visits-service`, and a GenAI chat endpoint — no direct database dependencies.
- Routes requests via **Spring Cloud Gateway (WebFlux)** with service discovery through **Eureka**.
- Fault tolerance provided by **Resilience4j circuit breakers** (reactive); outbound calls to `customers-service` and `visits-service` have a **10s timeout** with **no configured retries**.
- Observability stack includes **Micrometer/Prometheus** metrics and **OpenTelemetry/Zipkin/Brave** distributed tracing.
- If `customers-service` or `visits-service` is down, the gateway will open circuit breakers — check [SCENARIOS.md](SCENARIOS.md) for degradation behavior.

## Outbound Calls

| Target | Type | Endpoint / Topic | Purpose | Timeout (ms) | Retries | External? |
|---|---|---|---|---|---|---|
| `customers-service` | REST | `GET /owners/{ownerId}` | Fetch owner details by ID | 10000 | None | No |
| `visits-service` | REST | `GET /pets/visits?petId={petId}` | Fetch visits for pets | 10000 | None | No |
| `api/genai/chatclient` | REST | `POST /api/genai/chatclient` | Send chat messages to GenAI service | Not configured | None | No |

> **Note:** The `customers-service` and `visits-service` calls are composed in the gateway's `ApiGatewayController` to aggregate owner and visit data before returning to the client. The GenAI endpoint is routed separately and has no explicit timeout or circuit breaker configuration in the extracted data.

## Databases & Storage

| Name | Type | Purpose | Shared / Private |
|---|---|---|---|
| — | — | — | — |

This service has **no direct database dependencies**. All persistent data is accessed indirectly through downstream microservices (`customers-service`, `visits-service`).

## Third-Party Integrations

| Name | Category | SDK / Package | Purpose |
|---|---|---|---|
| Spring Cloud Gateway | API Gateway | `org.springframework.cloud:spring-cloud-starter-gateway-server-webflux` | API gateway and request routing (reactive/WebFlux) |
| Spring Cloud Eureka | Service Discovery | `org.springframework.cloud:spring-cloud-starter-netflix-eureka-client` | Service discovery and registration |
| Resilience4j | Circuit Breaker | `io.github.resilience4j:resilience4j-circuitbreaker` | Circuit breaker pattern implementation for fault tolerance |
| Spring Cloud Circuit Breaker | Resilience | `org.springframework.cloud:spring-cloud-starter-circuitbreaker-reactor-resilience4j` | Reactive circuit breaker for handling service failures |
| Micrometer Prometheus | Monitoring | `io.micrometer:micrometer-registry-prometheus` | Metrics collection and Prometheus export |
| OpenTelemetry Zipkin | Tracing | `io.opentelemetry:opentelemetry-exporter-zipkin` | Distributed tracing export to Zipkin |
| Brave | Tracing | `io.micrometer:micrometer-tracing-bridge-brave` | Distributed tracing instrumentation bridge |

## Inbound Calls

| Source | Type | Endpoint / Pattern | Purpose |
|---|---|---|---|
| External clients (browser / UI) | HTTP | `/*` | All client-facing traffic enters through this gateway |

> **Note:** This section is populated from the product-level service graph and may be incomplete. The API gateway is the **edge service** — it is the primary ingress point for the `spring-petclinic-microservices` application. Any frontend (e.g., `spring-petclinic-angular`) or external consumer communicates with backend services exclusively through this gateway.

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Failure scenarios and degradation behavior when downstream services are unavailable
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Source repository and architecture overview
- [ARCHITECTURE.md](ARCHITECTURE.md) — Product-level service topology and routing configuration
- [Resilience4j Documentation](https://resilience4j.readme.io/docs) — Circuit breaker configuration reference
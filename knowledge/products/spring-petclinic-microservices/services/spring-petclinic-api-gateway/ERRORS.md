<!-- generated: 2026-04-13T04:11:44.365Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Error Catalogue — spring-petclinic-api-gateway

## TL;DR for Agents

- **6 total error codes** defined for the API gateway: `SERVICE_UNAVAILABLE`, `CHAT_UNAVAILABLE`, `HTTP_CLIENT_ERROR`, `VALIDATION_ERROR`, `CIRCUIT_BREAKER_OPEN`, `TIMEOUT`.
- **4 of 6 errors are retryable** (`SERVICE_UNAVAILABLE`, `CHAT_UNAVAILABLE`, `CIRCUIT_BREAKER_OPEN`, `TIMEOUT`) — all in the `upstream` category, caused by downstream service failures.
- **2 errors are not retryable** (`HTTP_CLIENT_ERROR`, `VALIDATION_ERROR`) — both in the `validation` category, requiring the caller to fix request parameters before resubmitting.
- **Most common errors** in production are `SERVICE_UNAVAILABLE` and `CIRCUIT_BREAKER_OPEN`, triggered when `customers-service` or `visits-service` is down or degraded.
- If you see a **503**, check downstream service health and Resilience4j circuit breaker state before escalating; if you see a **504**, check `TimeLimiterConfig` timeout thresholds.

## Global Error Handling

The API gateway employs a layered error-handling strategy spanning both the backend and the frontend. On the backend, **Resilience4j circuit breaker** is configured in `ApiGatewayApplication` with a default configuration and provides fallback handling for downstream service failures in `ApiGatewayController.getOwnerDetails()` via `ReactiveCircuitBreaker.run()` with a fallback function. When the circuit breaker is open or downstream calls fail, the gateway returns structured error responses rather than propagating raw exceptions. A dedicated `FallbackController` handles the `POST /fallback` endpoint, returning `503 SERVICE_UNAVAILABLE` when the GenAI chat service is unreachable. On the frontend, the Angular `HttpErrorHandlingInterceptor` (`httpErrorHandlingInterceptor.js`) intercepts all HTTP error responses and displays an alert containing the `error.error` message along with any field-level validation errors extracted from the `error.errors` array. This ensures that both transient upstream failures and client-side validation issues are surfaced consistently to callers and end users.

## Error Reference

| Code | HTTP Status | Category | Retryable | Description | When It Occurs | Recovery Hint |
|------|-------------|----------|-----------|-------------|----------------|---------------|
| `SERVICE_UNAVAILABLE` | `503` | upstream | ✅ Yes | Downstream service (`customers-service` or `visits-service`) is unavailable or circuit breaker is open | When `CustomersServiceClient.getOwner()` or `VisitsServiceClient.getVisitsForPets()` fails due to connection errors, timeouts, or circuit breaker activation | Retry after a few seconds; circuit breaker will eventually allow retries after cooldown period |
| `CHAT_UNAVAILABLE` | `503` | upstream | ✅ Yes | Chat service is currently unavailable | `POST /fallback` endpoint is invoked; also returned by `FallbackController` when GenAI service fails | Retry the chat request after a few seconds |
| `CIRCUIT_BREAKER_OPEN` | `503` | upstream | ✅ Yes | Circuit breaker is open due to repeated failures from downstream service | Resilience4j circuit breaker detects threshold of failures exceeded in `ApiGatewayController.getOwnerDetails()` | Wait for circuit breaker to transition to half-open state (default cooldown), then retry |
| `TIMEOUT` | `504` | upstream | ✅ Yes | Request to downstream service exceeded time limit | `CustomersServiceClient` or `VisitsServiceClient` call exceeds `TimeLimiterConfig` timeout threshold | Retry after a few seconds; consider increasing timeout if service is legitimately slow |
| `HTTP_CLIENT_ERROR` | `400` | validation | ❌ No | Client-side HTTP error from downstream service | Downstream service returns 4xx status code (e.g., malformed request, invalid parameters) | Fix the request parameters and retry |
| `VALIDATION_ERROR` | `400` | validation | ❌ No | Request validation failed with field-level errors | Angular `HttpErrorHandlingInterceptor` catches response with `error.errors` array containing field validation failures | Correct the invalid fields per error messages and resubmit |

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Common failure scenarios and troubleshooting playbooks for the API gateway
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Source code and architecture overview
- [Resilience4j Documentation](https://resilience4j.readme.io/docs/circuitbreaker) — Circuit breaker configuration and state machine reference
- [Spring Cloud Gateway Reference](https://docs.spring.io/spring-cloud-gateway/docs/current/reference/html/) — Gateway routing, filters, and fallback configuration
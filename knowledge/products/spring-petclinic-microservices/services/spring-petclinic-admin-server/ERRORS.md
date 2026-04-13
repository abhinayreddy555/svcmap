<!-- generated: 2026-04-13T04:09:33.828Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Error Catalogue — spring-petclinic-admin-server

## TL;DR for Agents

- **Zero custom error codes** are defined in this service — it relies entirely on Spring Boot's default error handling.
- The `spring-petclinic-admin-server` is a **Spring Boot Admin Server** (monitoring/admin UI) with no custom exception handlers, error middleware, or error code constants.
- Any errors encountered will be **standard Spring Boot / Spring Boot Admin error responses** (e.g., `404`, `500`), not application-specific codes.
- If you are investigating an incident involving a custom error code or domain-specific exception, **this document is not relevant** — check the downstream microservices (`customers-service`, `vets-service`, `visits-service`).
- All error behavior is delegated to Spring Boot's `BasicErrorController` and Spring Boot Admin's built-in handling; **no retryable error codes are explicitly defined**.

## Global Error Handling

The `spring-petclinic-admin-server` does not implement any custom error handling middleware, global exception handler (e.g., `@ControllerAdvice` or `@ExceptionHandler`), or error code constants. The application functions as a Spring Boot Admin Server — its primary role is to aggregate and display health/status information from registered microservice instances. Because of this narrow scope, all error handling is delegated to the default mechanisms provided by Spring Boot and the Spring Boot Admin library. When an error occurs (e.g., a monitored service is unreachable, or an invalid endpoint is requested), Spring Boot's built-in `BasicErrorController` produces a standard error response with conventional HTTP status codes (`400`, `404`, `500`, etc.) and a JSON body containing `timestamp`, `status`, `error`, and `path` fields. No custom error enrichment, error wrapping, or structured error codes are applied at the application level.

## Error Reference

| Code | HTTP Status | Category | Retryable | Description | When It Occurs | Recovery Hint |
|------|-------------|----------|-----------|-------------|----------------|---------------|
| _None defined_ | — | — | — | No custom error codes are defined in this service. | — | — |

> **Note:** Since this service defines no custom errors, the table below documents the **standard Spring Boot errors** you are most likely to encounter when interacting with or investigating this service:

| Code | HTTP Status | Category | Retryable | Description | When It Occurs | Recovery Hint |
|------|-------------|----------|-----------|-------------|----------------|---------------|
| `N/A` | `401 Unauthorized` | Auth | No | Authentication required or credentials invalid. | Accessing the Admin Server when Spring Security is enabled and no valid session/credentials are provided. | Verify credentials or authentication token configuration. |
| `N/A` | `404 Not Found` | Client | No | Requested resource or endpoint does not exist. | A request is made to an undefined endpoint on the admin server. | Verify the URL path; consult Spring Boot Admin documentation for valid endpoints. |
| `N/A` | `500 Internal Server Error` | Server | Yes | Unexpected server-side failure. | Unhandled exception during request processing (e.g., failure connecting to the discovery server). | Check application logs via `docker logs` or the logging output; verify that dependent services (e.g., `discovery-server`) are healthy. Retry after resolving the root cause. |
| `N/A` | `502 Bad Gateway` | Infrastructure | Yes | Upstream service returned an invalid response. | The admin server proxies a request to a registered service instance that is unhealthy or returning malformed responses. | Verify the health of the target microservice instance; check network connectivity. |
| `N/A` | `503 Service Unavailable` | Infrastructure | Yes | The admin server or a monitored service is not ready. | During startup before the application is fully initialized, or when the discovery server is unreachable. | Wait and retry; confirm `discovery-server` is running and reachable at the configured URL. |

## See Also

- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Spring Boot Admin Reference Documentation](https://docs.spring-boot-admin.com/)
- [Spring Boot Default Error Handling](https://docs.spring.io/spring-boot/docs/current/reference/html/web.html#web.servlet.spring-mvc.error-handling)
- [SCENARIOS.md](SCENARIOS.md)
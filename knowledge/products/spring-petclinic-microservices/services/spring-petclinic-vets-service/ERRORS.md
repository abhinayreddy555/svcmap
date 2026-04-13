<!-- generated: 2026-04-13T04:27:00.409Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Error Catalogue — spring-petclinic-vets-service

## TL;DR for Agents

- **Total documented error codes: 0** — No custom or application-specific error codes were extracted from the `spring-petclinic-vets-service` codebase.
- This service does **not define a global error handling middleware** (no `@ControllerAdvice`, custom `ErrorController`, or centralized exception handler was detected).
- Errors are likely handled by **Spring Boot's default error handling** mechanism, which returns standard HTTP error responses (e.g., `404`, `500`) with a JSON body containing `timestamp`, `status`, `error`, `message`, and `path`.
- **No retryable error codes are explicitly defined** by this service; retry decisions should be based on standard HTTP semantics (retry `503`, `429`; do not retry `4xx`).
- If you are investigating an incident involving this service, check **Spring Boot default error responses** and downstream dependency failures (e.g., database connectivity, service discovery).

## Global Error Handling

The `spring-petclinic-vets-service` does not implement a custom global error handling mechanism. There is no `@ControllerAdvice`, `@ExceptionHandler`, or custom `ErrorController` registered in the extracted source. As a result, all unhandled exceptions are processed by **Spring Boot's `BasicErrorController`**, which produces a default error response in the following format:

```json
{
  "timestamp": "2024-01-15T12:00:00.000+00:00",
  "status": 500,
  "error": "Internal Server Error",
  "message": "",
  "path": "/vets"
}
```

The default behavior maps standard Java and Spring exceptions to their corresponding HTTP status codes (e.g., `NoHandlerFoundException` → `404`, `HttpRequestMethodNotSupportedException` → `405`, unhandled `RuntimeException` → `500`). Error message exposure may be suppressed depending on the `server.error.include-message` configuration property (defaults to `never` in Spring Boot 2.3+).

## Error Reference

No application-specific error codes are defined by this service. The table below documents the **standard Spring Boot default errors** you are most likely to encounter:

| Code | HTTP Status | Category | Retryable | Description | When It Occurs | Recovery Hint |
|------|-------------|----------|-----------|-------------|----------------|---------------|
| N/A | `404` | Client | No | Not Found | Request path does not match any mapped endpoint (e.g., typo in URL). | Verify the request URL against the service's API contract. |
| N/A | `405` | Client | No | Method Not Allowed | An unsupported HTTP method is used on a valid endpoint. | Check the allowed methods for the endpoint. |
| N/A | `500` | Server | Yes (with backoff) | Internal Server Error | Unhandled exception in the application (e.g., database failure, null pointer). | Check application logs for stack traces. Verify database and downstream service connectivity. |
| N/A | `503` | Server | Yes (with backoff) | Service Unavailable | The service is overloaded or a downstream dependency (e.g., Eureka, database) is unreachable. | Retry with exponential backoff. Check health endpoint at `/actuator/health`. |

> **Note:** Since this service uses Spring Cloud and may be accessed via an API Gateway (`spring-petclinic-api-gateway`), additional error codes such as `502 Bad Gateway` or `504 Gateway Timeout` may be returned by the gateway layer rather than by this service directly.

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Common failure scenarios and troubleshooting runbooks for this service
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Source code and project documentation
- [Spring Boot Error Handling Reference](https://docs.spring.io/spring-boot/docs/current/reference/html/web.html#web.servlet.spring-mvc.error-handling) — Official documentation on default error handling behavior
- [DEPENDENCIES.md](DEPENDENCIES.md) — Downstream dependencies and their failure modes
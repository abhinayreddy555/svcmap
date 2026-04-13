<!-- generated: 2026-04-13T04:08:44.888Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Error Catalogue — spring-petclinic-config-server

## TL;DR for Agents

- **Total documented error codes: 0** — No application-specific error codes were extracted from this service.
- This is a **Spring Cloud Config Server**, which primarily serves configuration to other microservices; it does not define custom business-level error codes.
- Errors encountered from this service are typically **Spring Boot / Spring Cloud defaults** (e.g., `404` for missing config profiles, `500` for backend Git/repo failures).
- If you are investigating a downstream service failing to start or fetch config, the issue likely originates **here** — check connectivity, Git repository access, and profile/label resolution.
- No custom global error handling middleware was detected in the extracted data.

## Global Error Handling

No custom global error handling mechanism (e.g., `@ControllerAdvice`, `@ExceptionHandler`, or error filter) was identified in the `spring-petclinic-config-server` source. This means the service relies entirely on **Spring Boot's default error handling** (`BasicErrorController`) and **Spring Cloud Config Server's built-in error responses**. When a configuration resource cannot be resolved, Spring Cloud Config Server returns standard HTTP error responses (typically `404 Not Found` for missing profiles/labels or `500 Internal Server Error` for backend repository failures). These default responses follow the standard Spring Boot error body format:

```json
{
  "timestamp": "...",
  "status": 404,
  "error": "Not Found",
  "path": "/application/default"
}
```

Because there is no custom error mapping, callers should handle standard HTTP status codes and inspect the response body's `"error"` and `"message"` fields for diagnostics.

## Error Reference

No application-specific error codes are defined by this service. The table below documents the **common implicit HTTP errors** you may encounter when calling the Config Server, based on Spring Cloud Config Server's default behavior:

| Code | HTTP Status | Category | Retryable | Description | When It Occurs | Recovery Hint |
|------|-------------|----------|-----------|-------------|----------------|---------------|
| N/A | `404` | Client | No | Configuration not found | Requested application name, profile, or label does not exist in the backing repository. | Verify the `spring.application.name`, active profiles, and label (branch/tag) are correct. Check that the corresponding `.yml`/`.properties` file exists in the config repo. |
| N/A | `500` | Server | Yes | Internal server error / repository access failure | The Config Server cannot reach its backing Git repository (network issue, auth failure, corrupt clone). | Check Git repository URL, credentials, and network connectivity. Inspect Config Server logs for `TransportException` or `GitAPIException`. Retry after resolving the underlying issue. |
| N/A | `503` | Server | Yes | Service unavailable | The Config Server is starting up, overloaded, or its backing store is temporarily unavailable. | Implement retry with exponential backoff in client services. Check Config Server health endpoint at `/actuator/health`. |
| N/A | `401` / `403` | Client | No | Unauthorized / Forbidden | Security is enabled and the caller did not provide valid credentials. | Verify `spring.cloud.config.username` and `spring.cloud.config.password` in the calling service's bootstrap configuration. |

> **Note:** If you are debugging a downstream microservice (e.g., `customers-service`, `visits-service`, `vets-service`) that fails to start with connection-refused or timeout errors, ensure the Config Server is running and reachable at the URL specified by `spring.cloud.config.uri` (default: `http://localhost:8888`).

### Common Client-Side Configuration

Calling services typically connect to the Config Server via bootstrap configuration:

```yaml
# bootstrap.yml in a client microservice
spring:
  cloud:
    config:
      uri: http://localhost:8888
      fail-fast: true
      retry:
        max-attempts: 6
        initial-interval: 1000
        multiplier: 1.5
```

Setting `fail-fast: true` with retry properties ensures transient Config Server unavailability is handled gracefully during startup.

## See Also

- [Spring Cloud Config Server documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_spring_cloud_config_server)
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [SCENARIOS.md](SCENARIOS.md) — Common failure scenarios and troubleshooting runbooks
- [Spring Boot Default Error Handling](https://docs.spring.io/spring-boot/docs/current/reference/html/web.html#web.servlet.spring-mvc.error-handling)
<!-- generated: 2026-04-13T04:27:46.078Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Error Catalogue — spring-petclinic-visits-service

## TL;DR for Agents

- **3 total error codes** defined for this service; all are **HTTP 400** validation errors.
- **None of the errors are retryable** — every error requires the caller to fix the request before resending.
- Most common root cause: invalid or missing `petId` path variable / request parameter, or a `Visit` object that fails Jakarta Bean Validation constraints.
- No custom `@ControllerAdvice` or `@ExceptionHandler` exists — the service relies entirely on **Spring Boot default error handling**.
- If you're seeing a `500 Internal Server Error`, it is **not catalogued here**; it indicates an unhandled exception — check application logs and [SCENARIOS.md](SCENARIOS.md).

## Global Error Handling

The `spring-petclinic-visits-service` does **not** implement a custom global `@ControllerAdvice` or `@ExceptionHandler`. All error responses are produced by Spring Boot's default error handling pipeline via `DispatcherServlet`. When a request body or path variable annotated with `@Valid` or constraint annotations (e.g., `@Min(1)`) fails validation, Spring's built-in `MethodArgumentNotValidException` / `ConstraintViolationException` handler returns an HTTP `400 Bad Request` response containing structured validation error details. Any exception that is **not** explicitly handled results in a generic `500 Internal Server Error` response with the standard Spring Boot error body (`timestamp`, `status`, `error`, `path`). Because there is no custom error-shaping middleware, error response formats follow the Spring Boot defaults and may vary slightly between validation errors and other unhandled exceptions.

## Error Reference

| Code | HTTP Status | Category | Retryable | Description | When It Occurs | Recovery Hint |
|------|-------------|------------|-----------|-------------|----------------|---------------|
| `VALIDATION_ERROR` | `400` | validation | ❌ No | Request body failed Jakarta validation constraints | `POST /owners/*/pets/{petId}/visits` receives an invalid `Visit` object or `petId < 1` | Ensure the `Visit` object satisfies all `@Valid` constraints (non-null/non-blank fields, valid date, etc.) and that `petId` is `>= 1`. |
| `INVALID_PET_ID` | `400` | validation | ❌ No | Path variable `petId` fails `@Min(1)` constraint | `GET /owners/*/pets/{petId}/visits` or `POST` with `petId < 1` | Provide a `petId` value `>= 1`. |
| `INVALID_REQUEST_PARAMETER` | `400` | validation | ❌ No | Request parameter `petId` list is malformed or missing | `GET /pets/visits` called without the `petId` query parameter or with an invalid format | Provide `petId` as a comma-separated list of integers, e.g., `?petId=111,222`. |

### Quick Retry Decision Matrix

| Retryable? | Codes |
|------------|-------|
| ❌ **Never retry** | `VALIDATION_ERROR`, `INVALID_PET_ID`, `INVALID_REQUEST_PARAMETER` |
| ✅ **Safe to retry** | *(none)* |

> **Note:** All catalogued errors are client-side validation failures. Retrying the identical request will always produce the same error. Fix the request payload or parameters before resending.

### Example Error Response (Spring Boot Default)

```json
{
  "timestamp": "2024-07-15T12:34:56.789+00:00",
  "status": 400,
  "error": "Bad Request",
  "path": "/owners/1/pets/0/visits"
}
```

For validation errors, the response may also include a `errors` array with per-field violation details, depending on the Spring Boot version and auto-configuration.

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Common failure scenarios, including `500` errors and downstream dependency issues
- [spring-petclinic-visits-service source](https://github.com/spring-petclinic/spring-petclinic-microservices/tree/main/spring-petclinic-visits-service) — Controller and model source code
- [Spring Boot Error Handling Reference](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#web.servlet.spring-mvc.error-handling) — Default error response behavior
- [RUNBOOK.md](RUNBOOK.md) — Operational runbook for the visits service
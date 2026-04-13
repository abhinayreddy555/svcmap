<!-- generated: 2026-04-13T04:17:41.101Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Error Catalogue — spring-petclinic-customers-service

## TL;DR for Agents

- **3 total error codes** defined for this service: `ERR_RESOURCE_NOT_FOUND`, `ERR_INVALID_REQUEST_BODY`, `ERR_INVALID_PATH_PARAMETER`.
- **None of the errors are retryable** — all three indicate client-side issues that require request correction before re-sending.
- Most common errors are **validation failures (HTTP 400)** on request bodies and path parameters, and **404s** when an Owner or Pet ID does not exist in the database.
- No custom global error handler exists; error mapping relies on Spring Boot defaults (`@ResponseStatus`, `MethodArgumentNotValidException`, `ConstraintViolationException`).
- If you see a `404` from this service, the resource ID is wrong or the entity was deleted — do **not** retry; verify the ID via a list endpoint first.

## Global Error Handling

The `spring-petclinic-customers-service` does **not** implement a custom global error handler or middleware. Instead, it relies entirely on Spring Boot's default error-handling mechanisms. The `ResourceNotFoundException` class is annotated with `@ResponseStatus(value = HttpStatus.NOT_FOUND)`, which causes Spring to automatically return an HTTP 404 response whenever this exception is thrown. For request-body validation errors (triggered by `@Valid` in combination with `@NotBlank`, `@Digits`, `@Size`, and other Bean Validation annotations), Spring raises a `MethodArgumentNotValidException`, which maps to HTTP 400 by default. Path-parameter constraint violations (e.g., `@Min(1)` on `ownerId` or `petId`) result in a `ConstraintViolationException`, also mapped to HTTP 400. Because there is no custom `@ControllerAdvice` or error filter, the response body format for 400 and 404 errors follows the standard Spring Boot error JSON structure (`timestamp`, `status`, `error`, `path`).

## Error Reference

| Code | HTTP Status | Category | Retryable | Description | When It Occurs | Recovery Hint |
|------|-------------|----------|-----------|-------------|----------------|---------------|
| `ERR_RESOURCE_NOT_FOUND` | `404` | other | ❌ No | Requested resource (Owner or Pet) does not exist | `GET /owners/{ownerId}`, `PUT /owners/{ownerId}`, `POST /owners/{ownerId}/pets`, `GET /owners/*/pets/{petId}`, `PUT /owners/*/pets/{petId}` — when the resource ID is not found in the database | Verify the resource ID exists; use `GET` list endpoints to retrieve valid IDs before retrying the call. |
| `ERR_INVALID_REQUEST_BODY` | `400` | validation | ❌ No | Request body validation failed | `POST /owners` or `POST /owners/{ownerId}/pets` with an invalid `OwnerRequest` or `PetRequest` — missing `@NotBlank` fields, invalid `@Digits` format, or `@Size` constraint violation | Fix the request body: ensure `firstName`, `lastName`, `address`, `city`, and `telephone` are non-blank; `telephone` must be at most 12 digits; pet `name` must have size ≥ 1. |
| `ERR_INVALID_PATH_PARAMETER` | `400` | validation | ❌ No | Path parameter validation failed | `GET /owners/{ownerId}`, `PUT /owners/{ownerId}`, `POST /owners/{ownerId}/pets`, `GET /owners/*/pets/{petId}`, `PUT /owners/*/pets/{petId}` — when `ownerId` or `petId` is less than 1 (`@Min(1)` constraint) | Provide a valid positive integer (≥ 1) for `ownerId` and `petId`. |

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Common failure scenarios and troubleshooting playbooks for this service
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Source code and upstream documentation
- [ENDPOINTS.md](ENDPOINTS.md) — Full API endpoint reference for the customers service
- [Spring Boot Error Handling Reference](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#web.servlet.spring-mvc.error-handling) — Default error response behavior used by this service
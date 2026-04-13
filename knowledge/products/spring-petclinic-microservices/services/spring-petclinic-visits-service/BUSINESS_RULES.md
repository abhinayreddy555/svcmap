<!-- generated: 2026-04-13T04:30:28.653Z | model: claude-opus-4-6 | sha: 597ad1fb -->



# Business Rules — spring-petclinic-visits-service

## TL;DR for Agents

- **No state machines** exist in this service; visits are created and stored with no lifecycle transitions.
- **3 business rules** govern visit creation: description max length (8192 chars), pet ID minimum value (≥ 1), and automatic date defaulting to current timestamp.
- **No permission model** is enforced at the service level — all endpoints are open (security is expected at the API gateway layer).
- **Most critical constraint**: a `petId` must be ≥ 1 on both read and create paths; violating this returns HTTP 400.
- **No calculations or formulas** are present in this service.

---

## State Machines

There are no state machines in the `spring-petclinic-visits-service`. The `Visit` entity is a simple create-and-read resource with no lifecycle states or transitions. Visits are persisted on creation and are never updated, cancelled, or deleted through the service API.

---

## Business Rules

### Validation Rules

#### Visit description maximum length

| Field       | Value                                                                                                  |
|-------------|--------------------------------------------------------------------------------------------------------|
| **Category**  | Validation                                                                                           |
| **Condition** | `description.length() > 8192`                                                                        |
| **Outcome**   | Validation fails during entity binding; HTTP `400 Bad Request`                                       |
| **Error Code**| None (framework default validation error response)                                                   |
| **Code Ref**  | `spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/model/Visit.java:description` |

The `description` field on the `Visit` entity is annotated with a max-length constraint of **8192 characters**. This is enforced by Bean Validation (`@Size` or `@Column(length=8192)`) at the binding/persistence layer. Payloads exceeding this limit are rejected before reaching the database.

---

#### Pet ID minimum value

| Field       | Value                                                                                                  |
|-------------|--------------------------------------------------------------------------------------------------------|
| **Category**  | Validation                                                                                           |
| **Condition** | `petId < 1`                                                                                          |
| **Outcome**   | Validation fails; HTTP `400 Bad Request`                                                             |
| **Error Code**| None (framework default validation error response)                                                   |
| **Code Ref**  | `spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java:read,create` |

Both the **read** (`GET /pets/{petId}/visits`) and **create** (`POST /pets/{petId}/visits`) endpoints enforce that the `petId` path variable is ≥ 1. This is validated via `@Min(1)` on the controller method parameter. A zero or negative `petId` is never forwarded to the repository layer.

> ⚠️ **Agent note**: This validation applies on **both** read and write paths. Any code generating requests to this service must ensure `petId >= 1` regardless of the HTTP method.

---

### Business Constraint Rules

#### Visit date default initialization

| Field       | Value                                                                                                  |
|-------------|--------------------------------------------------------------------------------------------------------|
| **Category**  | Business constraint                                                                                  |
| **Condition** | `visit.date == null`                                                                                 |
| **Outcome**   | `Visit.date` is set to `new Date()` (current timestamp at object construction time)                  |
| **Error Code**| N/A — this is a silent default, not an error                                                         |
| **Code Ref**  | `spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/model/Visit.java:date` |

The `date` field is initialized inline in the entity class:

```java
private Date date = new Date();
```

If a client omits the `date` field in the JSON payload, the visit is recorded with the **server-side current timestamp**. If a client provides a date, the provided value is used instead. There is no validation preventing past or future dates.

---

### Quick Reference

| Name                                | Category              | Condition                  | Code Ref                                  |
|-------------------------------------|-----------------------|----------------------------|-------------------------------------------|
| Visit description maximum length    | Validation            | `description.length() > 8192` | `Visit.java:description`               |
| Pet ID minimum value                | Validation            | `petId < 1`                | `VisitResource.java:read,create`          |
| Visit date default initialization   | Business constraint   | `visit.date == null`       | `Visit.java:date`                         |

---

## Permission Matrix

| Resource                  | Action  | Allowed Roles | Additional Conditions | Denial Behavior          |
|---------------------------|---------|---------------|-----------------------|--------------------------|
| `GET /pets/{petId}/visits`  | Read    | Any / Anonymous | `petId >= 1`         | HTTP `400` if petId < 1  |
| `POST /pets/{petId}/visits` | Create  | Any / Anonymous | `petId >= 1`, valid body | HTTP `400` on validation failure |

**Auth model summary**: The `spring-petclinic-visits-service` does **not** implement its own authentication or authorization layer. There are no `@PreAuthorize`, role checks, JWT validations, or ownership guards within this service. Security is expected to be enforced at the **API Gateway** level (e.g., `spring-petclinic-api-gateway`) or via a sidecar/service-mesh policy. Any agent generating code for this service should **not** assume role-based access control exists at the service boundary.

---

## Calculations & Formulas

There are no calculations or formulas in the `spring-petclinic-visits-service`. Visit records are stored as-is with no derived fields, aggregations, or computed values.

---

## What an Agent Must Know

- **Always ensure `petId >= 1`** in any URL path targeting this service. This is validated on both `GET` and `POST` endpoints and will return `400` if violated.
- **Description payloads must not exceed 8192 characters.** Truncate or reject upstream if there is any risk of exceeding this limit.
- **Omitting the `date` field is safe** — the server defaults to the current timestamp. However, be aware that the default is set at **Java object construction time**, not at database insert time, so there may be a small time drift under heavy load.
- **No authentication is enforced** at the service level. Do not rely on this service to reject unauthorized requests — that responsibility belongs to the API gateway.
- **Visits are immutable after creation** — there are no update or delete endpoints. If an agent needs to "correct" a visit, it must create a new one (or operate directly on the database, which is outside the service contract).
- **No foreign-key validation against the pets service** is performed. A visit can be created with a `petId` that does not exist in `spring-petclinic-customers-service`. Agents orchestrating cross-service workflows should verify pet existence before creating visits.
- **There are no state transitions to guard.** Unlike services with approval workflows or cancellation windows, every valid `POST` results in a persisted visit — there is no rollback path through the API.

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — End-to-end scenarios where these validation rules are exercised
- [ERRORS.md](ERRORS.md) — Error codes and HTTP status codes returned by the visits service
- [DATA_MODEL.md](DATA_MODEL.md) — Entity field definitions for `Visit`, including column types and constraints
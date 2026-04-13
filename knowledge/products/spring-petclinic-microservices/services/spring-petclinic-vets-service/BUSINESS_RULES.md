<!-- generated: 2026-04-13T04:29:37.989Z | model: claude-opus-4-6 | sha: 597ad1fb -->



# Business Rules — spring-petclinic-vets-service

## TL;DR for Agents

- **0 state machines**, **2 validation rules**, no permission model detected — this is a simple read-heavy reference-data service.
- **Most critical constraint:** `Vet.firstName` and `Vet.lastName` must not be blank; persistence will fail with a constraint violation if either is null or empty.
- No role-based or ownership-based authorization is enforced at the service level.
- No business calculations or formulas exist in this service.
- If you are creating or updating a `Vet` entity, you **must** supply non-blank `firstName` and `lastName` — there are no other guards.

---

## State Machines

No state machines were detected in `spring-petclinic-vets-service`. The `Vet` entity is a static reference-data record with no lifecycle transitions.

---

## Business Rules

### Validation Rules

#### Vet firstName required

| Field       | Value                                                                                                          |
|-------------|----------------------------------------------------------------------------------------------------------------|
| **Category**  | Validation                                                                                                   |
| **Condition** | `firstName` is `null` or an empty string                                                                     |
| **Outcome**   | Validation constraint violation; entity cannot be persisted                                                   |
| **Error Code** | _(none — standard Bean Validation `@NotBlank` violation)_                                                   |
| **Code Ref**  | `spring-petclinic-vets-service/src/main/java/org/springframework/samples/petclinic/vets/model/Vet.java:firstName` |

---

#### Vet lastName required

| Field       | Value                                                                                                          |
|-------------|----------------------------------------------------------------------------------------------------------------|
| **Category**  | Validation                                                                                                   |
| **Condition** | `lastName` is `null` or an empty string                                                                      |
| **Outcome**   | Validation constraint violation; entity cannot be persisted                                                   |
| **Error Code** | _(none — standard Bean Validation `@NotBlank` violation)_                                                   |
| **Code Ref**  | `spring-petclinic-vets-service/src/main/java/org/springframework/samples/petclinic/vets/model/Vet.java:lastName` |

---

### Quick Reference

| Name                    | Category   | Condition                              | Code Ref                                                                                       |
|-------------------------|------------|----------------------------------------|------------------------------------------------------------------------------------------------|
| Vet firstName required  | Validation | `firstName` is null or empty string    | `Vet.java:firstName` |
| Vet lastName required   | Validation | `lastName` is null or empty string     | `Vet.java:lastName`  |

---

## Permission Matrix

| Resource | Action | Allowed Roles | Additional Conditions | Denial Behavior |
|----------|--------|---------------|-----------------------|-----------------|
| `Vet`   | Read (list all) | _Any / Unauthenticated_ | None | N/A |

**Auth model summary:** No authentication or authorization mechanism was detected within `spring-petclinic-vets-service` itself. The service exposes a public REST endpoint (`GET /vets`) that returns all veterinarians. In a production deployment, access control is typically enforced at the API Gateway layer (e.g., Spring Cloud Gateway) rather than inside this microservice. Agents should not assume any role or token check exists at the service boundary.

---

## Calculations & Formulas

No calculations or formulas were detected in this service. The vets service is a straightforward CRUD/read-only reference-data provider.

---

## What an Agent Must Know

- **Always provide non-blank `firstName` and `lastName`** when creating or updating a `Vet` entity. Omitting either will cause a `javax.validation.ConstraintViolationException` (or equivalent) at persistence time.
- There are **no state transitions** to check — `Vet` records are static reference data.
- There are **no permission checks** inside this service. If you need to restrict access, enforce it at the gateway or caller level.
- The `Vet` entity has a many-to-many relationship with `Specialty`. Adding specialties is allowed freely — no validation rules constrain the association beyond standard JPA/FK integrity.
- The primary endpoint is **read-only** (`GET /vets`). If you are generating code that mutates vet data, verify that a write endpoint actually exists or that you are operating through a repository directly (e.g., in tests or data loaders).
- Bean Validation annotations (`@NotBlank`) are the **only** enforcement mechanism — there are no programmatic checks in service-layer code. Bypassing validation (e.g., calling `repository.save()` without triggering validation) could persist invalid data.

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Test scenarios where these validation rules are exercised
- [ERRORS.md](ERRORS.md) — Error codes and exception mappings for constraint violations
- [DATA_MODEL.md](DATA_MODEL.md) — Full entity field definitions for `Vet` and `Specialty`
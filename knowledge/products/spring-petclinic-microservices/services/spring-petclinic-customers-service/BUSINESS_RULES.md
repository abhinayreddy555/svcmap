<!-- generated: 2026-04-13T04:20:30.781Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Business Rules — spring-petclinic-customers-service

## TL;DR for Agents

- **No state machines** exist in this service; entities (Owner, Pet) are simple CRUD resources with no lifecycle states.
- **10 business rules** govern this service: 5 validation rules (field format/presence) and 5 business-constraint rules (existence checks before mutations).
- **All endpoints are public** — zero role-based or ownership-based authorization checks are implemented; any caller can read/write any resource.
- **Most critical constraint**: every mutation on Owner or Pet requires the target entity to already exist in the database; violations yield `ResourceNotFoundException` (HTTP 404).
- **PetType assignment degrades gracefully** — if the referenced `PetType` doesn't exist, the pet is saved without a type rather than throwing an error.

---

## State Machines

No state machines were detected in this service. Owner and Pet entities follow a stateless CRUD pattern — they are created, read, updated, and listed without any lifecycle state transitions or terminal states.

---

## Business Rules

### Validation Rules

#### Owner required fields

| Field       | Value |
|-------------|-------|
| **Category**  | `validation` |
| **Condition** | `@NotBlank` on `firstName`, `lastName`, `address`, `city`, `telephone` |
| **Outcome**   | Validation error (HTTP 400) if any field is blank or null |
| **Error Code** | — (framework-generated `MethodArgumentNotValidException`) |
| **Code Ref**  | `org.springframework.samples.petclinic.customers.model.Owner`, `org.springframework.samples.petclinic.customers.web.OwnerRequest` |

#### Owner telephone format validation

| Field       | Value |
|-------------|-------|
| **Category**  | `validation` |
| **Condition** | `@Digits(fraction = 0, integer = 12)` on `Owner.telephone` and `OwnerRequest.telephone` |
| **Outcome**   | Validation error if telephone contains non-numeric characters, has a fractional part, or exceeds 12 digits |
| **Error Code** | — (framework-generated constraint violation) |
| **Code Ref**  | `org.springframework.samples.petclinic.customers.model.Owner:telephone`, `org.springframework.samples.petclinic.customers.web.OwnerRequest:telephone` |

#### Owner ID must be positive

| Field       | Value |
|-------------|-------|
| **Category**  | `validation` |
| **Condition** | `@Min(1)` on `ownerId` path variable |
| **Outcome**   | Validation error if `ownerId < 1` |
| **Error Code** | — (framework-generated constraint violation) |
| **Code Ref**  | `OwnerResource:findOwner`, `OwnerResource:updateOwner` |

#### Pet ID must be positive

| Field       | Value |
|-------------|-------|
| **Category**  | `validation` |
| **Condition** | `@Min(1)` on `ownerId` path variable in pet creation |
| **Outcome**   | Validation error if `ownerId < 1` |
| **Error Code** | — (framework-generated constraint violation) |
| **Code Ref**  | `PetResource:processCreationForm` |

#### Pet name required and minimum length

| Field       | Value |
|-------------|-------|
| **Category**  | `validation` |
| **Condition** | `@Size(min = 1)` on `PetRequest.name` |
| **Outcome**   | Validation error if name is empty or null |
| **Error Code** | — (framework-generated constraint violation) |
| **Code Ref**  | `org.springframework.samples.petclinic.customers.web.PetRequest:name` |

---

### Business-Constraint Rules

#### Owner existence check on update

| Field       | Value |
|-------------|-------|
| **Category**  | `business-constraint` |
| **Condition** | `ownerRepository.findById(ownerId).isEmpty()` |
| **Outcome**   | Throws `ResourceNotFoundException` → HTTP 404 |
| **Error Code** | `ResourceNotFoundException` |
| **Code Ref**  | `OwnerResource:updateOwner` |

#### Owner existence check on pet creation

| Field       | Value |
|-------------|-------|
| **Category**  | `business-constraint` |
| **Condition** | `ownerRepository.findById(ownerId).isEmpty()` |
| **Outcome**   | Throws `ResourceNotFoundException` → HTTP 404 |
| **Error Code** | `ResourceNotFoundException` |
| **Code Ref**  | `PetResource:processCreationForm` |

#### Pet existence check on retrieval

| Field       | Value |
|-------------|-------|
| **Category**  | `business-constraint` |
| **Condition** | `petRepository.findById(petId).isEmpty()` |
| **Outcome**   | Throws `ResourceNotFoundException` → HTTP 404 |
| **Error Code** | `ResourceNotFoundException` |
| **Code Ref**  | `PetResource:findPet`, `PetResource:findPetById` |

#### Pet existence check on update

| Field       | Value |
|-------------|-------|
| **Category**  | `business-constraint` |
| **Condition** | `petRepository.findById(petId).isEmpty()` |
| **Outcome**   | Throws `ResourceNotFoundException` → HTTP 404 |
| **Error Code** | `ResourceNotFoundException` |
| **Code Ref**  | `PetResource:processUpdateForm` |

#### PetType existence check on pet save

| Field       | Value |
|-------------|-------|
| **Category**  | `business-constraint` |
| **Condition** | `petRepository.findPetTypeById(typeId).isEmpty()` |
| **Outcome**   | Pet type is **not set** — the pet is saved without a type (graceful degradation via `ifPresent` guard) |
| **Error Code** | — (no exception thrown) |
| **Code Ref**  | `PetResource:save` |

---

### Quick Reference

| Name | Category | Condition | Code Ref |
|------|----------|-----------|----------|
| Owner required fields | `validation` | `@NotBlank` on firstName, lastName, address, city, telephone | `Owner`, `OwnerRequest` |
| Owner telephone format | `validation` | `@Digits(fraction=0, integer=12)` | `Owner:telephone`, `OwnerRequest:telephone` |
| Owner ID must be positive | `validation` | `@Min(1)` on `ownerId` | `OwnerResource:findOwner`, `OwnerResource:updateOwner` |
| Pet ID must be positive | `validation` | `@Min(1)` on `ownerId` | `PetResource:processCreationForm` |
| Pet name required | `validation` | `@Size(min=1)` on `PetRequest.name` | `PetRequest:name` |
| Owner existence on update | `business-constraint` | `findById(ownerId).isEmpty()` | `OwnerResource:updateOwner` |
| Owner existence on pet creation | `business-constraint` | `findById(ownerId).isEmpty()` | `PetResource:processCreationForm` |
| Pet existence on retrieval | `business-constraint` | `findById(petId).isEmpty()` | `PetResource:findPet`, `PetResource:findPetById` |
| Pet existence on update | `business-constraint` | `findById(petId).isEmpty()` | `PetResource:processUpdateForm` |
| PetType existence on save | `business-constraint` | `findPetTypeById(typeId).isEmpty()` | `PetResource:save` |

---

## Permission Matrix

| Resource | Action | Allowed Roles | Additional Conditions | Denial Behavior |
|----------|--------|---------------|----------------------|-----------------|
| `POST /owners` | create | **Any (public)** | — | No authorization checks |
| `GET /owners` | list | **Any (public)** | — | No authorization checks |
| `GET /owners/{ownerId}` | read | **Any (public)** | — | No authorization checks |
| `PUT /owners/{ownerId}` | update | **Any (public)** | Owner must exist (existence only, no ownership verification) | `ResourceNotFoundException` if owner missing |
| `GET /petTypes` | list | **Any (public)** | — | No authorization checks |
| `POST /owners/{ownerId}/pets` | create | **Any (public)** | Owner must exist | `ResourceNotFoundException` if owner missing |
| `PUT /owners/*/pets/{petId}` | update | **Any (public)** | Pet must exist | `ResourceNotFoundException` if pet missing |
| `GET /owners/*/pets/{petId}` | read | **Any (public)** | Pet must exist | `ResourceNotFoundException` if pet missing |

**Authorization model summary:** This service implements **no authentication or authorization**. There are no JWT checks, no RBAC, no ABAC, and no ownership-based guards. Every endpoint is publicly accessible. Any caller can create, read, update, or list any Owner or Pet resource. If you are adding authorization to this service, every endpoint in the table above needs to be secured.

---

## Calculations & Formulas

No calculations or formulas are defined in this service. All operations are pure CRUD with validation constraints.

---

## What an Agent Must Know

1. **Always check entity existence before mutation.** Calling `PUT /owners/{ownerId}` or `PUT /owners/*/pets/{petId}` against a non-existent ID will result in a `ResourceNotFoundException` (HTTP 404). An agent must verify the entity exists or handle 404 gracefully.

2. **Telephone must be purely numeric, max 12 digits.** Sending formatted phone numbers (e.g., `555-123-4567` or `+1 555 1234567`) will fail validation. Strip all non-digit characters before submitting.

3. **All five Owner fields are mandatory.** Omitting or sending blank values for `firstName`, `lastName`, `address`, `city`, or `telephone` will trigger a validation error. An agent generating Owner payloads must populate every field.

4. **Pet name cannot be empty.** The `@Size(min = 1)` constraint means an empty string `""` or a missing `name` field will be rejected.

5. **PetType resolution is silently optional.** If a `PetRequest` references a `typeId` that doesn't exist in the database, the pet is saved **without a type** rather than throwing an error. An agent should not assume a pet always has a type after creation.

6. **No authorization exists — do not assume protected resources.** Any caller can modify any owner or pet. If an agent is generating code that assumes role-based access, it must add its own guards; the service provides none.

7. **Path variable IDs must be ≥ 1.** Passing `0` or negative IDs in URL paths will fail `@Min(1)` validation before any business logic executes.

8. **Owner-Pet relationship is enforced at creation only.** A pet is linked to an owner during `POST /owners/{ownerId}/pets`, but the `PUT /owners/*/pets/{petId}` endpoint resolves the pet by `petId` alone — the `ownerId` in the path is effectively ignored during update.

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — End-to-end scenarios exercising these validation and existence rules
- [ERRORS.md](ERRORS.md) — Full catalog of error codes including `ResourceNotFoundException` mapping
- [DATA_MODEL.md](DATA_MODEL.md) — Entity field definitions for Owner, Pet, and PetType
<!-- generated: 2026-04-13T04:21:44.266Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Data Model — spring-petclinic-genai-service

## TL;DR for Agents

- **Zero database entities** — this is a GenAI gateway service with no local persistence; all data is fetched from downstream microservices via REST.
- **8 DTO/transfer objects** define the data contract: 2 request DTOs (`OwnerRequest`, `PetRequest`) and 6 response/domain DTOs.
- **Core object graph**: `OwnerDetails` → `PetDetails` → `VisitDetails` (nested one-to-many relationships).
- **Pet types are referenced by integer ID** in requests (`typeId`: 1=cat, 2=dog, 3=lizard, 4=snake, 5=bird, 6=hamster).
- **Vet data** is read-only; `Vet` → `Specialty` is a many-to-many relationship surfaced as a nested set.

---

## Database Entities

This service **does not own any database entities**. It acts as an AI-powered orchestration layer that communicates with other microservices in the `spring-petclinic-microservices` ecosystem (e.g., `customers-service`, `visits-service`, `vets-service`) via REST calls through `AIDataProvider`.

All data structures described below are DTOs used for inter-service communication and AI tool function definitions.

---

## Enums

### PetType (Implicit — referenced by `PetRequest.typeId`)

Although `PetType` is surfaced as a domain object with a `name` field in responses, the request side uses an integer `typeId`. The mapping is:

| Value | Description |
|-------|-------------|
| `1` | Cat |
| `2` | Dog |
| `3` | Lizard |
| `4` | Snake |
| `5` | Bird |
| `6` | Hamster |

> **Note:** These IDs are defined by the downstream `customers-service` database. The GenAI service references them as constants in `PetRequest.typeId`.

---

## Key Relationships

```
OwnerDetails (1) ──── has many ───▶ PetDetails (*)
PetDetails   (1) ──── has many ───▶ VisitDetails (*)
PetDetails   (*) ──── has one  ───▶ PetType (1)
Vet          (*) ──── has many ───▶ Specialty (*)
```

- **Owner → Pets**: Each `OwnerDetails` contains a `List<PetDetails>`. Pets are added to an owner via `AIDataProvider.addPetToOwner()` using a `PetRequest`.
- **Pet → Visits**: Each `PetDetails` contains a `List<VisitDetails>`, representing the visit history for that pet.
- **Pet → PetType**: Each `PetDetails` embeds a `PetType` object (response side). On the request side (`PetRequest`), only the integer `typeId` is sent.
- **Vet → Specialties**: Each `Vet` contains a `Set<Specialty>`. This is a read-only relationship surfaced by `AIDataProvider.getVets()`.

> **Important:** There is no direct relationship between `Vet` and `VisitDetails` in this service's data model. Visit-to-vet association, if any, is managed by downstream services.

---

## DTOs & Transfer Objects

### OwnerRequest `[request]`

Request body for adding a new owner to the pet clinic.

**Used in:** `PetclinicTools.addOwnerToPetclinic()`, `AIDataProvider.addOwnerToPetclinic()`

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|-----------------|-------------|
| `firstName` | `String` | ✅ | `@NotBlank` | Owner's first name |
| `lastName` | `String` | ✅ | `@NotBlank` | Owner's last name |
| `address` | `String` | ✅ | `@NotBlank` | Street address |
| `city` | `String` | ✅ | `@NotBlank` | City of residence |
| `telephone` | `String` | ✅ | `@NotBlank`, `@Digits(fraction=0, integer=12)` | 10-digit phone number (numeric characters only, max 12 digits) |

---

### OwnerDetails `[response]`

Data Transfer Object representing an owner with their pets. Returned from downstream `customers-service`.

**Used in:** `AIDataProvider.getAllOwners()`, `AIDataProvider.addOwnerToPetclinic()`

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|-----------------|-------------|
| `id` | `int` | ✅ | — | Unique owner identifier |
| `firstName` | `String` | ✅ | — | Owner's first name |
| `lastName` | `String` | ✅ | — | Owner's last name |
| `address` | `String` | ✅ | — | Street address |
| `city` | `String` | ✅ | — | City of residence |
| `telephone` | `String` | ✅ | — | Phone number |
| `pets` | `List<PetDetails>` | ✅ | — | All pets belonging to this owner |

---

### PetRequest `[request]`

Request body for adding a pet to an existing owner.

**Used in:** `AIDataProvider.addPetToOwner()`, `PetclinicTools.addPetToOwner()`

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|-----------------|-------------|
| `id` | `int` | ✅ | — | Pet identifier (set to `0` for new pets) |
| `name` | `String` | ✅ | — | Pet's name |
| `birthDate` | `Date` | ✅ | `@JsonFormat` pattern `yyyy-MM-dd` | Pet's date of birth |
| `typeId` | `int` | ✅ | — | Pet type identifier (1=cat, 2=dog, 3=lizard, 4=snake, 5=bird, 6=hamster) |

---

### PetDetails `[response]`

Data Transfer Object representing a pet with its visit history.

**Used in:** `OwnerDetails.pets`, `AIDataProvider.addPetToOwner()`

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|-----------------|-------------|
| `id` | `int` | ✅ | — | Unique pet identifier |
| `name` | `String` | ✅ | — | Pet's name |
| `birthDate` | `String` | ✅ | — | Pet's date of birth (string representation) |
| `type` | `PetType` | ✅ | — | The type/species of the pet |
| `visits` | `List<VisitDetails>` | ✅ | — | All recorded visits for this pet |

---

### PetType `[domain-object]`

Data Transfer Object representing a pet type/species. Embedded within `PetDetails`.

**Used in:** `PetDetails.type`

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|-----------------|-------------|
| `name` | `String` | ✅ | — | Human-readable type name (e.g., `"cat"`, `"dog"`) |

---

### VisitDetails `[domain-object]`

Data Transfer Object representing a single veterinary visit for a pet.

**Used in:** `PetDetails.visits`

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|-----------------|-------------|
| `id` | `Integer` | ✅ | — | Unique visit identifier |
| `petId` | `Integer` | ✅ | — | Foreign reference to the pet this visit belongs to |
| `date` | `String` | ✅ | — | Date of the visit (string representation) |
| `description` | `String` | ✅ | — | Description/notes for the visit |

---

### Vet `[response]`

Data Transfer Object representing a veterinarian with their specialties.

**Used in:** `PetclinicTools.listVets()`, `AIDataProvider.getVets()`

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|-----------------|-------------|
| `id` | `Integer` | ✅ | — | Unique vet identifier |
| `firstName` | `String` | ✅ | — | Vet's first name |
| `lastName` | `String` | ✅ | — | Vet's last name |
| `specialties` | `Set<Specialty>` | ✅ | — | Set of veterinary specialties (e.g., radiology, surgery) |

---

### Specialty `[domain-object]`

Data Transfer Object representing a veterinarian's area of specialization. Embedded within `Vet`.

**Used in:** `Vet.specialties`

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|-----------------|-------------|
| `id` | `Integer` | ❌ | — | Specialty identifier (nullable) |
| `name` | `String` | ✅ | — | Specialty name (e.g., `"radiology"`, `"surgery"`, `"dentistry"`) |

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Usage scenarios for AI tool functions that consume these DTOs
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Parent project containing the downstream services that own the actual database entities
- [spring-petclinic-customers-service](https://github.com/spring-petclinic/spring-petclinic-microservices/tree/main/spring-petclinic-customers-service) — Upstream service that owns `Owner`, `Pet`, and `PetType` entities
- [spring-petclinic-vets-service](https://github.com/spring-petclinic/spring-petclinic-microservices/tree/main/spring-petclinic-vets-service) — Upstream service that owns `Vet` and `Specialty` entities
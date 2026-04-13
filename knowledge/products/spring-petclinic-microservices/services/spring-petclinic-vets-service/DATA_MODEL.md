<!-- generated: 2026-04-13T04:25:06.844Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Data Model — spring-petclinic-vets-service

## TL;DR for Agents

- **2 database entities** (`Vet`, `Specialty`) joined by a many-to-many relationship through a `vet_specialties` join table.
- **4 DTO / config objects**: `Vet` (response), `Specialty` (response), `VetsProperties` (config), `Cache` (config).
- **Most important entity is `Vet`** — the core domain object representing a veterinarian, exposed via `GET /vets`.
- **No enums** are defined in this service.
- The only cross-entity join is `Vet ↔ Specialty` (many-to-many), resolved eagerly as a sorted list in the API response.

---

## Database Entities

### Vet

Simple JavaBean domain object representing a veterinarian.

| Field | Type | Nullable | Index | FK → | Description |
|---|---|---|---|---|---|
| `id` | `Integer` | No | — | — | Primary key |
| `firstName` | `String` | No | — | — | Vet's first name |
| `lastName` | `String` | Yes | ✅ | — | Vet's last name |
| `specialties` | `Set<Specialty>` | Yes | — | → `Specialty` | Collection of specialties via join table |

**Primary Key:** `id`

**Relationships:**

`Vet` has a **many-to-many** relationship with `Specialty` through the `vet_specialties` join table. A single vet can hold zero or more specialties (e.g., dentistry, surgery), and a single specialty can be associated with many vets.

---

### Specialty

Models a Vet's specialty (for example, dentistry).

| Field | Type | Nullable | Index | FK → | Description |
|---|---|---|---|---|---|
| `id` | `Integer` | No | — | — | Primary key |
| `name` | `String` | Yes | ✅ | — | Human-readable specialty name (e.g., "radiology") |

**Primary Key:** `id`

**Relationships:**

`Specialty` participates in a **many-to-many** relationship with `Vet` through the `vet_specialties` join table. A specialty can be shared across multiple vets.

---

## Enums

_No enums are defined in this service._

---

## Key Relationships

```
┌───────────┐       ┌────────────────────┐       ┌─────────────┐
│    Vet    │──M:N──│  vet_specialties   │──M:N──│  Specialty  │
│           │       │  (join table)      │       │             │
│  id (PK)  │       │  vet_id (FK)       │       │  id (PK)    │
│  firstName│       │  specialty_id (FK) │       │  name       │
│  lastName │       └────────────────────┘       └─────────────┘
└───────────┘
```

- **`Vet` ↔ `Specialty`** — Many-to-many via the implicit `vet_specialties` join table.
  - `vet_specialties.vet_id` → `Vet.id`
  - `vet_specialties.specialty_id` → `Specialty.id`
- The `lastName` index on `Vet` and the `name` index on `Specialty` support lookup/sort queries.
- In the API response, specialties are returned as a **sorted list** within each `Vet` object.

---

## DTOs & Transfer Objects

### Vet `[response]`

Vet entity returned by the vets API endpoint.

**Used in:** `GET /vets`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `id` | `Integer` | Yes | — | Vet primary key |
| `firstName` | `String` | Yes | `@NotBlank` | Vet's first name |
| `lastName` | `String` | Yes | `@NotBlank` | Vet's last name |
| `specialties` | `List<Specialty>` | No | — | Sorted list of specialties associated with the vet |

---

### Specialty `[response]`

Specialty entity returned as a nested object within the Vet response.

**Used in:** `GET /vets` (nested inside `Vet.specialties`)

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `id` | `Integer` | Yes | — | Specialty primary key |
| `name` | `String` | Yes | — | Human-readable specialty name |

---

### VetsProperties `[domain-object]`

Typesafe custom configuration object for the vets service, bound via Spring Boot `@ConfigurationProperties`.

**Used in:** `VetsServiceApplication`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `cache` | `Cache` | Yes | — | Nested cache configuration block |

---

### Cache `[domain-object]`

Cache configuration nested within `VetsProperties`. Controls the in-memory cache behavior for vet data.

**Used in:** `VetsProperties`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `ttl` | `int` | Yes | — | Cache time-to-live in seconds |
| `heapSize` | `int` | Yes | — | Maximum number of entries held on the JVM heap |

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Query scenarios and access patterns for the vets service
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Parent project with all microservices
- [API_REFERENCE.md](API_REFERENCE.md) — Endpoint documentation for `GET /vets` and related routes
- [CONFIGURATION.md](CONFIGURATION.md) — Details on `VetsProperties` and cache tuning
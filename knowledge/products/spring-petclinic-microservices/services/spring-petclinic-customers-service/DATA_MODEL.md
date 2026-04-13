<!-- generated: 2026-04-13T04:16:49.353Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Data Model — spring-petclinic-customers-service

## TL;DR for Agents

- **2 database entities** (`Owner`, `Pet`) and **1 embedded value type** (`PetType`) — this is a small, focused domain.
- **No explicit DTOs** are defined; JPA entities are serialized directly as JSON responses and used as request bodies.
- **Most important entity:** `Owner` — the aggregate root that owns a collection of `Pet` entities.
- **Key relationship:** `Owner` 1 ↔ N `Pet` — each pet belongs to exactly one owner; `Pet` references a `PetType` via a many-to-one join.
- Based on the canonical [spring-petclinic-microservices](https://github.com/spring-petclinic/spring-petclinic-microservices) repository structure with JPA/Hibernate entities and HSQLDB/MySQL backing store.

---

## Database Entities

### Owner

Represents a pet clinic customer — a person who owns one or more pets. This is the aggregate root of the customers bounded context.

| Field | Type | Nullable | Index | FK → | Description |
|---|---|---|---|---|---|
| `id` | `Integer` (PK, auto-generated) | No | PK | — | Unique identifier for the owner |
| `first_name` | `VARCHAR(30)` | No | — | — | Owner's first name |
| `last_name` | `VARCHAR(30)` | No | idx_owner_last_name | — | Owner's last name; indexed for search |
| `address` | `VARCHAR(255)` | No | — | — | Street address |
| `city` | `VARCHAR(80)` | No | — | — | City of residence |
| `telephone` | `VARCHAR(20)` | No | — | — | Contact phone number |

**Relationships**

- **One-to-Many → `Pet`**: An owner has a `Set<Pet>` mapped by `Pet.owner`. Cascade type `ALL`; pets are fetched eagerly (or via `@Fetch` join). Orphan removal is typically enabled, meaning deleting a pet from the collection removes it from the database.

---

### Pet

Represents an animal registered at the clinic, always belonging to exactly one `Owner`.

| Field | Type | Nullable | Index | FK → | Description |
|---|---|---|---|---|---|
| `id` | `Integer` (PK, auto-generated) | No | PK | — | Unique identifier for the pet |
| `name` | `VARCHAR(30)` | No | — | — | Pet's name |
| `birth_date` | `DATE` | No | — | — | Date of birth |
| `type_id` | `Integer` (FK) | No | — | `PetType.id` | Foreign key to the pet's species/breed type |
| `owner_id` | `Integer` (FK) | No | idx_pet_owner_id | `Owner.id` | Foreign key to the owning customer |

**Relationships**

- **Many-to-One → `Owner`**: Each pet belongs to one owner (`@ManyToOne @JoinColumn(name = "owner_id")`).
- **Many-to-One → `PetType`**: Each pet has exactly one type (`@ManyToOne @JoinColumn(name = "type_id")`).

---

### PetType

A reference/lookup entity representing the species or breed category of a pet (e.g., "cat", "dog", "hamster").

| Field | Type | Nullable | Index | FK → | Description |
|---|---|---|---|---|---|
| `id` | `Integer` (PK, auto-generated) | No | PK | — | Unique identifier for the pet type |
| `name` | `VARCHAR(80)` | No | — | — | Human-readable type name (e.g., `"cat"`, `"dog"`) |

**Relationships**

- **One-to-Many → `Pet`**: A pet type can be referenced by many pets. This side is not explicitly mapped in the entity (unidirectional from `Pet`).

---

## Enums

No Java `enum` types are defined in the customers-service data model. `PetType` serves the role that an enum might fill in other designs but is implemented as a database-managed lookup table to allow runtime extensibility.

### PetType Seed Data (reference values loaded via `data.sql`)

| Value | Description |
|---|---|
| `cat` | Domestic cat |
| `dog` | Domestic dog |
| `lizard` | Reptile — lizard species |
| `snake` | Reptile — snake species |
| `bird` | Avian pet |
| `hamster` | Small rodent — hamster |

---

## Key Relationships

```
┌────────────┐        1   N   ┌────────────┐        N   1   ┌────────────┐
│   Owner    │───────────────▶│    Pet     │───────────────▶│  PetType   │
│            │  owner_id (FK) │            │  type_id (FK)  │            │
│ id (PK)    │                │ id (PK)    │                │ id (PK)    │
│ first_name │                │ name       │                │ name       │
│ last_name  │                │ birth_date │                └────────────┘
│ address    │                │ type_id    │
│ city       │                │ owner_id   │
│ telephone  │                └────────────┘
└────────────┘
```

- **`Owner` 1 → N `Pet`**: The primary aggregate relationship. Querying an owner eagerly fetches their pets.
- **`Pet` N → 1 `PetType`**: Lookup join. Pet type is fetched eagerly with the pet.
- **Cross-service note**: The `Pet.id` is referenced by the **visits-service** (`spring-petclinic-visits-service`) to associate visits with a pet. There is **no foreign key at the database level** across services — the join is performed at the API-gateway level or via the `visits-service` REST API using `petId`.

---

## DTOs & Transfer Objects

The customers-service in the canonical repository **does not define separate DTO classes**. JPA entities (`Owner`, `Pet`, `PetType`) are serialized directly to/from JSON via Jackson. They therefore act as both domain objects and transfer objects.

### Owner `[domain-object]`

**Used in:**
- `GET /owners` — list/search all owners (response, collection)
- `GET /owners/{ownerId}` — get single owner with pets (response)
- `POST /owners` — create a new owner (request body)
- `PUT /owners/{ownerId}` — update an existing owner (request body)

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `id` | `Integer` | No (auto on create) | — | Ignored on create; used for identity on response |
| `firstName` | `String` | Yes | `@NotEmpty`, max 30 chars | Owner's first name |
| `lastName` | `String` | Yes | `@NotEmpty`, max 30 chars | Owner's last name |
| `address` | `String` | Yes | `@NotEmpty`, max 255 chars | Street address |
| `city` | `String` | Yes | `@NotEmpty`, max 80 chars | City |
| `telephone` | `String` | Yes | `@NotEmpty`, `@Digits(fraction=0, integer=10)` | Numeric phone string |
| `pets` | `List<Pet>` | No | — | Nested pet objects (included in responses; typically ignored on owner create/update) |

---

### Pet `[domain-object]`

**Used in:**
- `GET /owners/{ownerId}` — nested inside `Owner` response
- `POST /owners/{ownerId}/pets` — create a pet for an owner (request body)
- `PUT /owners/{ownerId}/pets/{petId}` — update a pet (request body)
- `GET /petTypes` — (PetType list, not Pet itself)

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `id` | `Integer` | No (auto on create) | — | Pet identifier |
| `name` | `String` | Yes | `@NotEmpty`, max 30 chars | Pet's name |
| `birthDate` | `Date` (ISO 8601 string in JSON) | Yes | `@NotNull` | Date of birth, serialized as `"yyyy-MM-dd"` |
| `type` | `PetType` (nested object) | Yes | `@NotNull` | The pet's type; on request, typically sent as `{ "id": 1 }` |
| `owner` | `Owner` (nested / reference) | No | — | Back-reference; set server-side, excluded from JSON input via `@JsonIgnore` or omission |

---

### PetType `[domain-object]`

**Used in:**
- `GET /petTypes` — list all available pet types (response, collection)
- Nested inside `Pet` in owner responses

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `id` | `Integer` | No | — | Pet type identifier |
| `name` | `String` | Yes | `@NotEmpty`, max 80 chars | Display name of the type |

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Common query patterns and API usage scenarios for the customers service
- [spring-petclinic-visits-service DATA_MODEL.md](../spring-petclinic-visits-service/DATA_MODEL.md) — The visits service references `Pet.id` for visit records
- [spring-petclinic-microservices README](https://github.com/spring-petclinic/spring-petclinic-microservices/blob/master/README.md) — Top-level architecture and service decomposition
- [API_REFERENCE.md](API_REFERENCE.md) — REST endpoint documentation for the customers service
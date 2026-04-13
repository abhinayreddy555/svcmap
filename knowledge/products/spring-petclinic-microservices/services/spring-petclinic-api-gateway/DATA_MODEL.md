<!-- generated: 2026-04-13T04:10:53.614Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Data Model — spring-petclinic-api-gateway

## TL;DR for Agents

- **Zero database entities** — this is an API Gateway service; it owns no database tables and persists no data directly.
- **5 DTO/transfer objects** aggregate data from downstream microservices: `OwnerDetails`, `PetDetails`, `PetType`, `VisitDetails`, `Visits`.
- **Key aggregation pattern**: The gateway composes `OwnerDetails` by fetching owner+pet data from `customers-service` and visit data from `visits-service`, then merging visits into each `PetDetails` by `petId`.
- The primary endpoint is `GET /owners/{ownerId}`, which returns a fully hydrated `OwnerDetails` response including nested pets and their visits.
- No enums are defined in this service.

---

## Database Entities

This service is an **API Gateway** and does not own any database tables. All data is fetched at runtime from downstream microservices:

| Downstream Service | Feign Client | Data Provided |
|---|---|---|
| `customers-service` | `CustomersServiceClient` | Owner and pet information |
| `visits-service` | `VisitsServiceClient` | Visit records per pet |

> If you are looking for the underlying entity schemas, refer to the data model documentation for `spring-petclinic-customers-service` and `spring-petclinic-visits-service`.

---

## Enums

No enums are defined in this service.

---

## Key Relationships

The API Gateway aggregates data from two downstream services into a single composite response. The relationships below describe the **logical** data model as seen through the gateway's DTOs:

```
OwnerDetails (1) ──── has many ───▶ PetDetails (*)
     │                                   │
     │                                   ├── has one ───▶ PetType
     │                                   │
     │                                   └── has many ──▶ VisitDetails (*)
     │
     └── fetched from: customers-service

VisitDetails ── linked by petId ──▶ PetDetails
     │
     └── fetched from: visits-service (via Visits wrapper)
```

- **OwnerDetails → PetDetails**: One owner has many pets. The `pets` list is embedded directly in the owner response from `customers-service`.
- **PetDetails → PetType**: Each pet has exactly one type (e.g., dog, cat, bird). This is a value object nested inside `PetDetails`.
- **PetDetails → VisitDetails**: Each pet has zero or more visits. Visits are fetched separately from `visits-service` using `GET /pets/visits?petId={id1},{id2},...` and then merged into the corresponding `PetDetails` objects by matching on `petId`.
- **Visits → VisitDetails**: `Visits` is a thin wrapper DTO containing a list of `VisitDetails` items, used as the response shape from `VisitsServiceClient.getVisitsForPets()`.

---

## DTOs & Transfer Objects

### OwnerDetails `[response]`

Response DTO representing owner details with associated pets. This is the **primary composite object** returned by the API Gateway after aggregating data from both downstream services.

**Used in:** `GET /owners/{ownerId}`, `CustomersServiceClient.getOwner()`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `id` | `int` | ✅ | — | Owner identifier |
| `firstName` | `String` | ✅ | — | Owner first name |
| `lastName` | `String` | ✅ | — | Owner last name |
| `address` | `String` | ✅ | — | Owner street address |
| `city` | `String` | ✅ | — | Owner city |
| `telephone` | `String` | ✅ | — | Owner telephone number |
| `pets` | `List<PetDetails>` | ✅ | — | List of pets owned by this owner |

---

### PetDetails `[response]`

Response DTO representing pet details with associated visits. The `visits` field is populated by the gateway after a separate call to the visits service.

**Used in:** `OwnerDetails.pets`, `GET /owners/{ownerId}`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `id` | `int` | ✅ | — | Pet identifier |
| `name` | `String` | ✅ | — | Pet name |
| `birthDate` | `String` | ✅ | — | Pet birth date |
| `type` | `PetType` | ✅ | — | Pet type information |
| `visits` | `List<VisitDetails>` | ✅ | Defaults to empty `ArrayList` if null | List of visits for this pet |

---

### PetType `[domain-object]`

Value object representing a pet type. Embedded within `PetDetails`.

**Used in:** `PetDetails.type`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `name` | `String` | ✅ | — | Pet type name (e.g., `dog`, `cat`, `bird`) |

---

### VisitDetails `[response]`

Response DTO representing a single pet visit record.

**Used in:** `PetDetails.visits`, `Visits.items`, `GET /pets/visits`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `id` | `Integer` | ✅ | — | Visit identifier |
| `petId` | `Integer` | ✅ | — | Associated pet identifier (used for merging visits into the correct `PetDetails`) |
| `date` | `String` | ✅ | — | Visit date |
| `description` | `String` | ✅ | — | Visit description |

---

### Visits `[response]`

Wrapper response DTO representing a collection of visits. Used as the deserialization target for the visits-service bulk query.

**Used in:** `GET /pets/visits`, `VisitsServiceClient.getVisitsForPets()`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `items` | `List<VisitDetails>` | ✅ | Defaults to empty `ArrayList` | List of visit details |

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — API usage scenarios including the owner-details aggregation flow
- [API.md](API.md) — Gateway endpoint specifications and routing configuration
- [spring-petclinic-customers-service](../spring-petclinic-customers-service/DATA_MODEL.md) — Upstream entity model for owners and pets
- [spring-petclinic-visits-service](../spring-petclinic-visits-service/DATA_MODEL.md) — Upstream entity model for visits
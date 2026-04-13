<!-- generated: 2026-04-13T04:26:15.946Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Table Map — spring-petclinic-vets-service

## TL;DR for Agents

- **3 tables owned**, 0 tables read from other services — this service is fully self-contained for vet data.
- Most critical table is **`vets`**, storing all veterinarian identity records.
- The **`vet_specialties`** junction table links vets to specialties via a `@ManyToMany` JPA relationship with eager fetch.
- All three tables are queried together on **`GET /vets`** — the only endpoint in this service.
- No cross-service database reads exist; no other service writes to these tables.

---

## Tables Owned

### `vets`

**Database:** `petclinic`
**Description:** Stores veterinarian information including first and last names.

#### Columns

| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| `id` | `INTEGER IDENTITY PRIMARY KEY` / `INT(4) UNSIGNED AUTO_INCREMENT` | No | PK | Primary key identifier for veterinarian |
| `first_name` | `VARCHAR(30)` | Yes | — | Veterinarian first name |
| `last_name` | `VARCHAR(30)` | Yes | — | Veterinarian last name |

#### Indexes

| Index Name | Details |
|---|---|
| `vets_last_name` | Index on `last_name` column |

#### Feature Usage

| Feature / Endpoint | Operation | Description |
|---|---|---|
| `GET /vets` | `SELECT` | Retrieve all veterinarians with their specialties via `VetRepository.findAll()` |

---

### `specialties`

**Database:** `petclinic`
**Description:** Stores veterinary specialties such as radiology, surgery, dentistry.

#### Columns

| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| `id` | `INTEGER IDENTITY PRIMARY KEY` / `INT(4) UNSIGNED AUTO_INCREMENT` | No | PK | Primary key identifier for specialty |
| `name` | `VARCHAR(80)` | Yes | — | Specialty name (e.g., radiology, surgery, dentistry) |

#### Indexes

| Index Name | Details |
|---|---|
| `specialties_name` | Index on `name` column |

#### Feature Usage

| Feature / Endpoint | Operation | Description |
|---|---|---|
| `GET /vets` | `SELECT` | Retrieve specialties for vets via `@ManyToMany` relationship with eager fetch |

---

### `vet_specialties`

**Database:** `petclinic`
**Description:** Junction table for the many-to-many relationship between `vets` and `specialties`.

#### Columns

| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| `vet_id` | `INTEGER` / `INT(4) UNSIGNED` | No | FK → `vets.id` | Foreign key reference to vets table |
| `specialty_id` | `INTEGER` / `INT(4) UNSIGNED` | No | FK → `specialties.id` | Foreign key reference to specialties table |

#### Indexes

| Index Name | Details |
|---|---|
| `UNIQUE (vet_id, specialty_id)` | Composite unique constraint preventing duplicate vet–specialty assignments |

#### Feature Usage

| Feature / Endpoint | Operation | Description |
|---|---|---|
| `GET /vets` | `SELECT` | Join table queried to load specialties for each vet via `@ManyToMany` relationship |

---

## Tables Read From Other Services

| Table | Owning Service | Access Method | Reason |
|---|---|---|---|
| _None_ | — | — | This service has no cross-service database reads. |

---

## See Also

- [DATABASE_CATALOG.md](DATABASE_CATALOG.md) — Full database catalog for the spring-petclinic-microservices product
- [SCENARIOS.md](SCENARIOS.md) — End-to-end feature scenarios that exercise the vets service
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Source repository
- [Spring Data JPA `@ManyToMany` reference](https://docs.spring.io/spring-data/jpa/reference/) — JPA relationship documentation relevant to the vet–specialty mapping
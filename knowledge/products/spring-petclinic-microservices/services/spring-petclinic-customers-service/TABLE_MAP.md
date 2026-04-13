<!-- generated: 2026-04-13T04:17:06.659Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Table Map — spring-petclinic-customers-service

## TL;DR for Agents

- **3 tables owned** (`owners`, `pets`, `types`), **0 tables read from other services** — this service is the sole authority for customer and pet data.
- The `owners` table is the most critical table, referenced by every major API endpoint in this service.
- `pets` has foreign keys to both `owners` (`owner_id`) and `types` (`type_id`), making it the central junction of the data model.
- No cross-service reads exist; other services must call this service's REST API to access owner/pet data.
- All tables live in the `petclinic` database and use auto-increment integer primary keys.

## Tables Owned

### `owners`

> Stores pet owner information including contact details and address.

**Database:** `petclinic` · **Ownership:** owns

#### Columns

| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| `id` | `INTEGER IDENTITY PRIMARY KEY` / `INT(4) UNSIGNED AUTO_INCREMENT PRIMARY KEY` | No | PK | Primary key identifier for owner |
| `first_name` | `VARCHAR(30)` | Yes | — | Owner's first name |
| `last_name` | `VARCHAR(30)` | Yes | — | Owner's last name |
| `address` | `VARCHAR(255)` | Yes | — | Owner's street address |
| `city` | `VARCHAR(80)` | Yes | — | Owner's city |
| `telephone` | `VARCHAR(12)` / `VARCHAR(20)` | Yes | — | Owner's telephone number |

#### Indexes

| Index Name | Column(s) |
|---|---|
| `owners_last_name` | `last_name` |

#### Feature Usage

| Feature / Endpoint | Operation | Description |
|---|---|---|
| `POST /owners` | `INSERT` | Create new owner via `OwnerResource.createOwner()` |
| `GET /owners` | `SELECT` | Retrieve all owners via `OwnerResource.findAll()` |
| `GET /owners/{ownerId}` | `SELECT` | Retrieve single owner by ID via `OwnerResource.findOwner()` |
| `PUT /owners/{ownerId}` | `UPDATE` | Update owner details via `OwnerResource.updateOwner()` |
| `POST /owners/{ownerId}/pets` | `SELECT` | Lookup owner when creating pet via `PetResource.processCreationForm()` |

---

### `pets`

> Stores pet information linked to owners and pet types.

**Database:** `petclinic` · **Ownership:** owns

#### Columns

| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| `id` | `INTEGER IDENTITY PRIMARY KEY` / `INT(4) UNSIGNED AUTO_INCREMENT PRIMARY KEY` | No | PK | Primary key identifier for pet |
| `name` | `VARCHAR(30)` | Yes | — | Pet's name |
| `birth_date` | `DATE` | Yes | — | Pet's date of birth |
| `type_id` | `INTEGER` / `INT(4) UNSIGNED` | No | FK → `types.id` | Foreign key reference to pet type |
| `owner_id` | `INTEGER` / `INT(4) UNSIGNED` | No | FK → `owners.id` | Foreign key reference to owner |

#### Indexes

| Index Name | Column(s) |
|---|---|
| `pets_name` | `name` |

#### Feature Usage

| Feature / Endpoint | Operation | Description |
|---|---|---|
| `POST /owners/{ownerId}/pets` | `INSERT` | Create new pet via `PetResource.processCreationForm()` |
| `PUT /owners/*/pets/{petId}` | `UPDATE` | Update pet details via `PetResource.processUpdateForm()` |
| `GET /owners/*/pets/{petId}` | `SELECT` | Retrieve pet details via `PetResource.findPet()` |

---

### `types`

> Stores pet type classifications (cat, dog, hamster, etc.).

**Database:** `petclinic` · **Ownership:** owns

#### Columns

| Column | Type | Nullable | Key | Description |
|---|---|---|---|---|
| `id` | `INTEGER IDENTITY PRIMARY KEY` / `INT(4) UNSIGNED AUTO_INCREMENT PRIMARY KEY` | No | PK | Primary key identifier for pet type |
| `name` | `VARCHAR(80)` | Yes | — | Pet type name (e.g., cat, dog, hamster) |

#### Indexes

| Index Name | Column(s) |
|---|---|
| `types_name` | `name` |

#### Feature Usage

| Feature / Endpoint | Operation | Description |
|---|---|---|
| `GET /petTypes` | `SELECT` | Retrieve all pet types via `PetRepository.findPetTypes()` |
| `PUT /owners/*/pets/{petId}` | `SELECT` | Lookup pet type by ID via `PetRepository.findPetTypeById()` |
| `POST /owners/{ownerId}/pets` | `SELECT` | Lookup pet type by ID via `PetRepository.findPetTypeById()` |

## Tables Read From Other Services

| Table | Owning Service | Access Method | Reason |
|---|---|---|---|
| *(none)* | — | — | This service has no cross-service table reads. All data is self-contained. |

## See Also

- [DATABASE_CATALOG.md](DATABASE_CATALOG.md) — Full database catalog for the spring-petclinic-microservices product
- [SCENARIOS.md](SCENARIOS.md) — End-to-end feature scenarios that exercise these tables
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Source repository
- [API_CATALOG.md](API_CATALOG.md) — REST endpoint inventory for all microservices
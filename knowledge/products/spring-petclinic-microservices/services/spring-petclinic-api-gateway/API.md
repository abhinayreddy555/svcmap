<!-- generated: 2026-04-13T04:09:45.067Z | model: claude-opus-4-6 | sha: 597ad1fb -->



# API Reference — spring-petclinic-api-gateway

## TL;DR for Agents

- **13 REST endpoints** exposed through the API gateway — no authentication required on any endpoint.
- **Gateway aggregation endpoint** `GET /api/gateway/owners/{ownerId}` merges owner data with visit data and includes a circuit-breaker fallback (returns empty visits on `503`).
- **Four downstream services** are proxied: **customers** (`/api/customer/*`), **vets** (`/api/vet/*`), **visits** (`/api/visit/*`), and a custom **gateway** aggregation layer.
- CRUD operations available for **owners**, **pets**, and **visits**; vets are read-only.
- A dedicated **fallback endpoint** (`POST /api/fallback`) returns `503` when downstream services are unreachable via the circuit breaker.

## Authentication

This API gateway does **not** enforce authentication. All endpoints are publicly accessible.

| Property | Value |
|---|---|
| Auth mechanism | None |
| Token format | N/A |
| API key header | N/A |

## Base URL

All endpoint paths below are relative to the base URL.

| Environment | Base URL |
|---|---|
| Local (default) | `http://localhost:8080/api` |
| Docker Compose | `http://api-gateway:8080/api` |
| Kubernetes | Depends on ingress/service configuration |

> **Note:** The gateway routes requests to downstream microservices (`customers-service`, `vets-service`, `visits-service`) via service discovery. Ensure Eureka or your service registry is running.

---

## GET `/gateway/owners/{ownerId}`

**Purpose:** Get owner details with associated pet visits. This is an **aggregation endpoint** that calls the customers service and the visits service, then merges the results.

**Auth:** None

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `ownerId` | integer | Yes | The owner's unique ID |

**Request Body:** None

**Response:**

| Status | Meaning | Body |
|---|---|---|
| `200` | Owner details retrieved successfully | See below |
| `503` | Service unavailable — fallback returns owner with empty visits | Pets array present but each pet's `visits` array is `[]` |

**200 Response Body:**

```json
{
  "id": 1,
  "firstName": "George",
  "lastName": "Franklin",
  "pets": [
    {
      "id": 1,
      "name": "Leo",
      "type": "cat",
      "visits": [
        {
          "id": 1,
          "petId": 1,
          "date": "2023-01-15",
          "description": "Rabies shot"
        }
      ]
    }
  ]
}
```

> **Circuit Breaker:** When the visits service is unavailable, the gateway falls back gracefully — the owner and pet data is still returned, but the `visits` arrays are empty. This prevents a full request failure.

---

## GET `/customer/owners`

**Purpose:** List all owners.

**Auth:** None

**Request Body:** None

**Response:**

| Status | Meaning | Body |
|---|---|---|
| `200` | Owners list retrieved | `{ owners[] }` |

**200 Response Body:**

```json
{
  "owners": [
    {
      "id": 1,
      "firstName": "George",
      "lastName": "Franklin",
      "address": "110 W. Liberty St.",
      "city": "Madison",
      "telephone": "6085551023"
    }
  ]
}
```

---

## GET `/customer/owners/{ownerId}`

**Purpose:** Get a single owner's details (without visit data).

**Auth:** None

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `ownerId` | integer | Yes | The owner's unique ID |

**Request Body:** None

**Response:**

| Status | Meaning | Body |
|---|---|---|
| `200` | Owner retrieved | See below |

**200 Response Body:**

```json
{
  "id": 1,
  "firstName": "George",
  "lastName": "Franklin",
  "address": "110 W. Liberty St.",
  "city": "Madison",
  "telephone": "6085551023"
}
```

---

## POST `/customer/owners`

**Purpose:** Create a new owner.

**Auth:** None

**Request Body:**

```json
{
  "firstName": "George",
  "lastName": "Franklin",
  "address": "110 W. Liberty St.",
  "city": "Madison",
  "telephone": "6085551023"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `firstName` | string | Yes | Owner's first name |
| `lastName` | string | Yes | Owner's last name |
| `address` | string | Yes | Street address |
| `city` | string | Yes | City |
| `telephone` | string | Yes | Phone number |

**Response:**

| Status | Meaning | Body |
|---|---|---|
| `201` | Owner created | Created owner object with `id` |
| `400` | Invalid payload | Validation error details |

**201 Response Body:**

```json
{
  "id": 11,
  "firstName": "George",
  "lastName": "Franklin",
  "address": "110 W. Liberty St.",
  "city": "Madison",
  "telephone": "6085551023"
}
```

---

## PUT `/customer/owners/{ownerId}`

**Purpose:** Update an existing owner's details.

**Auth:** None

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `ownerId` | integer | Yes | The owner's unique ID |

**Request Body:**

```json
{
  "id": 1,
  "firstName": "George",
  "lastName": "Franklin",
  "address": "112 W. Liberty St.",
  "city": "Madison",
  "telephone": "6085551023"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | Yes | Must match `ownerId` in path |
| `firstName` | string | Yes | Owner's first name |
| `lastName` | string | Yes | Owner's last name |
| `address` | string | Yes | Street address |
| `city` | string | Yes | City |
| `telephone` | string | Yes | Phone number |

**Response:**

| Status | Meaning | Body |
|---|---|---|
| `200` | Owner updated | Updated owner object |
| `400` | Invalid payload | Validation error details |

---

## GET `/customer/petTypes`

**Purpose:** Get all available pet types.

**Auth:** None

**Request Body:** None

**Response:**

| Status | Meaning | Body |
|---|---|---|
| `200` | Pet types retrieved | See below |

**200 Response Body:**

```json
{
  "petTypes": [
    { "id": 1, "name": "cat" },
    { "id": 2, "name": "dog" },
    { "id": 3, "name": "lizard" },
    { "id": 4, "name": "snake" },
    { "id": 5, "name": "bird" },
    { "id": 6, "name": "hamster" }
  ]
}
```

---

## GET `/customer/owners/{ownerId}/pets/{petId}`

**Purpose:** Get details for a specific pet.

**Auth:** None

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `ownerId` | integer | Yes | The owner's unique ID |
| `petId` | integer | Yes | The pet's unique ID |

**Request Body:** None

**Response:**

| Status | Meaning | Body |
|---|---|---|
| `200` | Pet retrieved | See below |

**200 Response Body:**

```json
{
  "id": 1,
  "name": "Leo",
  "birthDate": "2020-09-07",
  "type": {
    "id": 1,
    "name": "cat"
  }
}
```

---

## POST `/customer/owners/{ownerId}/pets`

**Purpose:** Create a new pet for an owner.

**Auth:** None

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `ownerId` | integer | Yes | The owner's unique ID |

**Request Body:**

```json
{
  "name": "Leo",
  "birthDate": "2020-09-07",
  "typeId": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Pet's name |
| `birthDate` | string (date) | Yes | ISO 8601 date (`YYYY-MM-DD`) |
| `typeId` | integer | Yes | ID from `GET /customer/petTypes` |

**Response:**

| Status | Meaning | Body |
|---|---|---|
| `201` | Pet created | Created pet object with `id` and resolved `type` |
| `400` | Invalid payload | Validation error details |

**201 Response Body:**

```json
{
  "id": 1,
  "name": "Leo",
  "birthDate": "2020-09-07",
  "type": {
    "id": 1,
    "name": "cat"
  }
}
```

---

## PUT `/customer/owners/{ownerId}/pets/{petId}`

**Purpose:** Update an existing pet's details.

**Auth:** None

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `ownerId` | integer | Yes | The owner's unique ID |
| `petId` | integer | Yes | The pet's unique ID |

**Request Body:**

```json
{
  "id": 1,
  "name": "Leo",
  "birthDate": "2020-09-07",
  "typeId": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | Yes | Must match `petId` in path |
| `name` | string | Yes | Pet's name |
| `birthDate` | string (date) | Yes | ISO 8601 date (`YYYY-MM-DD`) |
| `typeId` | integer | Yes | ID from `GET /customer/petTypes` |

**Response:**

| Status | Meaning | Body |
|---|---|---|
| `200` | Pet updated | Updated pet object with resolved `type` |
| `400` | Invalid payload | Validation error details |

---

## GET `/vet/vets`

**Purpose:** Get all veterinarians and their specialties.

**Auth:** None

**Request Body:** None

**Response:**

| Status | Meaning | Body |
|---|---|---|
| `200` | Vets list retrieved | See below |

**200 Response Body:**

```json
{
  "vets": [
    {
      "id": 1,
      "firstName": "James",
      "lastName": "Carter",
      "specialties": []
    },
    {
      "id": 2,
      "firstName": "Helen",
      "lastName": "Leary",
      "specialties": [
        { "id": 1, "name": "radiology" }
      ]
    }
  ]
}
```

---

## GET `/visit/owners/{ownerId}/pets/{petId}/visits`

**Purpose:** Get all visits for a specific pet.

**Auth:** None

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `ownerId` | integer | Yes | The owner's unique ID |
| `petId` | integer | Yes | The pet's unique ID |

**Request Body:** None

**Response:**

| Status | Meaning | Body |
|---|---|---|
| `200` | Visits retrieved | See below |

**200 Response Body:**

```json
{
  "visits": [
    {
      "id": 1,
      "petId": 1,
      "date": "2023-01-15",
      "description": "Rabies shot"
    }
  ]
}
```

---

## POST `/visit/owners/{ownerId}/pets/{petId}/visits`

**Purpose:** Create a new visit record for a pet.

**Auth:** None

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `ownerId` | integer | Yes | The owner's unique ID |
| `petId` | integer | Yes | The pet's unique ID |

**Request Body:**

```json
{
  "date": "2023-01-15",
  "description": "Rabies shot"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `date` | string (date) | Yes | Visit date in ISO 8601 format (`YYYY-MM-DD`) |
| `description` | string | Yes | Description of the visit |

**Response:**

| Status | Meaning | Body |
|---|---|---|
| `201` | Visit created | Created visit object with `id` and `petId` |
| `400` | Invalid payload | Validation error details |

**201 Response Body:**

```json
{
  "id": 1,
  "petId": 1,
  "date": "2023-01-15",
  "description": "Rabies shot"
}
```

---

## POST `/fallback`

**Purpose:** Circuit breaker fallback endpoint. This is invoked automatically by the gateway when a downstream service is unreachable. It should not typically be called directly by clients.

**Auth:** None

**Request Body:** None

**Response:**

| Status | Meaning | Body |
|---|---|---|
| `503` | Service unavailable | See below |

**503 Response Body:**

```json
{
  "message": "Chat is currently unavailable. Please try again later."
}
```

---

## Events

No asynchronous events (message queues, topics, or pub/sub) are exposed by the API gateway service.

---

## See Also

- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Source code and architecture overview
- [Spring Cloud Gateway documentation](https://docs.spring.io/spring-cloud-gateway/docs/current/reference/html/) — Routing, circuit breakers, and fallback configuration
- [SCENARIOS.md](SCENARIOS.md) — Common integration scenarios and troubleshooting workflows
- [ARCHITECTURE.md](ARCHITECTURE.md) — Service topology and inter-service communication patterns
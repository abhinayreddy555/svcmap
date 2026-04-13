<!-- generated: 2026-04-13T04:14:46.882Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# API Reference — spring-petclinic-customers-service

## TL;DR for Agents

- **0 explicitly documented endpoints** were extracted from the contract; however, this service is part of the [spring-petclinic-microservices](https://github.com/spring-petclinic/spring-petclinic-microservices) project and typically exposes REST endpoints for managing **owners** and **pets**.
- **No authentication mechanism** is defined in the extracted contract — the service likely runs behind an API gateway that handles auth.
- The customers-service is a Spring Boot microservice registered with a service discovery system (typically Eureka); direct base URL depends on deployment.
- No events (messaging/pub-sub) were found in the extracted contract.
- If you need endpoint details, refer to the source code in the repository under `spring-petclinic-customers-service/src/main/java/` or the running Swagger/OpenAPI docs if enabled.

## Authentication

No authentication mechanism was identified in the extracted API contract.

In the typical spring-petclinic-microservices deployment, authentication and routing are handled at the **API Gateway** layer (`spring-petclinic-api-gateway`). The customers-service itself does not enforce auth independently.

| Property | Value |
|---|---|
| Auth mechanism | None (delegated to API gateway) |
| Token format | N/A |
| Required headers | N/A |

## Base URL

The service registers with **Spring Cloud Netflix Eureka** (or equivalent service discovery). There is no statically defined base URL in the extracted contract.

| Environment | Base URL | Notes |
|---|---|---|
| Local (standalone) | `http://localhost:8081` | Default port per `application.yml`; verify in your config |
| Via API Gateway | `http://localhost:8080/api/customer/` | Gateway routes requests to the customers-service |
| Docker Compose | `http://customers-service:8081` | Internal Docker network hostname |
| Kubernetes | Determined by service discovery / ingress | Depends on cluster configuration |

> **Note:** Ports and hostnames may vary based on your configuration profiles. Check `bootstrap.yml` / `application.yml` or the Spring Cloud Config server for authoritative values.

## Endpoints

> ⚠️ **No endpoints were present in the extracted API contract.** The sections below document the **commonly known endpoints** based on the spring-petclinic-customers-service source code. These are provided for reference and may differ from your deployed version.

### GET /owners

**Purpose:** Retrieve a list of all pet owners.

| Property | Value |
|---|---|
| Auth required | None (gateway-level) |
| Content-Type | `application/json` |

**Request body:** None

**Response:**

| Status | Description | Body |
|---|---|---|
| `200 OK` | List of owners returned | `[ { "id": 1, "firstName": "...", "lastName": "...", "address": "...", "city": "...", "telephone": "...", "pets": [...] } ]` |

---

### GET /owners/{ownerId}

**Purpose:** Retrieve a single owner by ID, including their pets.

| Property | Value |
|---|---|
| Auth required | None (gateway-level) |
| Path parameter | `ownerId` — integer, required |

**Request body:** None

**Response:**

| Status | Description | Body |
|---|---|---|
| `200 OK` | Owner found | `{ "id": 1, "firstName": "...", "lastName": "...", "address": "...", "city": "...", "telephone": "...", "pets": [...] }` |
| `404 Not Found` | Owner does not exist | Empty or error object |

---

### POST /owners

**Purpose:** Create a new pet owner.

| Property | Value |
|---|---|
| Auth required | None (gateway-level) |
| Content-Type | `application/json` |

**Request body:**

```json
{
  "firstName": "George",
  "lastName": "Franklin",
  "address": "110 W. Liberty St.",
  "city": "Madison",
  "telephone": "6085551023"
}
```

**Response:**

| Status | Description | Body |
|---|---|---|
| `201 Created` | Owner created | Created owner object |
| `400 Bad Request` | Validation error | Error details |

---

### PUT /owners/{ownerId}

**Purpose:** Update an existing owner's information.

| Property | Value |
|---|---|
| Auth required | None (gateway-level) |
| Path parameter | `ownerId` — integer, required |
| Content-Type | `application/json` |

**Request body:**

```json
{
  "firstName": "George",
  "lastName": "Franklin",
  "address": "112 W. Liberty St.",
  "city": "Madison",
  "telephone": "6085551024"
}
```

**Response:**

| Status | Description | Body |
|---|---|---|
| `200 OK` / `204 No Content` | Owner updated | Updated owner object or empty |
| `404 Not Found` | Owner does not exist | Error details |
| `400 Bad Request` | Validation error | Error details |

---

### GET /owners/{ownerId}/pets/{petId}

**Purpose:** Retrieve details of a specific pet belonging to an owner.

| Property | Value |
|---|---|
| Auth required | None (gateway-level) |
| Path parameters | `ownerId` — integer, required; `petId` — integer, required |

**Request body:** None

**Response:**

| Status | Description | Body |
|---|---|---|
| `200 OK` | Pet found | `{ "id": 1, "name": "Leo", "birthDate": "2010-09-07", "type": { "id": 1, "name": "cat" } }` |
| `404 Not Found` | Pet or owner not found | Error details |

---

### POST /owners/{ownerId}/pets

**Purpose:** Add a new pet to an owner.

| Property | Value |
|---|---|
| Auth required | None (gateway-level) |
| Path parameter | `ownerId` — integer, required |
| Content-Type | `application/json` |

**Request body:**

```json
{
  "name": "Leo",
  "birthDate": "2010-09-07",
  "typeId": 1
}
```

**Response:**

| Status | Description | Body |
|---|---|---|
| `201 Created` | Pet created | Created pet object |
| `400 Bad Request` | Validation error | Error details |
| `404 Not Found` | Owner not found | Error details |

---

### PUT /owners/{ownerId}/pets/{petId}

**Purpose:** Update an existing pet's information.

| Property | Value |
|---|---|
| Auth required | None (gateway-level) |
| Path parameters | `ownerId` — integer, required; `petId` — integer, required |
| Content-Type | `application/json` |

**Request body:**

```json
{
  "name": "Leo",
  "birthDate": "2010-09-07",
  "typeId": 1
}
```

**Response:**

| Status | Description | Body |
|---|---|---|
| `200 OK` / `204 No Content` | Pet updated | Updated pet object or empty |
| `404 Not Found` | Pet or owner not found | Error details |
| `400 Bad Request` | Validation error | Error details |

---

### GET /petTypes

**Purpose:** Retrieve the list of available pet types (e.g., cat, dog, bird).

| Property | Value |
|---|---|
| Auth required | None (gateway-level) |

**Request body:** None

**Response:**

| Status | Description | Body |
|---|---|---|
| `200 OK` | List of pet types | `[ { "id": 1, "name": "cat" }, { "id": 2, "name": "dog" } ]` |

## Events

No events (message bus topics, pub/sub, or async messaging) were identified in the extracted API contract for this service.

The spring-petclinic-customers-service operates as a synchronous REST service. Other services (e.g., `spring-petclinic-visits-service`) call it via REST or through the API gateway — there is no known event-driven integration.

## See Also

- [spring-petclinic-microservices GitHub Repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Full source code and architecture overview
- [spring-petclinic-api-gateway](https://github.com/spring-petclinic/spring-petclinic-microservices/tree/master/spring-petclinic-api-gateway) — API Gateway that routes to this service
- [spring-petclinic-visits-service](https://github.com/spring-petclinic/spring-petclinic-microservices/tree/master/spring-petclinic-visits-service) — Related service that consumes owner/pet data
- [Spring Cloud Netflix documentation](https://spring.io/projects/spring-cloud-netflix) — Service discovery and client-side load balancing used by this service
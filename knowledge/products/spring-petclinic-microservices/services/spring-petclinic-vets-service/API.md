<!-- generated: 2026-04-13T04:21:58.080Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# API Reference — spring-petclinic-vets-service

## TL;DR for Agents

- **0 explicitly documented endpoints** were extracted from the contract; however, this service is part of the Spring PetClinic Microservices demo and typically exposes a REST endpoint for veterinarian data (e.g., `GET /vets`).
- **No authentication mechanism** is defined in the extracted contract — the service likely runs behind an API gateway that handles auth.
- **No events, GraphQL types, or gRPC services** are defined for this service.
- This is a **read-oriented microservice** serving veterinarian and specialty data to the PetClinic frontend via the API gateway.
- If you're looking for how the gateway routes to this service, see the `spring-petclinic-api-gateway` configuration.

## Authentication

No authentication mechanism was found in the extracted API contract.

In the standard `spring-petclinic-microservices` architecture, authentication and routing are handled at the **API Gateway** layer (`spring-petclinic-api-gateway`). The vets service itself is typically called internally and does not enforce its own auth.

| Property | Value |
|---|---|
| Auth mechanism | None (delegated to API Gateway) |
| Token format | N/A |
| Required headers | N/A |

## Base URL

No base URL was explicitly defined in the extracted contract. Typical defaults for the Spring PetClinic Microservices deployment:

| Environment | Base URL | Notes |
|---|---|---|
| Local (standalone) | `http://localhost:8083` | Default Spring Boot port for vets-service |
| Via API Gateway | `http://localhost:8080/api/vet` | Routed through the gateway |
| Docker Compose | `http://vets-service:8083` | Internal Docker network hostname |
| Kubernetes | `http://vets-service.default.svc.cluster.local:8083` | Cluster-internal DNS |

> **Note:** Ports and paths may vary based on your `application.yml` or gateway route configuration.

## Endpoints

### ⚠️ No Endpoints in Extracted Contract

The automated contract extraction returned **zero endpoints**. This can happen when endpoints are defined via annotation scanning (e.g., `@RestController`, `@GetMapping`) without an OpenAPI/Swagger spec file in the repository.

Based on the well-known Spring PetClinic Microservices codebase, the following endpoint is **expected** but not formally confirmed by the extracted data:

---

### GET /vets (Expected)

> **⚠️ This endpoint is inferred from the canonical PetClinic source code, not from the extracted contract.**

**Purpose:** Returns a list of all veterinarians and their specialties.

**Auth:** None at the service level.

**Request Body:** None.

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| _(none known)_ | — | — | — |

**Response — Success (`200 OK`):**

```json
[
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
```

**Response Codes:**

| Status Code | Description |
|---|---|
| `200 OK` | List of vets returned successfully |
| `500 Internal Server Error` | Unexpected server-side failure |

## Events

No events (published or subscribed) were found in the extracted contract. This service does not appear to participate in any asynchronous messaging (e.g., Kafka, RabbitMQ) based on the available data.

## See Also

- [Spring PetClinic Microservices — GitHub Repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [spring-petclinic-api-gateway documentation](../spring-petclinic-api-gateway/API.md) — Gateway routing and upstream configuration
- [Spring PetClinic Microservices Architecture Overview](https://github.com/spring-petclinic/spring-petclinic-microservices#understanding-the-spring-petclinic-application)
- [SCENARIOS.md](SCENARIOS.md) — Common integration and debugging scenarios
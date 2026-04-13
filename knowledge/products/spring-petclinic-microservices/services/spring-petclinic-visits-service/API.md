<!-- generated: 2026-04-13T04:23:23.759Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# API Reference — spring-petclinic-visits-service

## TL;DR for Agents

- **0 explicitly documented endpoints** were extracted from the contract; however, this service is part of the [spring-petclinic-microservices](https://github.com/spring-petclinic/spring-petclinic-microservices) project and typically exposes REST endpoints for managing pet visits.
- **No authentication mechanism** is defined at the service level; auth is typically handled by the API gateway or Spring Cloud Gateway in the overall architecture.
- **No events** (pub/sub, messaging) were extracted from the contract data.
- This document reflects only what was present in the extracted contract metadata. For the actual runtime API, inspect the source code at `spring-petclinic-visits-service/src/main/java/` or the running service's `/swagger-ui.html` or `/v3/api-docs` endpoint.
- The service is commonly registered with a discovery server (Eureka) and accessed via the API gateway rather than directly.

## Authentication

No authentication mechanism was identified in the extracted API contract for this service.

In the typical `spring-petclinic-microservices` deployment:

| Aspect | Detail |
|---|---|
| Auth enforcement point | API Gateway (not this service directly) |
| Token format | N/A — not defined in extracted contract |
| Direct service access | Generally unauthenticated on the internal network |

> **Note:** If your deployment adds Spring Security or OAuth2, consult your gateway and security configuration for token requirements.

## Base URL

No base URL was present in the extracted contract. Typical conventions for this microservices suite:

| Environment | Base URL | Notes |
|---|---|---|
| Local (direct) | `http://localhost:8082` | Default port for visits-service |
| Local (via gateway) | `http://localhost:8080/api/visit` | Routed through Spring Cloud Gateway |
| Docker Compose | `http://visits-service:8082` | Internal Docker network hostname |
| Kubernetes | Depends on Ingress / Service configuration | Typically exposed via gateway |

> Port `8082` is the conventional default; verify against `application.yml` or `bootstrap.yml` in the service source.

## Endpoints

### No Endpoints Extracted

The automated contract extraction returned **zero endpoints**. This does not mean the service has no API — it means the extraction process did not capture them from the available metadata.

Based on the canonical source code of `spring-petclinic-visits-service`, the service **typically** exposes endpoints such as:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/owners/*/pets/{petId}/visits` | Create a new visit for a pet |
| `GET` | `/owners/*/pets/{petId}/visits` | List visits for a specific pet |
| `GET` | `/pets/visits` | Get visits for multiple pets (query param: `petId`) |

> ⚠️ **These are not from the extracted contract** — they are documented here for orientation only. Always verify against the actual running service or source code.

#### Example: GET `/pets/visits`

```
GET /pets/visits?petId=1,2,3
```

**Typical success response** (`200 OK`):
```json
{
  "items": [
    {
      "id": 1,
      "petId": 7,
      "date": "2023-01-15",
      "description": "Routine checkup"
    }
  ]
}
```

| Status Code | Meaning |
|---|---|
| `200` | Success — visits returned |
| `404` | Pet not found |
| `500` | Internal server error |

## Events

No events (published or subscribed) were identified in the extracted API contract.

If the deployment uses Spring Cloud Stream or a message broker, check `application.yml` for any `spring.cloud.stream` bindings.

## See Also

- [spring-petclinic-microservices GitHub repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [spring-petclinic-api-gateway service](https://github.com/spring-petclinic/spring-petclinic-microservices/tree/master/spring-petclinic-api-gateway) — the gateway that routes to this service
- [spring-petclinic-customers-service](https://github.com/spring-petclinic/spring-petclinic-microservices/tree/master/spring-petclinic-customers-service) — related service managing owners and pets
- [Spring Cloud Netflix Eureka documentation](https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/) — service discovery used by this architecture
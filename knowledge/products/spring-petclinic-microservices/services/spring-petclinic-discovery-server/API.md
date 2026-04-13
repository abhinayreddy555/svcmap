<!-- generated: 2026-04-13T04:13:44.820Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# API Reference — spring-petclinic-discovery-server

## TL;DR for Agents

- **Zero application-level API endpoints** are exposed by this service — it is a **Netflix Eureka Server** used for service discovery, not a business API.
- **No custom authentication mechanism** is configured at the application contract level; access control depends on network/infrastructure configuration.
- The Eureka dashboard is typically available at the root path (`/`) and the Eureka REST API is provided by the embedded Eureka Server library (not custom-defined endpoints).
- This service is part of the [spring-petclinic-microservices](https://github.com/spring-petclinic/spring-petclinic-microservices) infrastructure — other microservices (vets, visits, customers, api-gateway) **register with** this server.
- If you are looking for business/domain API endpoints, see the API gateway or individual service documentation instead.

## Authentication

No application-level authentication mechanism was detected in the extracted contract for this service.

| Aspect | Detail |
|---|---|
| Auth mechanism | None (infrastructure service) |
| Token format | N/A |
| Notes | In production deployments, access to the Eureka server should be restricted via network policies, Spring Security configuration, or an API gateway. The default open-source sample does **not** enforce authentication. |

## Base URL

No explicit base URL is defined in the extracted contract. The Eureka server typically runs on a configured port (default `8761` in the Spring Pet Clinic microservices setup).

| Environment | Base URL | Notes |
|---|---|---|
| Local / Docker Compose | `http://localhost:8761` | Default Eureka port |
| Kubernetes | `http://discovery-server:8761` | Cluster-internal DNS name |
| Production | Determined by deployment | Should not be publicly exposed |

## Endpoints

> **This service exposes no custom application-level endpoints.**

The discovery server is a stock **Spring Cloud Netflix Eureka Server**. All available HTTP endpoints are provided by the Eureka Server library itself. The most commonly used built-in endpoints are listed below for reference:

### Built-in Eureka REST API (provided by library)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | Eureka dashboard (HTML UI) |
| `GET` | `/eureka/apps` | List all registered application instances |
| `GET` | `/eureka/apps/{appId}` | Get instances of a specific application |
| `POST` | `/eureka/apps/{appId}` | Register a new instance |
| `DELETE` | `/eureka/apps/{appId}/{instanceId}` | De-register an instance |
| `PUT` | `/eureka/apps/{appId}/{instanceId}` | Send heartbeat / renew lease |
| `GET` | `/eureka/apps/{appId}/{instanceId}` | Get a specific instance |

> **Note:** These endpoints are part of the [Eureka REST operations](https://github.com/Netflix/eureka/wiki/Eureka-REST-operations) specification and are **not** custom to this project. Request/response schemas are defined by the Eureka library, typically in XML or JSON format depending on the `Accept` header.

## Events

No custom events (message broker topics, pub/sub, etc.) are published or consumed by this service. Communication is purely via HTTP-based service registration and heartbeat mechanisms built into the Eureka protocol.

## See Also

- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — parent project with architecture overview
- [Netflix Eureka REST Operations Wiki](https://github.com/Netflix/eureka/wiki/Eureka-REST-operations) — canonical reference for the built-in Eureka HTTP API
- [Spring Cloud Netflix documentation](https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/) — Spring wrapper configuration and usage
- [SCENARIOS.md](SCENARIOS.md) — common integration and debugging scenarios for this service
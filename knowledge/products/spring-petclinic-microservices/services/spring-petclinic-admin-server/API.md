<!-- generated: 2026-04-13T04:07:11.006Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# API Reference — spring-petclinic-admin-server

## TL;DR for Agents

- **Zero application-level API endpoints** are exposed by this service — it is a **Spring Boot Admin Server** UI/dashboard, not a REST API backend.
- **No authentication mechanism** is configured in the extracted contract.
- This service monitors and manages other microservices in the `spring-petclinic-microservices` ecosystem via the Spring Boot Admin web console.
- It consumes Actuator endpoints from registered services (e.g., `customers-service`, `visits-service`, `vets-service`) rather than exposing its own REST API.
- If you are looking for pet/owner/vet/visit CRUD endpoints, see the individual service API docs instead.

## Authentication

No authentication mechanism is configured for this service based on the extracted contract data.

| Property | Value |
|---|---|
| Auth Mechanism | None detected |
| Token Format | N/A |
| Header | N/A |

> **Note:** In production deployments, Spring Boot Admin is typically secured via Spring Security (e.g., basic auth or OAuth2). Check `application.yml` or `SecurityConfiguration` in the repository for any environment-specific security setup.

## Base URL

No explicit base URL is defined in the extracted contract. The admin server typically runs on a configured server port and registers with the Eureka discovery server.

| Environment | Base URL | Notes |
|---|---|---|
| Local Development | `http://localhost:9090` | Default port; verify in `application.yml` or `bootstrap.yml` |
| Docker Compose | `http://admin-server:9090` | Service name as defined in `docker-compose.yml` |
| Kubernetes | Depends on ingress/service configuration | Check Helm charts or K8s manifests |

## Endpoints

**This service exposes no application-level API endpoints.**

`spring-petclinic-admin-server` is a [Spring Boot Admin](https://github.com/codecentric/spring-boot-admin) instance. Its purpose is to provide a **web-based management and monitoring UI** for the other microservices in the Spring Petclinic system. It does not define custom REST, GraphQL, or gRPC endpoints.

### Implicitly Available Endpoints

The following endpoints are provided automatically by Spring Boot Admin and Spring Boot Actuator, but are **not custom API contracts** of this service:

| Path | Purpose | Type |
|---|---|---|
| `/` | Spring Boot Admin web UI dashboard | Web UI (HTML) |
| `/applications` | Internal — lists registered application instances | Spring Boot Admin internal API |
| `/actuator/**` | Standard Spring Boot Actuator endpoints for the admin server itself | Management/monitoring |

These are framework-provided and not part of a documented API contract for consumers.

## Events

No custom events (message broker topics, published/subscribed events) are defined in the extracted contract for this service.

Spring Boot Admin does support **notifications** (e.g., status change alerts via email, Slack, PagerDuty), but these are configuration-driven and not event contracts in the pub/sub sense.

| Property | Value |
|---|---|
| Topics Published | None |
| Topics Subscribed | None |
| Event Payloads | N/A |

## See Also

- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Parent project with all microservices
- [Spring Boot Admin Documentation](https://docs.spring-boot-admin.com/) — Official docs for the admin server framework
- [Spring Boot Actuator Reference](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html) — Actuator endpoints consumed by the admin server from registered services
- [SCENARIOS.md](SCENARIOS.md) — Common integration and debugging scenarios for this service
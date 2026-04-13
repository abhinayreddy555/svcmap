<!-- generated: 2026-04-13T04:07:51.947Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Data Model — spring-petclinic-config-server

## TL;DR for Agents

- **This service has zero database entities, zero DTOs, and zero enums.** It is not a data-bearing service.
- The `config-server` is a **Spring Cloud Config Server** that serves externalized configuration to other microservices in the `spring-petclinic-microservices` ecosystem.
- It has **no database layer** — it reads configuration from a Git repository (or local filesystem) and exposes it over HTTP.
- If you are looking for data models (entities like `Pet`, `Owner`, `Vet`, `Visit`), see the individual domain services: `customers-service`, `vets-service`, and `visits-service`.
- This document exists for completeness; **skip it if your task involves database schemas, entities, or DTOs**.

## Database Entities

_This service defines no database entities._

The `spring-petclinic-config-server` is an infrastructure service built on [Spring Cloud Config Server](https://spring.io/projects/spring-cloud-config). Its sole responsibility is to serve externalized configuration (e.g., `application.yml` profiles) to downstream microservices over HTTP endpoints such as `/{application}/{profile}`.

It does not connect to any relational database and does not define any JPA/Hibernate entities.

## Enums

_This service defines no enums._

## Key Relationships

_No cross-entity relationships exist in this service._

The config-server has **runtime relationships** with every other microservice in the system — each service fetches its configuration from this server at startup — but these are HTTP-based infrastructure relationships, not data-model joins.

| Downstream Service | Config Fetched Via | Notes |
|---|---|---|
| `customers-service` | `GET /customers-service/{profile}` | DB connection strings, service ports, etc. |
| `vets-service` | `GET /vets-service/{profile}` | DB connection strings, service ports, etc. |
| `visits-service` | `GET /visits-service/{profile}` | DB connection strings, service ports, etc. |
| `api-gateway` | `GET /api-gateway/{profile}` | Routing rules, timeouts, etc. |

## DTOs & Transfer Objects

_This service defines no DTOs or transfer objects._

Spring Cloud Config Server exposes configuration data using its own built-in response format (`Environment`, `PropertySource`), which is part of the Spring Cloud Config library — not custom code in this repository.

## See Also

- [Spring Cloud Config Server Documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_spring_cloud_config_server)
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [SCENARIOS.md](SCENARIOS.md) — common operational scenarios for the microservices system
- [DATA_MODEL.md for customers-service](../spring-petclinic-customers-service/DATA_MODEL.md) — the primary data-bearing service with `Owner` and `Pet` entities
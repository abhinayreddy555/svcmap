<!-- generated: 2026-04-13T04:00:58.477Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Data Model — spring-petclinic-config-server

## TL;DR for Agents

- **This service has zero database entities, zero DTOs, and zero enums.** It is not a data-bearing service.
- The `config-server` is a **Spring Cloud Config Server** that serves externalized configuration to other microservices in the `spring-petclinic-microservices` ecosystem.
- It does **not** connect to any relational database and defines no JPA/Hibernate entities.
- If you are looking for data models (entities like `Pet`, `Owner`, `Visit`, `Vet`), see the downstream services: `customers-service`, `visits-service`, and `vets-service`.
- This document exists for completeness; **skip it** if your task involves querying, mutating, or modeling domain data.

## Database Entities

This service defines **no database entities**.

The `spring-petclinic-config-server` is an infrastructure service whose sole responsibility is to serve configuration properties (typically from a Git repository or classpath resources) to other microservices via the Spring Cloud Config protocol (`/config-server/{application}/{profile}`). It does not manage any domain or operational data in a database.

| Aspect | Value |
|---|---|
| Entity count | 0 |
| Database connections | None |
| ORM / JPA usage | None |
| Flyway / Liquibase migrations | None |

## Enums

No enums are defined in this service.

## Key Relationships

There are no cross-entity relationships because no entities exist.

For reference, the domain relationships across the broader `spring-petclinic-microservices` system are owned by the following services:

- **`customers-service`** — `Owner` ↔ `Pet` ↔ `PetType`
- **`visits-service`** — `Visit` (references `Pet` by ID, but no FK join across service boundaries)
- **`vets-service`** — `Vet` ↔ `Specialty`

The `config-server` has no participation in any of these relationships.

## DTOs & Transfer Objects

No DTOs or transfer objects are defined in this service.

The only data the config-server exchanges is **configuration payloads** defined by the Spring Cloud Config framework itself (e.g., `Environment`, `PropertySource`), which are framework-internal types — not application-defined DTOs.

## See Also

- [Spring Cloud Config Server documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_spring_cloud_config_server)
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [SCENARIOS.md](SCENARIOS.md) — operational scenarios and configuration delivery patterns
- [DATA_MODEL.md for customers-service](../spring-petclinic-customers-service/DATA_MODEL.md) — the primary domain data model with `Owner`, `Pet`, and `PetType` entities
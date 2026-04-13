<!-- generated: 2026-04-13T04:08:52.478Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Table Map — spring-petclinic-admin-server

## TL;DR for Agents

- **0 tables owned** and **0 tables read from other services** — this service has no direct database interaction.
- The `spring-petclinic-admin-server` is a **Spring Boot Admin dashboard** used for monitoring and managing the other microservices in the petclinic ecosystem.
- It does **not** connect to any database; it operates purely as an administrative/monitoring UI.
- If you are looking for table ownership or database access patterns, this service is **not relevant** to your task.
- For actual data-owning services, see `customers-service`, `vets-service`, or `visits-service`.

## Tables Owned

_None._

The `spring-petclinic-admin-server` does not own or write to any database tables. It functions as a Spring Boot Admin server, providing a web-based UI for monitoring registered microservice instances (health checks, metrics, environment properties, log levels, etc.). All persistence responsibilities belong to the downstream domain services.

## Tables Read From Other Services

| Table | Owning Service | Access Method | Reason |
|-------|---------------|---------------|--------|
| _None_ | — | — | — |

This service does not read from any database tables, either directly or via cross-service calls that resolve to table reads. Its interactions with other services are limited to **actuator endpoint polling** (e.g., `/actuator/health`, `/actuator/info`) over HTTP for monitoring purposes.

## See Also

- [DATABASE_CATALOG.md](DATABASE_CATALOG.md) — Full catalog of all tables across the spring-petclinic-microservices product
- [SCENARIOS.md](SCENARIOS.md) — End-to-end feature scenarios and which services/tables they touch
- [spring-petclinic-admin-server source](https://github.com/spring-petclinic/spring-petclinic-microservices/tree/main/spring-petclinic-admin-server) — Service source code confirming no database dependencies
- [Spring Boot Admin documentation](https://docs.spring-boot-admin.com/) — Upstream project documentation
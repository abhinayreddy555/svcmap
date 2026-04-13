<!-- generated: 2026-04-13T04:01:08.154Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Table Map — spring-petclinic-config-server

## TL;DR for Agents

- **0 tables owned** and **0 tables read from other services** — this service has no database footprint.
- `spring-petclinic-config-server` is a **Spring Cloud Config Server** that serves externalized configuration to other microservices.
- It does **not** connect to any relational database; it reads configuration from a Git repository (or local filesystem).
- If you are investigating a database-related issue, **this document is not relevant** — look at the individual downstream services instead.
- For table ownership across the full product, see [DATABASE_CATALOG.md](DATABASE_CATALOG.md).

## Tables Owned

_None._

The `spring-petclinic-config-server` service does not own or manage any database tables. Its sole responsibility is to serve externalized configuration (typically from a Git-backed repository) to the other microservices in the `spring-petclinic-microservices` ecosystem (`customers-service`, `visits-service`, `vets-service`, etc.).

## Tables Read From Other Services

| Table | Owning Service | Access Method | Reason |
|-------|---------------|---------------|--------|
| _None_ | — | — | — |

This service performs no cross-service database reads. It has no JDBC/JPA dependencies and does not connect to any shared or foreign data store.

## See Also

- [DATABASE_CATALOG.md](DATABASE_CATALOG.md) — Full database catalog for the `spring-petclinic-microservices` product
- [SCENARIOS.md](SCENARIOS.md) — End-to-end scenarios describing how services interact
- [spring-petclinic-config-server source](https://github.com/spring-petclinic/spring-petclinic-microservices/tree/main/spring-petclinic-config-server) — Upstream repository for this service
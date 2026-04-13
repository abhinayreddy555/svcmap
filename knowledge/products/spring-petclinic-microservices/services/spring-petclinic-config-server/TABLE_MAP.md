<!-- generated: 2026-04-13T04:08:02.093Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Table Map — spring-petclinic-config-server

## TL;DR for Agents

- **0 tables owned** and **0 tables read from other services** — this service has no database footprint.
- `spring-petclinic-config-server` is a **Spring Cloud Config Server** that serves externalized configuration to other microservices.
- It does **not** connect to any relational database; it reads configuration from a Git repository (or local filesystem).
- If you are investigating a database-related issue, **this document is not relevant** — look at the individual downstream services instead.
- For table ownership by other services in the product, see [DATABASE_CATALOG.md](DATABASE_CATALOG.md).

## Tables Owned

_None._

The `spring-petclinic-config-server` does not own or manage any database tables. Its sole responsibility is serving externalized configuration (typically from a Git-backed or native filesystem-backed config repository) to other microservices in the `spring-petclinic-microservices` ecosystem via the Spring Cloud Config protocol.

## Tables Read From Other Services

| Table | Owning Service | Access Method | Reason |
|-------|---------------|---------------|--------|
| _None_ | — | — | — |

This service performs **no cross-service database reads**. It has no JDBC datasource configured and does not interact with any relational database directly or indirectly.

## See Also

- [DATABASE_CATALOG.md](DATABASE_CATALOG.md) — Product-wide database catalog for all `spring-petclinic-microservices` services
- [SCENARIOS.md](SCENARIOS.md) — End-to-end scenarios describing how services interact
- [spring-petclinic-customers-service TABLE_MAP.md](../spring-petclinic-customers-service/TABLE_MAP.md) — Table map for the customers service (which does own tables)
- [spring-petclinic-vets-service TABLE_MAP.md](../spring-petclinic-vets-service/TABLE_MAP.md) — Table map for the vets service (which does own tables)
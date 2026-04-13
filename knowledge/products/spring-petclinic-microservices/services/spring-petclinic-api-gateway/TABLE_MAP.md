<!-- generated: 2026-04-13T04:11:06.065Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Table Map — spring-petclinic-api-gateway

## TL;DR for Agents

- **0 tables owned** by this service — it is a pure API gateway / reverse proxy with no direct database access.
- **0 tables read-only** from other services — all data access is delegated to downstream microservices via HTTP/REST calls.
- The API gateway routes requests to `customers-service`, `vets-service`, and `visits-service`, which each own their respective tables.
- If you are looking for table-level details, see the table maps for the downstream services (`customers-service`, `vets-service`, `visits-service`).
- This document is **not relevant** if your task involves direct SQL queries, schema migrations, or table-level access patterns.

## Tables Owned

_None._

The `spring-petclinic-api-gateway` service does not own or directly access any database tables. It functions as a Spring Cloud Gateway (or Zuul-based) reverse proxy that routes incoming HTTP requests to the appropriate backend microservices. All persistence logic resides in the downstream services.

## Tables Read From Other Services

| Table | Owning Service | Access Method | Reason |
|-------|---------------|---------------|--------|
| _None accessed directly_ | — | — | — |

The API gateway does **not** perform direct database reads against any service's tables. Instead, it proxies REST API calls:

| Downstream Service | Typical Route Prefix | Example Entities Served |
|--------------------|---------------------|------------------------|
| `customers-service` | `/api/customer/**` | `owners`, `pets`, `types` |
| `vets-service` | `/api/vet/**` | `vets`, `specialties` |
| `visits-service` | `/api/visit/**` | `visits` |

All data retrieval and mutation flows through HTTP calls to these services, which in turn interact with their own databases.

## See Also

- [DATABASE_CATALOG.md](DATABASE_CATALOG.md) — Full database catalog for the spring-petclinic-microservices product
- [SCENARIOS.md](SCENARIOS.md) — End-to-end scenarios showing how the API gateway orchestrates calls across services
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Source repository with per-service database configurations
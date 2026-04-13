<!-- generated: 2026-04-13T04:15:21.624Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Table Map — spring-petclinic-discovery-server

## TL;DR for Agents

- **0 tables owned** and **0 tables read from other services** — this service has no database footprint.
- The discovery server is a **Netflix Eureka-based service registry**; it handles service registration and discovery only.
- It does **not** connect to any SQL or NoSQL database.
- If you are investigating a database-related issue, this service is **not relevant** to your task.
- For services that do own tables, see the individual table maps for `customers-service`, `visits-service`, or `vets-service`.

## Tables Owned

_None._

The `spring-petclinic-discovery-server` is an infrastructure service that runs a **Spring Cloud Netflix Eureka Server**. Its sole responsibility is to act as a service registry, allowing other microservices in the `spring-petclinic-microservices` ecosystem to register themselves and discover each other. It does not persist any data to a database.

## Tables Read From Other Services

| Table | Owning Service | Access Method | Reason |
|-------|---------------|---------------|--------|
| _None_ | — | — | — |

This service makes no direct or indirect reads against any database tables owned by other services. All inter-service awareness is handled through the Eureka registry protocol (HTTP-based heartbeats and registration calls), not through shared database access.

## See Also

- [DATABASE_CATALOG.md](DATABASE_CATALOG.md) — Product-wide database catalog for all spring-petclinic-microservices
- [SCENARIOS.md](SCENARIOS.md) — Common operational scenarios and troubleshooting guides
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Source repository
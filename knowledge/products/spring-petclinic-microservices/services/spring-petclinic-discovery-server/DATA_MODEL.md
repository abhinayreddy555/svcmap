<!-- generated: 2026-04-13T04:15:11.356Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Data Model — spring-petclinic-discovery-server

## TL;DR for Agents

- **This service has zero database entities, zero DTOs, and zero enums** — it is a pure infrastructure service.
- The discovery server is a **Netflix Eureka Server** used for service registration and discovery within the spring-petclinic-microservices ecosystem.
- It does **not own any persistent data model**; all registry data is held in-memory by Eureka.
- If you are looking for domain entities (owners, pets, vets, visits), see the individual domain services: `customers-service`, `vets-service`, and `visits-service`.
- This document exists for completeness; **skip it if your task involves querying, mutating, or modeling business data**.

## Database Entities

This service does not define any database entities. The `spring-petclinic-discovery-server` is a Spring Cloud Netflix Eureka Server whose sole responsibility is to maintain an **in-memory service registry**. Microservice instances register themselves on startup and send periodic heartbeats; this state is never persisted to a relational database.

| Aspect | Detail |
|---|---|
| Database engine | None |
| Schema / tables | None |
| JPA entities | 0 |
| Flyway / Liquibase migrations | None |

> **Why no persistence?** Eureka is designed for ephemeral, self-healing registration. On restart, services re-register automatically, so durable storage is unnecessary.

## Enums

No enums are defined in this service.

## Key Relationships

There are no cross-entity joins or relationships within this service.

The discovery server's only "relationships" are operational:

- **All microservices → Discovery Server** — every service in the stack (`customers-service`, `vets-service`, `visits-service`, `api-gateway`, etc.) registers with this Eureka instance.
- **API Gateway → Discovery Server** — the gateway resolves downstream service locations via Eureka client lookups.

```
┌──────────────────┐
│  api-gateway      │──registers/discovers──┐
├──────────────────┤                        │
│  customers-service│──registers/discovers──┤
├──────────────────┤                        ▼
│  vets-service     │──registers/discovers──┌─────────────────────┐
├──────────────────┤                        │  discovery-server   │
│  visits-service   │──registers/discovers──│  (Eureka - in-mem)  │
└──────────────────┘                        └─────────────────────┘
```

## DTOs & Transfer Objects

No DTOs or transfer objects are defined in this service. All request/response contracts are provided by the embedded Eureka Server library (e.g., `com.netflix.eureka.resources`) and are not customized in this codebase.

## See Also

- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — parent project with all service modules
- [Spring Cloud Netflix Eureka documentation](https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/) — reference for the discovery server's built-in API and configuration
- [SCENARIOS.md](SCENARIOS.md) — operational scenarios involving service discovery
- [DATA_MODEL.md for customers-service](../spring-petclinic-customers-service/DATA_MODEL.md) — the nearest domain service with actual database entities (Owner, Pet, etc.)
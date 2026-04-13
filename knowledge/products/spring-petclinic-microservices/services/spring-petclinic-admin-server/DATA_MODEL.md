<!-- generated: 2026-04-13T04:08:41.127Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Data Model — spring-petclinic-admin-server

## TL;DR for Agents

- **This service defines zero database entities, zero DTOs, and zero enums** — it has no data model of its own.
- The `spring-petclinic-admin-server` is a **Spring Boot Admin** dashboard for monitoring and managing the other microservices in the spring-petclinic-microservices ecosystem.
- It does **not** connect to any database and does **not** define any domain objects or transfer objects.
- If you are looking for actual Pet Clinic domain entities (e.g., `Pet`, `Owner`, `Visit`, `Vet`), see the individual service data models: `customers-service`, `visits-service`, and `vets-service`.
- This document exists for completeness; **skip it** if your task involves querying, persisting, or transforming business data.

---

## Database Entities

_No database entities are defined in this service._

The `spring-petclinic-admin-server` is an infrastructure/operations service built on [Spring Boot Admin](https://github.com/codecentric/spring-boot-admin). Its sole purpose is to provide a web UI for monitoring registered microservice instances (health, metrics, environment, log levels, etc.). It discovers services via the Eureka discovery server and does not maintain any persistent data store.

---

## Enums

_No enums are defined in this service._

---

## Key Relationships

_No cross-entity relationships exist — this service contains no entities._

For the domain-level entity relationship model of the overall spring-petclinic-microservices product, refer to the data models of:

- **customers-service** — owns `Owner` and `Pet` entities
- **visits-service** — owns `Visit` entity (references `Pet` by ID)
- **vets-service** — owns `Vet` and `Specialty` entities

A simplified cross-service relationship summary:

```
Owner (customers-service)
  └── 1:N ── Pet (customers-service)
                └── 1:N ── Visit (visits-service)  [joined by pet_id]

Vet (vets-service)
  └── N:M ── Specialty (vets-service)
```

---

## DTOs & Transfer Objects

_No DTOs or transfer objects are defined in this service._

---

## See Also

- [Spring Boot Admin Documentation](https://docs.spring-boot-admin.com/)
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [SCENARIOS.md](SCENARIOS.md) — operational and troubleshooting scenarios for this service
- [DATA_MODEL.md for customers-service](../spring-petclinic-customers-service/DATA_MODEL.md) — where the core `Owner` and `Pet` entities are defined
<!-- generated: 2026-04-13T04:11:55.669Z | model: claude-opus-4-6 | sha: 597ad1fb -->



# Business Rules — spring-petclinic-admin-server

## TL;DR for Agents

- **Zero state machines, zero business rules, zero permission models** are defined in this service — it is a pure infrastructure/admin component.
- The admin server is a **Spring Boot Admin** dashboard that monitors other microservices; it contains **no domain logic, no entity state transitions, and no business calculations**.
- The only constraint an agent must not violate: **this service must not be confused with a domain service** — it does not own any pet, owner, vet, or visit data.
- Authentication/authorization for the admin UI is delegated to Spring Boot Admin's defaults and the API gateway; no custom RBAC is implemented in this service.
- If your task involves business logic (pets, owners, visits, vets), this document is **not relevant** — look at the corresponding domain microservice instead.

---

## State Machines

No state machines exist in `spring-petclinic-admin-server`.

This service is a **Spring Boot Admin Server** instance. Its sole responsibility is to aggregate health, metrics, and environment information from registered microservice instances via the Spring Boot Actuator endpoints. It does not manage any domain entities or lifecycle states.

---

## Business Rules

No business rules (validation, business-constraint, state-guard, idempotency, or otherwise) are implemented in this service.

### Rationale

The admin server's codebase consists of:

| File | Purpose |
|---|---|
| `SpringBootAdminApplication.java` | Bootstraps the Spring Boot Admin server (`@EnableAdminServer`) |
| `application.yml` | Configuration for service discovery, port binding, and admin UI settings |

There is no controller, service, or repository layer that enforces domain rules.

### Quick Reference

| Name | Category | Condition | Code Ref |
|---|---|---|---|
| *(none)* | — | — | — |

---

## Permission Matrix

| Resource | Action | Allowed Roles | Additional Conditions | Denial Behavior |
|---|---|---|---|---|
| Admin UI Dashboard | View | Any authenticated user (if security is enabled) | Network access to admin server port | HTTP `401` / `403` depending on configuration |
| Actuator Endpoints (proxied) | Read | Delegated to each microservice's own security | Requires service registration via discovery | Upstream service returns its own denial response |

**Auth Model Summary:** The `spring-petclinic-admin-server` does not implement a custom authentication or authorization layer. In the default configuration of the spring-petclinic-microservices project, the admin server relies on:

1. **Network-level access control** — the admin UI is typically exposed on an internal port (default `9090`).
2. **Spring Boot Admin's optional security module** — not enabled by default in this project.
3. **Downstream actuator security** — each monitored microservice controls access to its own `/actuator` endpoints independently.

No JWT, RBAC, ABAC, or ownership-based permission model is present in this service.

---

## Calculations & Formulas

No calculations or formulas are implemented in this service.

---

## What an Agent Must Know

- **This service has no domain logic.** Do not add business rules, entity validation, or state transitions here. It is an operational monitoring tool only.
- **Do not expose sensitive actuator data without security.** If modifying this service, ensure that the admin dashboard does not leak credentials, environment variables, or heap dumps to unauthorized users.
- **Service discovery is the critical dependency.** The admin server discovers other services via Eureka (or the configured discovery client). If discovery is misconfigured, the dashboard will show zero instances — this is an infrastructure issue, not a business rule violation.
- **Port conflict risk:** The admin server defaults to port `9090`. An agent generating deployment configurations must ensure this port does not collide with other services.
- **No database or persistent state.** This service does not connect to a database. Any agent task involving data persistence is targeting the wrong service.
- **Health status aggregation is read-only.** The admin server reads health/metrics from downstream services but never writes to them or mutates their state.
- **Configuration changes here affect monitoring, not business behavior.** Changing `application.yml` in this service will not alter how pets, visits, or owners are processed.

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — for end-to-end scenarios where the admin server's monitoring role is exercised
- [ERRORS.md](ERRORS.md) — for error codes surfaced by the admin server (primarily infrastructure/connectivity errors)
- [DATA_MODEL.md](DATA_MODEL.md) — for entity field definitions (owned by domain services, not this service)
- [Spring Boot Admin Reference Docs](https://docs.spring-boot-admin.com/) — upstream documentation for the framework this service is built on
<!-- generated: 2026-04-13T04:11:02.285Z | model: claude-opus-4-6 | sha: 597ad1fb -->



# Business Rules — spring-petclinic-config-server

## TL;DR for Agents

- **Zero state machines, zero business rules, zero permission matrices** — this service is a pure infrastructure component with no domain logic.
- The config server's sole purpose is to serve externalized configuration to other microservices via Spring Cloud Config.
- There are **no entity state transitions, no domain validations, and no role-based permissions** enforced at this layer.
- The most critical constraint: the config server must be available and correctly pointing to the configuration repository before any other microservice starts.
- If you are looking for pet, owner, visit, or vet business rules, this is **not** the relevant document — check the corresponding domain services.

## State Machines

No state machines exist in the `spring-petclinic-config-server`. This service does not manage any domain entities. It functions exclusively as a **Spring Cloud Config Server**, serving configuration properties to downstream microservices (`customers-service`, `visits-service`, `vets-service`, `api-gateway`).

## Business Rules

### Infrastructure Configuration Rules

This service contains no domain-level business rules. The only behavioral constraints are infrastructure-level concerns inherent to Spring Cloud Config Server:

| Category | Condition | Outcome | Error Code | Code Ref |
|---|---|---|---|---|
| infrastructure | Config repository is reachable | Configuration properties are served to clients | N/A | `src/main/resources/application.yml` |
| infrastructure | Config repository is unreachable | Downstream services fail to start or fall back to local defaults | N/A | `src/main/resources/application.yml` |
| infrastructure | Config server is not running | Client microservices cannot fetch remote configuration | N/A | `bootstrap.yml` in client services |

### Quick Reference

| Name | Category | Condition | Code Ref |
|---|---|---|---|
| Config repo availability | infrastructure | Git/native backend must be accessible | `application.yml` |
| Server port binding | infrastructure | Default port `8888` must be available | `application.yml` |
| Config label/profile resolution | infrastructure | Requested profile/label must exist in backend | Spring Cloud Config defaults |

## Permission Matrix

| Resource | Action | Allowed Roles | Additional Conditions | Denial Behavior |
|---|---|---|---|---|
| `/{application}/{profile}` | GET | Any service with network access | None enforced by default | Connection refused if server is down |
| `/{application}/{profile}/{label}` | GET | Any service with network access | None enforced by default | 404 if label/profile not found |
| `/encrypt` | POST | Any service with network access | Encryption key must be configured | 404 or 500 if encryption not set up |
| `/decrypt` | POST | Any service with network access | Encryption key must be configured | 404 or 500 if encryption not set up |

**Auth Model:** The default deployment of `spring-petclinic-config-server` does **not** enforce authentication or authorization. Any service (or client) with network access to port `8888` can retrieve configuration. In production, this should be secured via Spring Security (HTTP Basic or mutual TLS), network policies, or service mesh controls. The current codebase relies on **implicit trust within the internal network**.

## Calculations & Formulas

No calculations or formulas exist in this service. It performs no data transformations, pricing logic, or derived computations.

## What an Agent Must Know

- **This service has no domain logic.** Do not look here for pet, owner, visit, or vet business rules.
- **The config server must start before all other microservices.** It is a bootstrap dependency — if it is unavailable, downstream services may fail to start or operate with stale/missing configuration.
- **Default port is `8888`.** Changing this requires updating `bootstrap.yml` (or equivalent) in every client microservice.
- **No authentication is enforced by default.** Any code generation that exposes this service externally must add security controls.
- **Configuration changes in the backend repository are not automatically pushed** to running clients unless Spring Cloud Bus or `/actuator/refresh` is invoked.
- **The `@EnableConfigServer` annotation on the main application class** is the only meaningful code in this service — do not remove or refactor it without understanding the downstream impact.
- **Profile and label resolution follows Spring Cloud Config conventions** — `{application}` maps to `spring.application.name` in client services, `{profile}` maps to active Spring profiles, and `{label}` maps to Git branches or tags.

## See Also

- [SCENARIOS.md](SCENARIOS.md) — for integration scenarios where config server availability is exercised
- [ERRORS.md](ERRORS.md) — for error codes returned when configuration cannot be resolved
- [DATA_MODEL.md](DATA_MODEL.md) — for entity field definitions in domain services that consume this configuration
- [Spring Cloud Config Server Documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/) — upstream reference for config server behavior
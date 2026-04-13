<!-- generated: 2026-04-13T04:14:43.080Z | model: claude-opus-4-6 | sha: 597ad1fb -->



# Business Rules — spring-petclinic-api-gateway

## TL;DR for Agents

- **Zero state machines, zero explicit business rules, zero permission matrices** are defined in this service — it is a routing/gateway layer, not a domain service.
- The API Gateway's primary responsibility is **request routing and aggregation** — it proxies calls to downstream microservices (`customers-service`, `visits-service`, `vets-service`) that own the actual business logic.
- There is **no authorization/permission enforcement** at the gateway level; any auth constraints live in downstream services or in Spring Cloud Gateway filters.
- The most critical constraint: **do not implement domain-level validation or state management in this service** — it must remain a thin routing layer.
- If your task involves business rules for pets, owners, visits, or vets, this document is **not relevant** — look at the downstream service documentation instead.

---

## State Machines

No state machines exist in the `spring-petclinic-api-gateway` service.

This service acts as a reverse proxy / API gateway using Spring Cloud Gateway. All domain entities (Owner, Pet, Visit, Vet) and their lifecycle states are managed by downstream microservices:

| Entity | Owning Service | Gateway Role |
|--------|---------------|--------------|
| Owner | `customers-service` | Proxies CRUD requests |
| Pet | `customers-service` | Proxies CRUD requests |
| Visit | `visits-service` | Proxies CRUD requests; aggregates with pet/owner data |
| Vet | `vets-service` | Proxies read requests |

> **Agent guidance:** If you are looking for state transitions on any of these entities, consult the business rules documentation for the respective downstream service.

---

## Business Rules

### Gateway Routing Rules

The API Gateway defines route mappings that determine how inbound HTTP requests are forwarded to backend microservices. These are infrastructure-level rules, not domain business rules.

| Category | Condition | Outcome | Error Code | Code Ref |
|----------|-----------|---------|------------|----------|
| routing | Request path matches `/api/customer/**` | Forward to `customers-service` | `503` if service unavailable | `spring-cloud-gateway` route config |
| routing | Request path matches `/api/visit/**` | Forward to `visits-service` | `503` if service unavailable | `spring-cloud-gateway` route config |
| routing | Request path matches `/api/vet/**` | Forward to `vets-service` | `503` if service unavailable | `spring-cloud-gateway` route config |
| aggregation | Client requests owner details with visits | Gateway aggregates responses from `customers-service` and `visits-service` | Partial failure returns incomplete data | `ApiGatewayController.java` |

### Data Aggregation Rule

#### OwnerDetails Aggregation

| Category | Condition | Outcome | Error Code | Code Ref |
|----------|-----------|---------|------------|----------|
| business-constraint | Client requests full owner detail view | Gateway fetches owner+pets from `customers-service`, then fetches visits from `visits-service`, and merges results | N/A — degraded response on partial failure | `ApiGatewayController.java` |

### Quick Reference

| Name | Category | Condition | Code Ref |
|------|----------|-----------|----------|
| Route to customers-service | routing | Path prefix `/api/customer/**` | Gateway route config |
| Route to visits-service | routing | Path prefix `/api/visit/**` | Gateway route config |
| Route to vets-service | routing | Path prefix `/api/vet/**` | Gateway route config |
| OwnerDetails aggregation | aggregation | GET owner details endpoint | `ApiGatewayController.java` |

---

## Permission Matrix

| Resource | Action | Allowed Roles | Additional Conditions | Denial Behavior |
|----------|--------|---------------|----------------------|-----------------|
| All gateway routes | Any HTTP method | **Unauthenticated / All** | None enforced at gateway | N/A — no denial |

**Auth Model Summary:**
The `spring-petclinic-api-gateway` does **not** implement authentication or authorization. There is no JWT validation, no RBAC, no ABAC, and no ownership-based access control at this layer. The default configuration exposes all proxied routes without restriction. If security is required, it must be implemented either:

1. As a Spring Cloud Gateway filter (e.g., `TokenRelay`, custom `GatewayFilter`), or
2. Within each downstream microservice.

> **Agent guidance:** Do not assume any request reaching a downstream service has been authenticated or authorized by the gateway.

---

## Calculations & Formulas

No domain calculations or formulas exist in this service.

The gateway performs only **data aggregation** (joining responses from multiple services), not computation. All business calculations (e.g., visit scheduling, billing if any) belong to downstream services.

---

## What an Agent Must Know

- **This service contains no domain business logic.** If your task involves validating pet types, enforcing visit constraints, or checking owner data integrity, you are in the wrong service.
- **Do not add business validation here.** The gateway must remain a thin routing and aggregation layer. Adding domain rules here creates dual-ownership of logic and divergence risk.
- **The aggregation controller is the only non-trivial code.** `ApiGatewayController` joins owner/pet data with visit data. If you modify it, ensure partial failures from one downstream service do not break the entire response.
- **Service discovery is critical.** The gateway resolves downstream service locations via service discovery (Eureka/Consul). A misconfigured service name in route definitions will cause `503 Service Unavailable` errors — not business-rule violations.
- **No auth is enforced.** Any code generated that touches this gateway must not assume requests are authenticated. If you need to protect an endpoint, implement it explicitly.
- **Circuit breaker / resilience patterns may apply.** If the gateway uses Resilience4j or Hystrix fallbacks, ensure fallback responses are distinguishable from real responses so downstream agents/clients don't treat degraded data as authoritative.
- **CORS and header propagation matter.** The gateway may strip or modify headers. If a downstream service relies on specific headers (e.g., `X-Forwarded-For`, auth tokens), verify the gateway forwards them.

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — End-to-end scenarios exercising gateway routing and aggregation
- [ERRORS.md](ERRORS.md) — Error codes and failure modes for gateway-level issues (timeouts, service unavailable)
- [DATA_MODEL.md](DATA_MODEL.md) — Entity field definitions for aggregated DTOs used in gateway responses
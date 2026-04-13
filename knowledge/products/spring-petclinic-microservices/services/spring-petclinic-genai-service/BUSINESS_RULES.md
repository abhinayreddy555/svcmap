<!-- generated: 2026-04-13T04:26:27.053Z | model: claude-opus-4-6 | sha: 597ad1fb -->



# Business Rules — spring-petclinic-genai-service

## TL;DR for Agents

- **No formal state machines, business rules, permission models, or calculations were extracted** from this service — it is a lightweight GenAI integration layer within the Spring PetClinic microservices ecosystem.
- The service has **zero detected state transitions**, meaning there are no entity lifecycle constraints to enforce.
- There is **no role-based or ownership-based permission model** detected; access control is likely delegated to the API gateway or other upstream services.
- The most critical constraint an agent must not violate: **do not assume this service owns any domain entities or enforces authorization** — it acts as an AI-augmented facade over other PetClinic services.
- If your task involves state management, CRUD permissions, or domain validation, this document is **not relevant** — look at the owning microservice (e.g., `customers-service`, `visits-service`).

---

## State Machines

No state machines were detected in `spring-petclinic-genai-service`.

This service does not manage entity lifecycle states. It functions as an AI/GenAI integration layer that likely consumes data from other PetClinic microservices (e.g., `customers-service`, `vets-service`, `visits-service`) and augments responses with generative AI capabilities.

> **Agent note:** If you are looking for state machines related to `Pet`, `Owner`, or `Visit` entities, check the business rules documentation for the respective owning microservice.

---

## Business Rules

### Overview

No formal business rules (validation, business-constraint, state-guard, or idempotency rules) were extracted from this service's codebase.

This is consistent with the service's role as a GenAI integration layer — it delegates domain logic to downstream microservices and focuses on AI prompt orchestration, response formatting, or similar concerns.

### Quick Reference

| Name | Category | Condition | Code Ref |
|------|----------|-----------|----------|
| *(none detected)* | — | — | — |

---

## Permission Matrix

| Resource | Action | Allowed Roles | Additional Conditions | Denial Behavior |
|----------|--------|---------------|----------------------|-----------------|
| *(none detected)* | — | — | — | — |

**Auth Model Summary:**
No authentication or authorization logic was detected within `spring-petclinic-genai-service`. In the Spring PetClinic microservices architecture, access control is typically enforced at the **API Gateway** level (e.g., `spring-cloud-gateway`) or within individual domain services. The GenAI service likely inherits the caller's security context via propagated headers or tokens but does not independently enforce permissions.

If you are implementing a feature that requires permission checks, verify the auth model at the gateway layer or in the target domain service.

---

## Calculations & Formulas

No calculations or formulas were detected in this service.

---

## What an Agent Must Know

- **This service owns no domain entities.** Do not generate code that creates, updates, or deletes `Pet`, `Owner`, `Visit`, or `Vet` records directly in this service.
- **There are no state transitions to guard.** If your task involves lifecycle management (e.g., appointment scheduling, pet registration), you are in the wrong service.
- **No permission checks exist here.** Do not assume this service validates authorization — any security enforcement must happen upstream (API gateway) or in the domain microservice being called.
- **Downstream service contracts matter.** When modifying this service, ensure that any calls to `customers-service`, `vets-service`, or `visits-service` respect *their* business rules and validation constraints.
- **AI/LLM integration is the core concern.** Bugs in this service are most likely related to prompt construction, response parsing, API key management, or timeout/retry logic for external AI provider calls.
- **Idempotency is not enforced.** If the GenAI service triggers side effects in downstream services, the agent must ensure idempotency is handled at the call site or by the downstream service.
- **Configuration and secrets are critical.** AI provider API keys, model parameters, and endpoint URLs are likely externalized — do not hardcode them, and verify they are loaded from the correct Spring Cloud Config or environment source.

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — For end-to-end scenarios where GenAI service behavior is exercised
- [ERRORS.md](ERRORS.md) — For error codes and failure modes relevant to this service
- [DATA_MODEL.md](DATA_MODEL.md) — For entity field definitions owned by upstream domain services
- [Spring PetClinic Microservices Repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Root repository with architecture overview and service interaction diagrams
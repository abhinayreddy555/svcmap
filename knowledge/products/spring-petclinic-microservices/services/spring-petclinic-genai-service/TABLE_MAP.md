<!-- generated: 2026-04-13T04:21:59.068Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Table Map — spring-petclinic-genai-service

## TL;DR for Agents

- **0 tables owned** and **0 tables read-only** by this service based on extracted data.
- The `spring-petclinic-genai-service` is an AI/LLM integration layer that does **not directly interact with database tables**.
- This service likely communicates with other microservices (e.g., `vets-service`, `visits-service`, `customers-service`) via **REST/HTTP APIs** rather than direct DB access.
- If you are looking for table ownership, check the upstream data services: `customers-service`, `vets-service`, or `visits-service`.
- No table extraction data was provided (`undefined`), confirming this service has no direct table dependencies.

## Tables Owned

_No tables are owned by `spring-petclinic-genai-service`._

This service acts as an AI-powered facade/integration layer within the `spring-petclinic-microservices` ecosystem. It consumes data from other services via their APIs and uses LLM capabilities (e.g., Spring AI) to generate responses. It does not manage its own persistent relational data.

## Tables Read From Other Services

| Table | Owning Service | Access Method | Reason |
|-------|---------------|---------------|--------|
| _None directly_ | — | — | — |

> **Note:** While no direct table reads were detected, `spring-petclinic-genai-service` almost certainly consumes data indirectly from the following services via REST API calls through the API Gateway or service discovery:

| Data Domain | Likely Source Service | Probable Access Method | Reason |
|---|---|---|---|
| Vet information | `vets-service` | REST API via Gateway / Eureka | Provide AI-generated summaries or recommendations about veterinarians |
| Pet/Owner information | `customers-service` | REST API via Gateway / Eureka | Contextualize AI responses with pet and owner data |
| Visit history | `visits-service` | REST API via Gateway / Eureka | Feed visit history into LLM prompts for intelligent responses |

These indirect data flows do **not** constitute direct table access and are therefore not mapped as table dependencies.

## See Also

- [DATABASE_CATALOG.md](DATABASE_CATALOG.md) — Full database catalog for `spring-petclinic-microservices`
- [SCENARIOS.md](SCENARIOS.md) — Feature and scenario mapping across services
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Source repository
- [Spring AI Documentation](https://docs.spring.io/spring-ai/reference/) — Framework likely powering this service's LLM integration
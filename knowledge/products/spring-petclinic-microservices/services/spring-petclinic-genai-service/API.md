<!-- generated: 2026-04-13T04:19:04.113Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# API Reference — spring-petclinic-genai-service

## TL;DR for Agents

- **Zero explicitly defined REST endpoints, events, or gRPC services** were extracted from the contract data for this service.
- This service is part of the `spring-petclinic-microservices` ecosystem and likely provides GenAI-powered functionality (e.g., chat, recommendations) but its API contracts are not formally captured in the extracted data.
- **No authentication mechanism** is documented in the extracted contracts.
- If you are looking for core Pet Clinic CRUD endpoints (owners, pets, visits, vets), this is **not** the right document — check the `customers-service`, `visits-service`, or `vets-service` API docs instead.
- The base URL is not specified; the service likely registers with a Spring Cloud discovery server (Eureka) and is accessed via the API Gateway.

## Authentication

No authentication mechanism was identified in the extracted API contracts for this service.

In the broader `spring-petclinic-microservices` architecture, services typically communicate internally without token-based auth, relying on network-level isolation and the API Gateway for external access control. Consult the gateway configuration for any auth requirements imposed at the edge.

## Base URL

No base URL was explicitly defined in the extracted contracts. The service likely registers with Eureka and is routed through the Spring Cloud Gateway.

| Environment | Base URL | Notes |
|---|---|---|
| Local (direct) | `http://localhost:{port}` | Port defined in `application.yml` or assigned dynamically |
| Local (via gateway) | `http://localhost:8080/api/genai/**` | Assumed gateway route — verify in gateway config |
| Discovery (Eureka) | Resolved via service name `genai-service` | Used for inter-service communication |

> **Note:** Verify the actual port and gateway route prefix in the repository's configuration files (`application.yml`, `bootstrap.yml`, or gateway route definitions).

## Endpoints

**No endpoints were extracted from the API contract data.**

This service (`spring-petclinic-genai-service`) likely exposes GenAI-related endpoints (e.g., for chat completions, veterinarian recommendations, or natural-language queries about pet clinic data), but these were not captured in the structured contract extraction. Possible reasons include:

- Endpoints may be defined dynamically or via Spring AI / LangChain4j abstractions not picked up by static analysis.
- The service may use WebSocket or streaming protocols rather than traditional REST.
- The contract extraction tooling may not have covered this service's source files.

To discover actual endpoints, inspect:

```
src/main/java/**/controller/**
src/main/java/**/web/**
```

Or run the service and query the actuator:

```bash
curl http://localhost:{port}/actuator/mappings
```

## Events

No published or subscribed events were identified in the extracted contracts.

If this service integrates with other Pet Clinic microservices for data (owners, pets, vets), it may do so via synchronous REST/Feign calls to those services rather than asynchronous messaging.

## See Also

- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Parent repository with all microservices and gateway configuration
- [Spring AI Documentation](https://docs.spring.io/spring-ai/reference/) — Likely framework used by this GenAI service
- [SCENARIOS.md](SCENARIOS.md) — Integration and usage scenarios for this service
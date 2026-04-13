```markdown
# svcmap Knowledge Base — Index

> For agents: Start here. Navigate directly to the document that matches your query.

---

## Products

### spring-petclinic-microservices

Test product for pet clinic — a microservices-based decomposition of the classic Spring PetClinic application.

#### Services

| Service | Type | Stack | Read this when… |
|---------|------|-------|-----------------|
| [spring-petclinic-admin-server](products/spring-petclinic-microservices/services/spring-petclinic-admin-server/) | `service` | `spring-petclinic`, `spring-petclinic-microservices` | You need to understand the Spring Boot Admin monitoring/management dashboard. |
| [spring-petclinic-api-gateway](products/spring-petclinic-microservices/services/spring-petclinic-api-gateway/) | `service` | `spring-petclinic`, `spring-petclinic-microservices` | You need to understand how external requests are routed to internal microservices. |
| [spring-petclinic-config-server](products/spring-petclinic-microservices/services/spring-petclinic-config-server/) | `service` | `spring-petclinic`, `spring-petclinic-microservices` | You need to understand centralized configuration management across services. |
| [spring-petclinic-customers-service](products/spring-petclinic-microservices/services/spring-petclinic-customers-service/) | `service` | `spring-petclinic`, `spring-petclinic-microservices` | You need to understand how pet owners and their pets are stored and managed. |
| [spring-petclinic-discovery-server](products/spring-petclinic-microservices/services/spring-petclinic-discovery-server/) | `service` | `spring-petclinic`, `spring-petclinic-microservices` | You need to understand service registration and discovery (Eureka). |
| [spring-petclinic-genai-service](products/spring-petclinic-microservices/services/spring-petclinic-genai-service/) | `service` | `spring-petclinic`, `spring-petclinic-microservices` | You need to understand the generative AI integration layer. |
| [spring-petclinic-vets-service](products/spring-petclinic-microservices/services/spring-petclinic-vets-service/) | `service` | `spring-petclinic`, `spring-petclinic-microservices` | You need to understand how veterinarian data and specialties are managed. |
| [spring-petclinic-visits-service](products/spring-petclinic-microservices/services/spring-petclinic-visits-service/) | `service` | `spring-petclinic`, `spring-petclinic-microservices` | You need to understand how vet visit records are created and queried. |

#### Product-Level Documents

| Document | Read this when… |
|----------|-----------------|
| [PRODUCT.md](products/spring-petclinic-microservices/PRODUCT.md) | You need a high-level overview of the product, its purpose, and architecture. |
| [DATA_FLOW.md](products/spring-petclinic-microservices/DATA_FLOW.md) | You need to trace how data moves between services end-to-end. |
| [API_SURFACE.md](products/spring-petclinic-microservices/API_SURFACE.md) | You need a consolidated view of all exposed and internal API endpoints. |
| [DEPENDENCIES.md](products/spring-petclinic-microservices/DEPENDENCIES.md) | You need to understand inter-service dependencies or third-party library usage. |
| [DATABASE_CATALOG.md](products/spring-petclinic-microservices/DATABASE_CATALOG.md) | You need to inspect database schemas, tables, or data ownership per service. |
| [CODING_STANDARDS.md](products/spring-petclinic-microservices/CODING_STANDARDS.md) | You need to understand conventions, patterns, or style guidelines for contributing. |

---

## Quick Reference

Cross-cutting lookups for common questions:

| Topic | Document | Use when… |
|-------|----------|-----------|
| System architecture overview | [PRODUCT.md](products/spring-petclinic-microservices/PRODUCT.md) | You need the big picture of how all services fit together. |
| Request routing & ingress | [spring-petclinic-api-gateway](products/spring-petclinic-microservices/services/spring-petclinic-api-gateway/) | You're debugging how a client request reaches a backend service. |
| Service discovery | [spring-petclinic-discovery-server](products/spring-petclinic-microservices/services/spring-petclinic-discovery-server/) | A service can't find or register with another service. |
| Configuration management | [spring-petclinic-config-server](products/spring-petclinic-microservices/services/spring-petclinic-config-server/) | You need to change or understand runtime configuration. |
| Database schemas & ownership | [DATABASE_CATALOG.md](products/spring-petclinic-microservices/DATABASE_CATALOG.md) | You need to know which service owns which tables. |
| All API endpoints | [API_SURFACE.md](products/spring-petclinic-microservices/API_SURFACE.md) | You need to find or verify an endpoint path, method, or contract. |
| Data flow & integration | [DATA_FLOW.md](products/spring-petclinic-microservices/DATA_FLOW.md) | You're tracing a transaction or event across multiple services. |
| Inter-service dependencies | [DEPENDENCIES.md](products/spring-petclinic-microservices/DEPENDENCIES.md) | You need to assess the blast radius of a change or outage. |
| Coding conventions | [CODING_STANDARDS.md](products/spring-petclinic-microservices/CODING_STANDARDS.md) | You're contributing code and need to follow project standards. |

---

## Meta

| Field | Value |
|-------|-------|
| **Last generated** | 2026-04-13T04:31:19.064Z |

### How to regenerate this index

Run the svcmap index generator against the current product/service manifest:

```bash
svcmap generate-index --output INDEX.md
```

### How to add a new service

1. Add the service definition to the product manifest (name, type, stack, purpose, docsPath).
2. Create the service documentation directory under the appropriate `products/<product>/services/<service>/` path.
3. Populate service-level docs (README, API specs, runbook, etc.).
4. Regenerate this index using the command above.
```
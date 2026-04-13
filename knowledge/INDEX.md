```markdown
# svcmap Knowledge Base — Index

> For agents: Start here. Navigate directly to the document that matches your query.

---

## Products

### petclinic

Microservices to learn how Spring works across services.

#### Services

| Service | Type | Stack | Read this when… |
|---------|------|-------|-----------------|
| [spring-petclinic-microservices](products/micro-ervices-to-learn-spring/services/spring-petclinic-microservices/README.md) | `service` | `spring-petclinic/spring-petclinic-microservices` | You need to understand the core microservices architecture, endpoints, or runtime behavior of the Pet Clinic application. |

#### Product-Level Docs

| Document | Link | Read this when… |
|----------|------|-----------------|
| Product Overview | [PRODUCT.md](products/micro-ervices-to-learn-spring/PRODUCT.md) | You need a high-level summary of what petclinic is, its purpose, and its service inventory. |
| Data Flow | [DATA_FLOW.md](products/micro-ervices-to-learn-spring/DATA_FLOW.md) | You need to trace how data moves between services, including async and sync paths. |
| API Surface | [API_SURFACE.md](products/micro-ervices-to-learn-spring/API_SURFACE.md) | You need a consolidated view of all exposed APIs, routes, and contracts. |
| Dependencies | [DEPENDENCIES.md](products/micro-ervices-to-learn-spring/DEPENDENCIES.md) | You need to audit third-party libraries, shared modules, or inter-service dependencies. |
| Database Catalog | [DATABASE_CATALOG.md](products/micro-ervices-to-learn-spring/DATABASE_CATALOG.md) | You need to look up schemas, tables, migrations, or data ownership per service. |
| Coding Standards | [CODING_STANDARDS.md](products/micro-ervices-to-learn-spring/CODING_STANDARDS.md) | You need to check conventions, patterns, or style guidelines enforced across this product. |

---

## Quick Reference

| Topic | Document | Use when… |
|-------|----------|-----------|
| Full service inventory | [PRODUCT.md](products/micro-ervices-to-learn-spring/PRODUCT.md) | You need to list all services or understand product scope. |
| API endpoints & contracts | [API_SURFACE.md](products/micro-ervices-to-learn-spring/API_SURFACE.md) | You are integrating with or debugging a specific endpoint. |
| Data flow & messaging | [DATA_FLOW.md](products/micro-ervices-to-learn-spring/DATA_FLOW.md) | You are diagnosing data propagation, event flow, or consistency issues. |
| Database schemas & ownership | [DATABASE_CATALOG.md](products/micro-ervices-to-learn-spring/DATABASE_CATALOG.md) | You need to find which service owns a table or understand a schema. |
| Library & service dependencies | [DEPENDENCIES.md](products/micro-ervices-to-learn-spring/DEPENDENCIES.md) | You are upgrading a dependency or assessing blast radius of a change. |
| Code style & conventions | [CODING_STANDARDS.md](products/micro-ervices-to-learn-spring/CODING_STANDARDS.md) | You are writing or reviewing code and need to follow project standards. |

---

## Meta

- **Last generated:** 2026-04-12T18:25:58.626Z
- **How to regenerate:** Run the svcmap index generator against the current product/service registry. This will re-scan all `docsPath` entries and rebuild `INDEX.md`.
- **How to add a new service:** Add the service definition to the product's `services` array in the registry, ensure its `docsPath` directory contains a `README.md`, then regenerate this index.
```
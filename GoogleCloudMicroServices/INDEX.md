```markdown
# svcmap Knowledge Base — Index

> For agents: Start here. Navigate directly to the document that matches your query.

---

## Products

### GoogleCloudPlatform

Micro-services architecture based on the GoogleCloudPlatform/microservices-demo reference application.

#### Services

| Service | Type | Stack | Read this when… |
|---------|------|-------|-----------------|
| [cartservice](products/ggogle-cloud-platform/services/cartservice/) | `service` | `GoogleCloudPlatform/microservices-demo` | You need to understand how shopping cart state is managed, stored, or retrieved. |
| [checkoutservice](products/ggogle-cloud-platform/services/checkoutservice/) | `service` | `GoogleCloudPlatform/microservices-demo` | You need to understand the order checkout flow, orchestration of payment/shipping/cart, or checkout failure modes. |
| [productcatalogservice](products/ggogle-cloud-platform/services/productcatalogservice/) | `service` | `GoogleCloudPlatform/microservices-demo` | You need to understand how products are listed, searched, or served to other services. |
| [paymentservice](products/ggogle-cloud-platform/services/paymentservice/) | `service` | `GoogleCloudPlatform/microservices-demo` | You need to understand payment processing, charge validation, or payment gateway integration. |
| [recommendationservice](products/ggogle-cloud-platform/services/recommendationservice/) | `service` | `GoogleCloudPlatform/microservices-demo` | You need to understand how product recommendations are generated and served. |

#### Product-Level Documents

| Document | Description |
|----------|-------------|
| [PRODUCT.md](products/ggogle-cloud-platform/PRODUCT.md) | High-level product overview, business context, and architecture summary. |
| [DATA_FLOW.md](products/ggogle-cloud-platform/DATA_FLOW.md) | End-to-end data flow diagrams and descriptions across all services. |
| [API_SURFACE.md](products/ggogle-cloud-platform/API_SURFACE.md) | Consolidated API surface — all exposed endpoints, gRPC methods, and contracts. |
| [DEPENDENCIES.md](products/ggogle-cloud-platform/DEPENDENCIES.md) | Inter-service dependency graph and external dependency inventory. |
| [DATABASE_CATALOG.md](products/ggogle-cloud-platform/DATABASE_CATALOG.md) | All databases, schemas, key data stores, and ownership mapping. |
| [CODING_STANDARDS.md](products/ggogle-cloud-platform/CODING_STANDARDS.md) | Language conventions, repo structure rules, and contribution guidelines. |

---

## Quick Reference

Cross-cutting lookups for common queries.

| Topic | Document | Use when… |
|-------|----------|-----------|
| Full service inventory | [INDEX.md](INDEX.md) (this file) | You need to find which service owns a capability. |
| How data moves through the system | [DATA_FLOW.md](products/ggogle-cloud-platform/DATA_FLOW.md) | You're tracing a request across service boundaries or debugging data inconsistencies. |
| All API contracts in one place | [API_SURFACE.md](products/ggogle-cloud-platform/API_SURFACE.md) | You're integrating with a service or reviewing breaking changes. |
| What depends on what | [DEPENDENCIES.md](products/ggogle-cloud-platform/DEPENDENCIES.md) | You're assessing blast radius of a change or planning a migration. |
| Database schemas & ownership | [DATABASE_CATALOG.md](products/ggogle-cloud-platform/DATABASE_CATALOG.md) | You need to find which service owns a table or understand storage technology choices. |
| Coding conventions | [CODING_STANDARDS.md](products/ggogle-cloud-platform/CODING_STANDARDS.md) | You're writing or reviewing code and need to follow project standards. |
| Product context & architecture | [PRODUCT.md](products/ggogle-cloud-platform/PRODUCT.md) | You're onboarding or need a high-level understanding of the system. |

---

## Meta

| Field | Value |
|-------|-------|
| **Last generated** | 2026-04-13T05:27:24.901Z |

### How to regenerate

Re-run the svcmap index generator against the current product/service manifest:

```bash
svcmap generate-index --output INDEX.md
```

### How to add a new service

1. Create a new service directory under the appropriate product path (e.g., `products/ggogle-cloud-platform/services/<service-name>/`).
2. Add the service entry to the product manifest with `name`, `type`, `stack`, and `purpose` fields.
3. Populate service-level documentation (README, API docs, data model, etc.) inside the new directory.
4. Regenerate this index to include the new service in the routing table.
```
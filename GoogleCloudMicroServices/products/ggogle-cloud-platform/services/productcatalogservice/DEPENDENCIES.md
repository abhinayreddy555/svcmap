<!-- generated: 2026-04-13T05:13:01.236Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Dependencies — productcatalogservice

## TL;DR for Agents

- **productcatalogservice** has **0 outbound service calls**, **1 database** (AlloyDB/PostgreSQL), and **2 third-party Google Cloud integrations**.
- AlloyDB is **conditionally used** — only when the `ALLOYDB_CLUSTER_NAME` environment variable is set; otherwise the service likely falls back to an in-memory or file-based catalog.
- Google Cloud Secret Manager is required at runtime to retrieve the AlloyDB database password when AlloyDB mode is active.
- Google Cloud AlloyDB Connector is used for secure, IAM-based connectivity to the AlloyDB instance (no public IP required).
- This service has **no outbound calls to other microservices**, making it a leaf dependency in the service graph.

## Outbound Calls

| Target | Type | Endpoint / Topic | Purpose | Timeout | Retries | Is External |
|--------|------|-------------------|---------|---------|---------|-------------|
| *(none)* | — | — | — | — | — | — |

> **Note:** productcatalogservice does not make outbound calls to any other microservice in the mesh. It serves as a data-source service only.

## Databases & Storage

| Name | Type | Purpose | Shared / Private |
|------|------|---------|------------------|
| AlloyDB | `postgresql` | Load product catalog from AlloyDB database when `ALLOYDB_CLUSTER_NAME` environment variable is set | Private |

### Conditional Activation

The AlloyDB connection is **only established** when the following environment variable is present:

```
ALLOYDB_CLUSTER_NAME
```

When this variable is **not set**, the service operates without a database dependency (e.g., loading catalog data from an embedded JSON file or in-memory store).

## Third-Party Integrations

| Name | Category | SDK / Package | Purpose |
|------|----------|---------------|---------|
| Google Cloud Secret Manager | Secrets | `cloud.google.com/go/secretmanager` | Retrieve database password for AlloyDB connection |
| Google Cloud AlloyDB Connector | Database | `cloud.google.com/go/alloydbconn` | Establish secure connection to AlloyDB instance via IAM-authenticated dialer |

### Authentication & IAM Requirements

Both integrations rely on Google Cloud Application Default Credentials (ADC). The service account running productcatalogservice must have:

- `secretmanager.versions.access` permission on the relevant secret resource (for Secret Manager).
- `alloydb.instances.connect` permission (for AlloyDB Connector).

## Inbound Calls

| Calling Service | Method / Endpoint | Purpose |
|-----------------|-------------------|---------|
| `frontend` | gRPC `ListProducts`, `GetProduct`, `SearchProducts` | Display product listings, detail pages, and search results |
| `recommendationservice` | gRPC `ListProducts` | Fetch full catalog to compute product recommendations |
| `checkoutservice` | gRPC `GetProduct` | Retrieve product details during order placement |

> **Note:** Inbound callers are populated from the product-level service graph of [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) and may be incomplete. Verify against the latest service mesh configuration or tracing data.

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Failure scenarios and impact analysis for productcatalogservice
- [GoogleCloudPlatform/microservices-demo architecture](https://github.com/GoogleCloudPlatform/microservices-demo#architecture) — Overall service topology and communication patterns
- [AlloyDB Connector for Go documentation](https://github.com/GoogleCloudPlatform/alloydb-go-connector) — SDK reference for the AlloyDB dialer used by this service
- [Google Cloud Secret Manager Go SDK](https://pkg.go.dev/cloud.google.com/go/secretmanager) — Package reference for secret retrieval
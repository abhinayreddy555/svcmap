<!-- generated: 2026-04-13T05:10:13.606Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# API Reference — productcatalogservice

## TL;DR for Agents

- **productcatalogservice** is a gRPC-based microservice in the [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) project; it does **not** expose REST/HTTP endpoints.
- The service is registered under an **unknown/unresolved** gRPC service definition — the protobuf contract is defined in the shared `protos/` directory of the repo (typically `hipstershop.ProductCatalogService`).
- **No authentication mechanism** is configured at the service level; inter-service communication relies on the cluster network (service mesh / Kubernetes internal DNS).
- Expected gRPC methods (based on the canonical demo): `ListProducts`, `GetProduct`, `SearchProducts`.
- If you need REST endpoint details, this service is not the right document — see the **frontend** service or the gRPC-gateway layer.

---

## Authentication

| Property | Value |
|---|---|
| Auth mechanism | **None** (unauthenticated inter-service gRPC) |
| Token format | N/A |
| Notes | The microservices-demo relies on Kubernetes network policies and/or a service mesh (e.g., Istio mTLS) for transport security. No application-level auth tokens are required to call this service. |

---

## Base URL

The service does not define a public base URL. It is accessed via cluster-internal DNS.

| Environment | Address | Notes |
|---|---|---|
| Kubernetes (default) | `productcatalogservice:3550` | Default gRPC port defined in Kubernetes manifests |
| Local / Docker Compose | `localhost:3550` | When running via `docker-compose` or `skaffold dev` |
| External (if exposed) | Depends on ingress/load-balancer config | Not exposed by default |

---

## gRPC Service — `hipstershop.ProductCatalogService`

> **Note:** The automated contract extraction resolved the gRPC service as `"unknown"`. The canonical protobuf definition lives at `pb/demo.proto` (or `protos/demo.proto`) in the repository. The service name is `hipstershop.ProductCatalogService`. The methods below are documented based on the well-known proto definition in this demo.

---

### `ListProducts`

| Field | Value |
|---|---|
| **Full method** | `/hipstershop.ProductCatalogService/ListProducts` |
| **Purpose** | Returns the complete list of products in the catalog. |
| **Auth** | None |

**Request**

```protobuf
message Empty {}
```

No request fields required.

**Response — `ListProductsResponse`**

```protobuf
message ListProductsResponse {
  repeated Product products = 1;
}

message Product {
  string id = 1;
  string name = 2;
  string description = 3;
  string picture = 4;
  Money price_usd = 5;
  repeated string categories = 6;
}
```

| gRPC Status Code | Meaning |
|---|---|
| `OK` (0) | Products returned successfully |
| `INTERNAL` (13) | Server-side failure (e.g., catalog file unreadable) |

---

### `GetProduct`

| Field | Value |
|---|---|
| **Full method** | `/hipstershop.ProductCatalogService/GetProduct` |
| **Purpose** | Returns a single product by its ID. |
| **Auth** | None |

**Request — `GetProductRequest`**

```protobuf
message GetProductRequest {
  string id = 1;
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | The product ID (e.g., `"OLJCESPC7Z"`) |

**Response — `Product`**

```protobuf
message Product {
  string id = 1;
  string name = 2;
  string description = 3;
  string picture = 4;
  Money price_usd = 5;
  repeated string categories = 6;
}
```

| gRPC Status Code | Meaning |
|---|---|
| `OK` (0) | Product returned successfully |
| `NOT_FOUND` (5) | No product matches the given `id` |
| `INVALID_ARGUMENT` (3) | Empty or malformed `id` |

---

### `SearchProducts`

| Field | Value |
|---|---|
| **Full method** | `/hipstershop.ProductCatalogService/SearchProducts` |
| **Purpose** | Searches the catalog by a query string, matching against product name and description. |
| **Auth** | None |

**Request — `SearchProductsRequest`**

```protobuf
message SearchProductsRequest {
  string query = 1;
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `query` | `string` | Yes | Free-text search term |

**Response — `SearchProductsResponse`**

```protobuf
message SearchProductsResponse {
  repeated Product results = 1;
}
```

| gRPC Status Code | Meaning |
|---|---|
| `OK` (0) | Search completed (may return empty `results`) |
| `INTERNAL` (13) | Server-side failure |

---

## Events

The `productcatalogservice` does **not** publish or subscribe to any asynchronous events or message topics. All communication is synchronous gRPC request/response.

---

## See Also

- [GoogleCloudPlatform/microservices-demo repository](https://github.com/GoogleCloudPlatform/microservices-demo) — full source and proto definitions
- [SCENARIOS.md](SCENARIOS.md) — common integration and debugging scenarios for this service
- [proto definition (`demo.proto`)](https://github.com/GoogleCloudPlatform/microservices-demo/blob/main/protos/demo.proto) — canonical Protobuf source of truth
- [Kubernetes manifests](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/kubernetes-manifests) — deployment configuration and port assignments
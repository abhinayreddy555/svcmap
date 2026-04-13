<!-- generated: 2026-04-13T05:20:03.231Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# API Reference — recommendationservice

## TL;DR for Agents

- **No formally extracted API contracts** were found for `recommendationservice` in the structured data; the service is part of the [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) project.
- The recommendation service is a **gRPC-based microservice** (not REST) that typically implements a `ListRecommendations` RPC as defined in the shared protobuf (`demo.proto`).
- **No authentication mechanism** is defined at the application level; service-to-service communication relies on the cluster network / service mesh.
- **Zero REST endpoints** are exposed — all communication uses gRPC on a single port (typically `8080`).
- To understand the actual RPC contract, refer to the canonical protobuf definition in [`pb/demo.proto`](https://github.com/GoogleCloudPlatform/microservices-demo/blob/main/pb/demo.proto).

---

## Authentication

| Aspect | Detail |
|---|---|
| Auth mechanism | **None (application-level)** |
| Notes | The service runs inside a Kubernetes cluster. Access control is typically enforced at the infrastructure layer (e.g., Istio mTLS, network policies). No API keys, JWTs, or OAuth tokens are required by the service itself. |

---

## Base URL

The service does not expose a public HTTP base URL. It listens for gRPC connections inside the cluster.

| Environment | Address | Notes |
|---|---|---|
| Kubernetes (in-cluster) | `recommendationservice:8080` | Default gRPC port defined in Kubernetes manifests |
| Local development | `localhost:8080` | When running the service directly or via `docker-compose` |

> **Note:** The port may vary depending on your deployment configuration. Check `kubernetes-manifests/recommendationservice.yaml` or `docker-compose.yaml` for the authoritative value.

---

## gRPC Service — `hipstershop.RecommendationService`

The recommendation service is defined in the shared protobuf package `hipstershop`. The contract below is reconstructed from the canonical [`demo.proto`](https://github.com/GoogleCloudPlatform/microservices-demo/blob/main/pb/demo.proto) since no contracts were present in the extracted data.

### RPC `ListRecommendations`

| Field | Value |
|---|---|
| **Full method** | `/hipstershop.RecommendationService/ListRecommendations` |
| **Purpose** | Returns a list of recommended product IDs based on the user's context and a set of product IDs already in their cart. |
| **Auth** | None (cluster-internal) |
| **Transport** | gRPC (HTTP/2) |

#### Request — `ListRecommendationsRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | `string` | Yes | Identifier of the user requesting recommendations |
| `product_ids` | `repeated string` | No | Product IDs already in the user's cart (used to filter/avoid re-recommending) |

#### Response — `ListRecommendationsResponse`

| Field | Type | Description |
|---|---|---|
| `product_ids` | `repeated string` | List of recommended product IDs |

#### gRPC Status Codes

| Code | Meaning |
|---|---|
| `OK` (0) | Recommendations returned successfully |
| `UNAVAILABLE` (14) | The product catalog service dependency is unreachable |
| `INTERNAL` (13) | Unexpected server-side error |

#### Example — `grpcurl`

```bash
grpcurl -plaintext \
  -d '{"user_id": "12345", "product_ids": ["OLJCESPC7Z", "66VCHSJNUP"]}' \
  localhost:8080 \
  hipstershop.RecommendationService/ListRecommendations
```

#### Example Response

```json
{
  "product_ids": [
    "1YMWWN1N4O",
    "L9ECAV7KIM",
    "2ZYFJ3GM2N"
  ]
}
```

---

## Events

No pub/sub events or asynchronous messaging contracts were identified for this service. The recommendation service operates in a synchronous request/response model over gRPC and depends on the **productcatalogservice** to fetch the product list.

---

## See Also

- [`demo.proto` — canonical protobuf definitions](https://github.com/GoogleCloudPlatform/microservices-demo/blob/main/pb/demo.proto)
- [microservices-demo architecture overview](https://github.com/GoogleCloudPlatform/microservices-demo#architecture)
- [Kubernetes manifest for recommendationservice](https://github.com/GoogleCloudPlatform/microservices-demo/blob/main/kubernetes-manifests/recommendationservice.yaml)
- [recommendationservice source code](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/src/recommendationservice)
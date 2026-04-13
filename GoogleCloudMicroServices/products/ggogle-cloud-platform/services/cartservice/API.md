<!-- generated: 2026-04-13T05:04:36.440Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# API Reference — cartservice

## TL;DR for Agents

- **cartservice** is a gRPC-based microservice in the [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) project; it manages shopping cart state.
- The service exposes gRPC endpoints (not REST); no HTTP base URL or REST endpoints are documented in the extracted contracts.
- **No authentication mechanism** is defined at the service level — the service relies on cluster-internal networking and service mesh policies.
- The gRPC service definition is not fully resolved in the extracted contracts (`"unknown"`); refer to the proto source file for the canonical contract.
- Typical operations include **AddItem**, **GetCart**, and **EmptyCart** — see the proto definition section below for details.

---

## Authentication

| Property | Value |
|---|---|
| Auth mechanism | **None (cluster-internal)** |
| Token format | N/A |
| API key required | No |

`cartservice` does not implement its own authentication layer. In the microservices-demo architecture, services communicate over gRPC within the Kubernetes cluster. Access control, if any, is enforced at the infrastructure level (e.g., Istio service mesh mTLS, network policies).

---

## Base URL

`cartservice` is deployed as a Kubernetes `ClusterIP` service. There is no public base URL; the service is resolved via internal DNS.

| Environment | Address | Protocol |
|---|---|---|
| Kubernetes (default) | `cartservice:7070` | gRPC (HTTP/2) |
| Local development | `localhost:7070` | gRPC (HTTP/2) |

> **Note:** The port `7070` is the conventional default in the microservices-demo. Verify against your deployment's `kubernetes-manifests/` or `docker-compose` configuration.

---

## gRPC Service Definition

The extracted contract lists the gRPC service as `"unknown"` because the proto file was not fully parsed during extraction. The canonical source of truth is:

```
src/cartservice/protos/demo.proto
```

Based on the [microservices-demo proto definition](https://github.com/GoogleCloudPlatform/microservices-demo/blob/main/protos/demo.proto), the `CartService` exposes the following RPCs:

---

### rpc `AddItem`

| Property | Value |
|---|---|
| **Purpose** | Adds a product (by ID and quantity) to a user's cart |
| **Auth** | None (cluster-internal) |
| **Full method** | `hipstershop.CartService/AddItem` |

**Request — `AddItemRequest`**

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | `string` | Yes | Unique identifier for the user/session |
| `item` | `CartItem` | Yes | The item to add (see below) |

**`CartItem`**

| Field | Type | Description |
|---|---|---|
| `product_id` | `string` | Product identifier |
| `quantity` | `int32` | Number of units to add |

**Response — `Empty`**

Returns an empty message on success.

| gRPC Status Code | Meaning |
|---|---|
| `OK` (0) | Item added successfully |
| `INTERNAL` (13) | Backend storage failure (e.g., Redis unavailable) |
| `INVALID_ARGUMENT` (3) | Missing or malformed fields |

---

### rpc `GetCart`

| Property | Value |
|---|---|
| **Purpose** | Retrieves all items currently in a user's cart |
| **Auth** | None (cluster-internal) |
| **Full method** | `hipstershop.CartService/GetCart` |

**Request — `GetCartRequest`**

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | `string` | Yes | Unique identifier for the user/session |

**Response — `Cart`**

| Field | Type | Description |
|---|---|---|
| `user_id` | `string` | Echo of the requested user ID |
| `items` | `repeated CartItem` | List of items in the cart |

| gRPC Status Code | Meaning |
|---|---|
| `OK` (0) | Cart returned (may be empty `items` list) |
| `INTERNAL` (13) | Backend storage failure |

---

### rpc `EmptyCart`

| Property | Value |
|---|---|
| **Purpose** | Removes all items from a user's cart |
| **Auth** | None (cluster-internal) |
| **Full method** | `hipstershop.CartService/EmptyCart` |

**Request — `EmptyCartRequest`**

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | `string` | Yes | Unique identifier for the user/session |

**Response — `Empty`**

Returns an empty message on success.

| gRPC Status Code | Meaning |
|---|---|
| `OK` (0) | Cart emptied successfully |
| `INTERNAL` (13) | Backend storage failure |

---

## Example — calling with `grpcurl`

```bash
# Get a user's cart
grpcurl -plaintext \
  -d '{"user_id": "abc-123"}' \
  localhost:7070 \
  hipstershop.CartService/GetCart

# Add an item
grpcurl -plaintext \
  -d '{"user_id": "abc-123", "item": {"product_id": "OLJCESPC7Z", "quantity": 2}}' \
  localhost:7070 \
  hipstershop.CartService/AddItem

# Empty the cart
grpcurl -plaintext \
  -d '{"user_id": "abc-123"}' \
  localhost:7070 \
  hipstershop.CartService/EmptyCart
```

---

## Events

No asynchronous events (Pub/Sub topics, message queues) are published or consumed by `cartservice` based on the extracted contracts. Cart state is managed synchronously via gRPC calls backed by Redis (or an in-memory store in development mode).

---

## See Also

- [microservices-demo proto definition (`demo.proto`)](https://github.com/GoogleCloudPlatform/microservices-demo/blob/main/protos/demo.proto) — canonical gRPC contract for all services
- [microservices-demo architecture overview](https://github.com/GoogleCloudPlatform/microservices-demo#architecture) — service topology and data flow
- [cartservice source (`src/cartservice/`)](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/src/cartservice) — implementation details and configuration
- [SCENARIOS.md](SCENARIOS.md) — common integration and debugging scenarios
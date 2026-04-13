<!-- generated: 2026-04-13T05:10:20.695Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# API Reference — CheckoutService

## TL;DR for Agents

- **3 gRPC endpoints** exposed: `PlaceOrder`, `Health/Check`, `Health/Watch`
- **No authentication** required — service relies on internal network trust (service mesh / cluster-internal)
- **`CheckoutService/PlaceOrder`** is the primary endpoint: orchestrates cart retrieval, payment charging, shipping, and order confirmation via email
- Downstream dependencies: cart service, product catalog, currency service, payment service, shipping service, email service
- Part of the [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) reference architecture

## Authentication

| Property | Value |
|---|---|
| Auth mechanism | **None** |
| Token format | N/A |
| Notes | CheckoutService is designed to run as an internal cluster service. Access control is expected to be enforced at the infrastructure level (e.g., Kubernetes network policies, Istio mTLS). No application-level authentication is implemented. |

## Base URL

CheckoutService does not define a fixed base URL. It is deployed as a gRPC server within a Kubernetes cluster and discovered via service name.

| Environment | Address | Notes |
|---|---|---|
| Kubernetes (default) | `checkoutservice:5050` | Cluster-internal DNS; port may vary by deployment config |
| Local development | `localhost:5050` | When running the service directly or via `docker-compose` |

All endpoints use **gRPC** (HTTP/2) — not REST. Use a gRPC client or tool like `grpcurl` to interact with the service.

---

## gRPC `CheckoutService/PlaceOrder`

**Purpose:** Place an order using the items currently in the user's cart. This endpoint orchestrates the full checkout flow: fetching cart items, converting currency, charging the credit card, requesting shipment, sending a confirmation email, and emptying the cart.

**Auth:** None

### Request Body

```protobuf
message PlaceOrderRequest {
  string user_id = 1;
  string user_currency = 2;
  Address address = 3;
  CreditCardInfo credit_card = 4;
  string email = 5;
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | Yes | Unique identifier for the user placing the order |
| `userCurrency` | `string` | Yes | ISO 4217 currency code (e.g., `USD`, `EUR`) for price conversion |
| `address` | `Address` | Yes | Shipping address (street, city, state, country, zip) |
| `creditCard` | `CreditCardInfo` | Yes | Payment card details (number, CVV, expiration month/year) |
| `email` | `string` | Yes | Email address for order confirmation |

### Response — Success

```protobuf
message PlaceOrderResponse {
  OrderResult order = 1;
}
```

`OrderResult` contains the order ID, shipping tracking ID, shipping cost, shipping address, and a list of `OrderItem` entries with their cost.

### Response — Errors

| gRPC Status Code | Condition | Description |
|---|---|---|
| `INTERNAL` | UUID generation failure | Failed to generate a unique order ID |
| `INTERNAL` | Cart / catalog / currency failure | Failed to prepare order items (cart retrieval, product lookup, or currency conversion error) |
| `INTERNAL` | Payment failure | Failed to charge the credit card via the payment service |
| `UNAVAILABLE` | Shipping service error | Shipping service is unreachable or returned an error |

> **Note:** Failures in the email service (order confirmation) are logged but do **not** cause the RPC to fail — the order is still considered placed.

### Example (`grpcurl`)

```bash
grpcurl -plaintext -d '{
  "userId": "user-123",
  "userCurrency": "USD",
  "address": {
    "streetAddress": "1600 Amphitheatre Parkway",
    "city": "Mountain View",
    "state": "CA",
    "country": "US",
    "zipCode": 94043
  },
  "creditCard": {
    "creditCardNumber": "4432-8015-6152-0454",
    "creditCardCvv": 672,
    "creditCardExpirationYear": 2030,
    "creditCardExpirationMonth": 1
  },
  "email": "user@example.com"
}' localhost:5050 hipstershop.CheckoutService/PlaceOrder
```

---

## gRPC `Health/Check`

**Purpose:** Standard gRPC health check. Returns the serving status of the CheckoutService.

**Auth:** None

### Request Body

```protobuf
message HealthCheckRequest {
  // service name (optional; empty string checks overall server health)
}
```

### Response — Success

```protobuf
message HealthCheckResponse {
  ServingStatus status = 1; // SERVING
}
```

| gRPC Status Code | Condition | Description |
|---|---|---|
| `OK` | Service healthy | Returns `status: SERVING` |

### Example (`grpcurl`)

```bash
grpcurl -plaintext localhost:5050 grpc.health.v1.Health/Check
```

---

## gRPC `Health/Watch`

**Purpose:** Stream health status changes. **Not implemented** in this service.

**Auth:** None

### Request Body

```protobuf
message HealthCheckRequest { }
```

### Response — Errors

| gRPC Status Code | Condition | Description |
|---|---|---|
| `UNIMPLEMENTED` | Always | This RPC is registered but not implemented; calling it returns `UNIMPLEMENTED` |

---

## Events

CheckoutService does not publish or subscribe to any asynchronous events (e.g., Pub/Sub, Kafka). All downstream communication is **synchronous gRPC**:

| Downstream Service | Call Purpose |
|---|---|
| CartService | Retrieve user cart items; empty cart after order |
| ProductCatalogService | Look up product details for cart items |
| CurrencyService | Convert item prices to the user's requested currency |
| ShippingService | Get shipping quote; ship the order |
| PaymentService | Charge the user's credit card |
| EmailService | Send order confirmation email |

---

## See Also

- [GoogleCloudPlatform/microservices-demo repository](https://github.com/GoogleCloudPlatform/microservices-demo) — full source and deployment manifests
- [SCENARIOS.md](SCENARIOS.md) — common integration and debugging scenarios for CheckoutService
- [gRPC Health Checking Protocol](https://github.com/grpc/grpc/blob/master/doc/health-checking.md) — specification for `Health/Check` and `Health/Watch`
- [hipstershop.proto](https://github.com/GoogleCloudPlatform/microservices-demo/blob/main/protos/demo.proto) — canonical Protobuf definitions for all service contracts
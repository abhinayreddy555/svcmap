<!-- generated: 2026-04-13T05:14:02.465Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# API Reference — paymentservice

## TL;DR for Agents

- **paymentservice** is a gRPC microservice in the [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) project; it handles payment/charge processing for the demo e-commerce application.
- **No REST/HTTP endpoints are exposed** — all communication is via gRPC (Protocol Buffers).
- **No authentication mechanism** is defined; the service runs inside a trusted cluster mesh (service-to-service calls with no token/auth layer).
- The primary RPC is `Charge` on the `PaymentService` gRPC service, which processes a credit card charge and returns a transaction ID.
- Specific protobuf contract details could not be fully extracted from the repository metadata; refer to the canonical `.proto` file for exact field definitions.

---

## Authentication

| Property | Value |
|---|---|
| Auth mechanism | **None** (internal service-to-service communication) |
| Token format | N/A |
| Notes | The service is designed to run inside a Kubernetes cluster and is called by other internal microservices (e.g., `checkoutservice`). No API keys, JWTs, or mTLS configuration is defined at the application layer. |

---

## Base URL

The service does not expose a public HTTP base URL. It listens on a gRPC port inside the cluster.

| Environment | Address | Notes |
|---|---|---|
| Local (docker-compose) | `paymentservice:50051` | Default gRPC port |
| Kubernetes (in-cluster) | `paymentservice.default.svc.cluster.local:50051` | Cluster DNS; namespace may vary |
| Local development | `localhost:50051` | When running the service directly |

---

## gRPC Service — `hipstershop.PaymentService`

The service is defined in the shared proto file at `protos/demo.proto` in the microservices-demo repository.

### RPC `Charge`

| Property | Detail |
|---|---|
| **Full method name** | `/hipstershop.PaymentService/Charge` |
| **Purpose** | Processes a credit card charge for a given amount and returns a transaction ID. Called by `checkoutservice` during order placement. |
| **Auth** | None |
| **Idempotent** | No (each call is treated as a new charge) |

#### Request — `ChargeRequest`

```protobuf
message ChargeRequest {
  Money amount = 1;
  CreditCardInfo credit_card = 2;
}

message Money {
  string currency_code = 1;  // e.g., "USD"
  int64 units = 2;           // whole units, e.g., 37
  int32 nanos = 3;           // nano units, e.g., 750000000 for $37.75
}

message CreditCardInfo {
  string credit_card_number = 1;
  int32 credit_card_cvv = 2;
  int32 credit_card_expiration_year = 3;
  int32 credit_card_expiration_month = 4;
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `amount.currency_code` | `string` | Yes | ISO 4217 currency code (e.g., `"USD"`) |
| `amount.units` | `int64` | Yes | Whole currency units |
| `amount.nanos` | `int32` | Yes | Fractional units in nanoseconds (0–999,999,999) |
| `credit_card.credit_card_number` | `string` | Yes | Card number (demo; no real validation) |
| `credit_card.credit_card_cvv` | `int32` | Yes | 3- or 4-digit CVV |
| `credit_card.credit_card_expiration_year` | `int32` | Yes | 4-digit expiration year |
| `credit_card.credit_card_expiration_month` | `int32` | Yes | Expiration month (1–12) |

#### Response — `ChargeResponse`

```protobuf
message ChargeResponse {
  string transaction_id = 1;
}
```

| Field | Type | Description |
|---|---|---|
| `transaction_id` | `string` | UUID representing the completed transaction |

#### Errors

| gRPC Status Code | Condition |
|---|---|
| `INVALID_ARGUMENT` | Credit card is expired or required fields are missing/invalid |
| `INTERNAL` | Unexpected server-side failure |
| `UNIMPLEMENTED` | Called an RPC method that does not exist on this service |

#### Example — `grpcurl`

```bash
grpcurl -plaintext \
  -d '{
    "amount": {
      "currency_code": "USD",
      "units": 37,
      "nanos": 750000000
    },
    "credit_card": {
      "credit_card_number": "4432-8015-6152-0454",
      "credit_card_cvv": 672,
      "credit_card_expiration_year": 2030,
      "credit_card_expiration_month": 1
    }
  }' \
  localhost:50051 hipstershop.PaymentService/Charge
```

Expected response:

```json
{
  "transactionId": "a]1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

## Events

The `paymentservice` does **not** publish or subscribe to any message broker topics or event streams. All communication is synchronous gRPC request/response.

---

## See Also

- [microservices-demo repository](https://github.com/GoogleCloudPlatform/microservices-demo) — full source and architecture overview
- [protos/demo.proto](https://github.com/GoogleCloudPlatform/microservices-demo/blob/main/protos/demo.proto) — canonical Protocol Buffer definitions for all services
- [src/paymentservice](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/src/paymentservice) — service implementation source code
- [SCENARIOS.md](SCENARIOS.md) — common integration and debugging scenarios
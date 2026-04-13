<!-- generated: 2026-04-13T05:16:28.759Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Data Model — paymentservice

## TL;DR for Agents

- **Zero database entities** — `paymentservice` is a stateless service with no persistence layer; all data lives in request/response DTOs.
- **5 DTO / domain objects** defined: `ChargeRequest`, `ChargeResponse`, and 3 credit-card error types.
- The core operation is `charge(request)` which accepts a `ChargeRequest` and returns a `ChargeResponse` with a UUID `transaction_id`.
- Credit card validation produces typed errors: `InvalidCreditCard`, `UnacceptedCreditCard`, `ExpiredCreditCard` — all return HTTP `400`.
- Only VISA and MasterCard are accepted; all other card types are rejected at validation time.

---

## Database Entities

> **This service has no database entities.**
>
> `paymentservice` is a stateless microservice that validates credit card information and simulates a charge. It does not persist any data to a database. All meaningful data structures are DTOs exchanged over gRPC/HTTP.

---

## Enums

### Accepted Credit Card Types

No formal enum is declared in the source, but the validation logic enforces an implicit allowlist:

| Value | Description |
|---|---|
| `VISA` | Visa-branded credit cards (card numbers starting with `4`) |
| `MasterCard` | MasterCard-branded credit cards (card numbers starting with `5`) |

All other card types trigger an `UnacceptedCreditCard` error.

---

## Key Relationships

Since there are no database entities, there are no cross-entity joins. The logical data flow is:

- **`ChargeRequest`** → `charge()` function → **`ChargeResponse`** (happy path)
- **`ChargeRequest`** → `charge()` function → **`InvalidCreditCard`** | **`UnacceptedCreditCard`** | **`ExpiredCreditCard`** (error path)

```
ChargeRequest
  ├── amount (object)
  └── credit_card (object)
          │
          ▼
    ┌─────────────┐
    │  charge()   │
    └──────┬──────┘
           │
     ┌─────┴──────────────────────┐
     │ success                    │ failure
     ▼                            ▼
ChargeResponse              CreditCardError
 (transaction_id)            ├── InvalidCreditCard
                             ├── UnacceptedCreditCard
                             └── ExpiredCreditCard
```

---

## DTOs & Transfer Objects

### ChargeRequest `[request]`

Request object for the charge function containing payment details.

**Used in:** `charge(request)`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `amount` | `object` | ✅ | — | Payment amount with currency code and numeric value |
| `credit_card` | `object` | ✅ | — | Credit card information (number, expiration month/year, CVV) |

---

### ChargeResponse `[response]`

Response object returned after successful charge processing.

**Used in:** `charge(request)`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `transaction_id` | `UUID` | ✅ | — | Unique transaction identifier generated for the charge |

---

### CreditCardError `[domain-object]`

Base error class for credit card validation failures. All specific card errors inherit from this.

**Used in:** `charge(request)` error handling

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `message` | `string` | ✅ | — | Error message describing the validation failure |
| `code` | `number` | ✅ | Fixed value: `400` | HTTP error code |

---

### InvalidCreditCard `[domain-object]`

Error thrown when the credit card number fails Luhn or format validation.

**Used in:** `charge(request)` error handling

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `message` | `string` | ✅ | Value: `"Credit card info is invalid"` | Fixed error message |
| `code` | `number` | ✅ | Value: `400` | HTTP error code |

---

### UnacceptedCreditCard `[domain-object]`

Error thrown when the detected credit card type is not VISA or MasterCard.

**Used in:** `charge(request)` error handling

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `message` | `string` | ✅ | Format: `"Sorry, we cannot process {cardType} credit cards. Only VISA or MasterCard is accepted."` | Error message including the rejected card type |
| `code` | `number` | ✅ | Value: `400` | HTTP error code |

---

### ExpiredCreditCard `[domain-object]`

Error thrown when the credit card's expiration date is in the past relative to the current date.

**Used in:** `charge(request)` error handling

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `message` | `string` | ✅ | Format: `"Your credit card (ending {last4}) expired on {month}/{year}"` | Error message with the card's last 4 digits and expiration date |
| `code` | `number` | ✅ | Value: `400` | HTTP error code |

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — End-to-end payment flow scenarios and edge cases
- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Upstream repository and architecture overview
- [API.md](API.md) — gRPC / HTTP endpoint definitions for `paymentservice`
- [ERROR_HANDLING.md](ERROR_HANDLING.md) — Cross-service error propagation and retry policies
<!-- generated: 2026-04-13T05:17:42.418Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Error Catalogue — paymentservice

## TL;DR for Agents

- **3 total error codes**, all in the `validation` category: `InvalidCreditCard`, `UnacceptedCreditCard`, `ExpiredCreditCard`.
- **None of the errors are retryable** — all are HTTP `400` client errors requiring the caller to fix input before resubmitting.
- Most common root cause: the caller passed an invalid, unsupported, or expired credit card to the `charge()` function.
- All errors are thrown as synchronous exceptions (subclasses of `CreditCardError`); there is **no global error-handling middleware** in this service.
- If you see a gRPC `INVALID_ARGUMENT` or HTTP `400` from `paymentservice`, this document covers the upstream cause.

## Global Error Handling

The `paymentservice` does **not** implement global error-handling middleware. The `charge.js` module defines a base `CreditCardError` class that sets the `code` property to `400`. Three concrete subclasses — `InvalidCreditCard`, `UnacceptedCreditCard`, and `ExpiredCreditCard` — extend this base class and are thrown directly and synchronously from the `charge()` function. Because there is no `try-catch` wrapper or error middleware within the module itself, the gRPC service handler (the caller of `charge()`) is responsible for catching these exceptions and translating them into appropriate gRPC status responses. If the caller does not catch these errors, they will propagate as unhandled exceptions and may crash the process or surface as generic `INTERNAL` gRPC errors to downstream consumers.

## Error Reference

| Code | HTTP Status | Category | Retryable | Description | When It Occurs | Recovery Hint |
|---|---|---|---|---|---|---|
| `InvalidCreditCard` | `400` | validation | ❌ No | Credit card number failed validation | `charge()` receives a credit card with an invalid card number that fails the `cardValidator` check. | Provide a valid credit card number. |
| `UnacceptedCreditCard` | `400` | validation | ❌ No | Credit card type is not accepted | `charge()` receives a credit card that is not VISA or MasterCard (e.g., AMEX, Diners Club). | Use a VISA or MasterCard instead. |
| `ExpiredCreditCard` | `400` | validation | ❌ No | Credit card expiration date has passed | `charge()` receives a credit card where the expiration date (month/year) is before the current date. | Provide a credit card with a future expiration date. |

### Quick lookup by scenario

| Symptom | Likely Error Code | First Action |
|---|---|---|
| Card number is malformed or fails Luhn check | `InvalidCreditCard` | Validate the card number on the client side before calling `paymentservice`. |
| Card brand is not VISA/MasterCard | `UnacceptedCreditCard` | Filter accepted card types in the UI/checkout flow. |
| Card year/month is in the past | `ExpiredCreditCard` | Check expiration date against the current date before submitting. |

## See Also

- [GoogleCloudPlatform/microservices-demo repository](https://github.com/GoogleCloudPlatform/microservices-demo) — source code and architecture overview.
- [SCENARIOS.md](SCENARIOS.md) — common failure scenarios and end-to-end troubleshooting playbooks.
- [src/paymentservice/charge.js](https://github.com/GoogleCloudPlatform/microservices-demo/blob/main/src/paymentservice/charge.js) — source of all error classes and the `charge()` function.
- [gRPC Status Codes](https://grpc.github.io/grpc/core/md_doc_statuscodes.html) — mapping between HTTP status codes and gRPC status codes relevant to how these errors surface to callers.
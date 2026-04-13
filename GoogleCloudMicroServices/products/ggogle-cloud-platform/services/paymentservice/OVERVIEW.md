<!-- generated: 2026-04-13T05:13:34.720Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# paymentservice

> gRPC microservice that validates credit card details and processes payment charges, returning transaction IDs.

## TL;DR for Agents

- **What it does:** Validates credit card information (number, expiration, card type) and executes charge operations via gRPC, returning a transaction ID on success.
- **Language/Runtime:** JavaScript on Node.js — no framework, pure gRPC server with OpenTelemetry tracing.
- **No outbound dependencies:** This service has zero database connections and zero downstream service calls. It is a leaf node in the dependency graph.
- **Entry point for bugs:** Start at `src/paymentservice/charge.js` (charge logic and card validation) and `src/paymentservice/server.js` (gRPC handler wiring).
- **No tests exist:** `package.json` test script is a placeholder that returns an error; any changes require manual or newly written validation.

## Service Identity

| Attribute          | Value                                          |
| ------------------ | ---------------------------------------------- |
| **Type**           | API (gRPC)                                     |
| **Language**       | JavaScript                                     |
| **Framework**      | None (raw `@grpc/grpc-js` + proto-loader)      |
| **Runtime**        | Node.js                                        |
| **Repo**           | `GoogleCloudPlatform/microservices-demo`        |
| **Primary Database** | None                                         |
| **Deployed on**    | Google Cloud (Kubernetes / GKE — demo architecture) |

## Responsibilities

### What it owns

- Accepting gRPC `Charge` requests containing credit card details and an amount.
- Validating credit card number format and type (Visa, MasterCard, etc.).
- Validating credit card expiration date.
- Generating and returning a transaction ID upon successful charge.
- Emitting OpenTelemetry traces and supporting Cloud Profiler for observability.

### This service does NOT handle:

- Persisting transaction data to any database or data store.
- Communicating with external payment processors (charges are simulated).
- Managing customer accounts or user identity.
- Handling refunds or reversals.

## Entry Points

| File | Description |
| ---- | ----------- |
| `src/paymentservice/index.js` | Service bootstrap — initializes Cloud Profiler, configures OpenTelemetry tracing, and starts the gRPC server. |
| `src/paymentservice/server.js` | `HipsterShopServer` class — loads the `.proto` definition, binds gRPC service handlers, and listens on the configured port. |

## Key Abstractions

| Abstraction | Description |
| ----------- | ----------- |
| **HipsterShopServer** | Top-level class in `server.js` that wires the gRPC server, loads the protobuf service definition, and registers the `Charge` RPC handler. |
| **charge function** | Core business logic that validates card details and computes a transaction ID. This is the function an agent should inspect first for payment-related bugs. |
| **CreditCardError** | Base error class for all card validation failures. |
| **InvalidCreditCard** | Thrown when the card number fails format or Luhn-style validation. |
| **UnacceptedCreditCard** | Thrown when the card type/network is not in the accepted list. |
| **ExpiredCreditCard** | Thrown when the card's expiration date is in the past. |

## What an Agent Needs to Know to Work on This Service

1. **Where to start:** Open `src/paymentservice/server.js` to understand how gRPC handlers are registered, then follow the call into the `charge` function (likely in `src/paymentservice/charge.js`).
2. **Request flow:** Incoming gRPC request → `server.js` handler → `charge()` validates card → returns transaction ID or throws a typed `CreditCardError`.
3. **Error handling pattern:** Three specific error subclasses (`InvalidCreditCard`, `UnacceptedCreditCard`, `ExpiredCreditCard`) extend `CreditCardError`. gRPC status codes are mapped from these errors in the server handler.
4. **No external calls:** The service is entirely self-contained. There are no HTTP clients, database drivers, or message queue consumers to configure.
5. **Observability:** OpenTelemetry is initialized in `index.js` before the server starts. Traces propagate through gRPC metadata automatically.
6. **Testing gap:** There are currently **no automated tests**. When making changes, write unit tests for the `charge` function covering valid cards, expired cards, invalid numbers, and unaccepted card types. Use a gRPC client stub for integration tests against `server.js`.
7. **Proto definition:** The service contract is defined in the shared `.proto` file in the repo (typically `pb/demo.proto`). Any API changes must update the proto first.

## Related Documents

- [API.md](API.md) — gRPC service contract, RPC methods, request/response schemas
- [SCENARIOS.md](SCENARIOS.md) — Common debugging and operational scenarios
- [DEPENDENCIES.md](DEPENDENCIES.md) — Dependency graph and npm package details
- [RUNBOOK.md](RUNBOOK.md) — Incident response and operational procedures

## See Also

- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Parent repository and architecture overview
- [OpenTelemetry JS documentation](https://opentelemetry.io/docs/instrumentation/js/) — Tracing instrumentation used by this service
- [gRPC Node.js documentation](https://grpc.io/docs/languages/node/) — Server and client patterns for the gRPC framework
- [`src/paymentservice/package.json`](../../src/paymentservice/package.json) — npm dependencies and scripts
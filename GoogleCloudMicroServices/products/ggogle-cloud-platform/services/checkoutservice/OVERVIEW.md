<!-- generated: 2026-04-13T05:09:51.385Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# checkoutservice

> Orchestrates the e-commerce checkout process by coordinating six downstream microservices to place orders via gRPC.

## TL;DR for Agents

- **What it does:** Receives `PlaceOrder` gRPC requests and orchestrates the full checkout workflow — fetching cart, resolving products, computing shipping, converting currency, charging payment, and sending confirmation email.
- **Key dependencies:** Calls 6 downstream gRPC services: `cart-service`, `product-catalog-service`, `currency-service`, `shipping-service`, `payment-service`, `email-service`. No database ownership.
- **Entry point for bugs:** Start at `src/checkoutservice/main.go` — the gRPC server bootstrap and all downstream connection setup lives here. The `PlaceOrder` handler is the single business-critical code path.
- **Language & framework:** Written in Go (1.16+) using gRPC; monetary arithmetic lives in a dedicated `money` utility package with its own unit tests.
- **No persistent state:** This service owns no database and no cache; all state is delegated to downstream services.

## Service Identity

| Attribute          | Value                                          |
| ------------------ | ---------------------------------------------- |
| **Type**           | API (gRPC)                                     |
| **Language**       | Go                                             |
| **Framework**      | gRPC                                           |
| **Runtime**        | Go 1.16+                                       |
| **Repo**           | `GoogleCloudPlatform/microservices-demo`        |
| **Primary Database** | None — stateless orchestrator                 |
| **Deployed on**    | Google Cloud Platform (Kubernetes)             |

## Responsibilities

### What it owns

- Orchestrating the end-to-end **PlaceOrder** workflow (single RPC entry point)
- Retrieving the user's cart from `cart-service` and iterating over cart items
- Fetching product details (price, name) from `product-catalog-service` for each cart item
- Requesting a shipping quote from `shipping-service`
- Converting item prices and shipping cost to the user's requested currency via `currency-service`
- Charging the user's credit card through `payment-service`
- Sending an order confirmation email via `email-service`
- Emptying the user's cart after successful order placement
- Monetary arithmetic (sum, multiply, validation) via the `money` utility package

### This service does NOT handle:

- **Storing cart data** — delegates to `cart-service`
- **Managing the product catalog** — delegates to `product-catalog-service`
- **Currency conversion rates** — delegates to `currency-service`
- **Calculating shipping quotes** — delegates to `shipping-service`
- **Processing payments** — delegates to `payment-service`
- **Sending emails** — delegates to `email-service`

## Entry Points

| File | Description |
| ---- | ----------- |
| `src/checkoutservice/main.go` | gRPC server bootstrap on port `5050`; initializes connections to 6 downstream services (`cart`, `product-catalog`, `currency`, `shipping`, `payment`, `email`); sets up OpenTelemetry tracing and Cloud Profiler |

## Key Abstractions

| Abstraction | Description |
| ----------- | ----------- |
| **`checkoutService`** | Main gRPC service struct. Holds client connections to all 6 downstream services and implements the `PlaceOrder` RPC handler. |
| **`PlaceOrder` RPC** | The single business operation exposed by this service. Orchestrates the full checkout workflow in a sequential pipeline: get cart → resolve products → quote shipping → convert currency → charge payment → ship → email → empty cart. |
| **`orderPrep`** | Intermediate struct that aggregates resolved order items, raw cart items, and the computed shipping cost before payment is charged. |
| **Money utility package** | Provides `Sum`, `Multiply`, and validation functions for monetary values using a `units` + `nanos` precision model (avoids floating-point errors). Located in `src/checkoutservice/money/`. |

## What an Agent Needs to Know to Work on This Service

### Where to start

1. Open `src/checkoutservice/main.go` — this is the only entry point. All service wiring and the gRPC handler registration happen here.
2. Follow the `PlaceOrder` method to understand the checkout pipeline. Each step calls exactly one downstream service via its gRPC client stub.

### Key patterns

- **Sequential orchestration:** The checkout flow is strictly sequential — each downstream call must succeed before the next begins. A failure at any step aborts the entire order.
- **Environment-based configuration:** Downstream service addresses are read from environment variables (e.g., `CART_SERVICE_ADDR`, `PRODUCT_CATALOG_SERVICE_ADDR`). Check these first when debugging connection issues.
- **gRPC port:** The service listens on port `5050` by default.
- **Tracing:** OpenTelemetry is initialized at startup. Trace context propagates through all downstream gRPC calls, making distributed tracing the primary debugging tool.
- **Money package tests:** The `money` package under `src/checkoutservice/money/money_test.go` has dedicated unit tests. Run them with:
  ```bash
  cd src/checkoutservice && go test ./money/...
  ```
- **No retries configured:** The extracted dependency data shows no explicit retry or timeout configuration on downstream calls. This is a known area of operational risk — failures in any downstream service will propagate directly.

## Related Documents

- [API.md](API.md) — gRPC API surface, request/response schemas, and RPC details
- [SCENARIOS.md](SCENARIOS.md) — Common workflows and failure scenarios for the checkout pipeline
- [DEPENDENCIES.md](DEPENDENCIES.md) — Full dependency graph with all 6 downstream services
- [TABLE_MAP.md](TABLE_MAP.md) — Data ownership map (note: this service owns no tables)
- [RUNBOOK.md](RUNBOOK.md) — Operational playbook for incidents and debugging

## See Also

- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Parent repository with architecture diagrams and deployment instructions
- [DEPENDENCIES.md](DEPENDENCIES.md) — Detailed breakdown of all outbound gRPC dependencies and their purposes
- [SCENARIOS.md](SCENARIOS.md) — Checkout failure modes and expected service behavior under partial outages
- [OpenTelemetry Go SDK](https://opentelemetry.io/docs/instrumentation/go/) — Reference for the tracing instrumentation used in this service
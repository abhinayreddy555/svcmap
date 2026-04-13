<!-- generated: 2026-04-13T05:16:08.031Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Dependencies — paymentservice

## TL;DR for Agents

- **paymentservice has 0 outbound service calls and 0 databases** — it is a leaf service with no downstream dependencies on other microservices or data stores.
- The service relies on the `simple-card-validator` npm package for credit card validation logic (VISA, MasterCard, AMEX, etc.).
- Observability is handled via **OpenTelemetry** (distributed tracing/metrics over OTLP gRPC) and **Google Cloud Profiler** (CPU/memory profiling).
- This is a **Node.js gRPC service** that processes payment charges — any failure here directly impacts order completion.
- If you are investigating payment failures, start here; if investigating inter-service communication issues, this service has no outbound calls to other services.

---

## Outbound Calls

paymentservice makes **no outbound calls** to other microservices.

| Target | Type | Endpoint / Topic | Purpose | Timeout | Retries | Is External |
|--------|------|-------------------|---------|---------|---------|-------------|
| _None_ | — | — | — | — | — | — |

> **Note:** paymentservice is a leaf node in the service topology. It receives requests, validates credit card data locally using `simple-card-validator`, and returns a transaction ID. No network calls to payment gateways or other services are made — this is a **simulated** payment processor for demo purposes.

---

## Databases & Storage

paymentservice uses **no databases or persistent storage**.

| Name | Type | Purpose | Shared / Private |
|------|------|---------|------------------|
| _None_ | — | — | — |

> The service is stateless. It does not persist transaction records or payment data.

---

## Third-Party Integrations

| Name | Category | SDK / Package | Purpose |
|------|----------|---------------|---------|
| simple-card-validator | payment | `simple-card-validator` | Validate credit card numbers and detect card type (VISA, MasterCard, AMEX, etc.) |
| Google Cloud Profiler | observability | `@google-cloud/profiler` | CPU and memory profiling for performance analysis |
| OpenTelemetry | observability | `@opentelemetry/sdk-node`, `@opentelemetry/exporter-otlp-grpc`, `@opentelemetry/instrumentation-grpc` | Distributed tracing, metrics collection, and telemetry export via OTLP gRPC |

### Integration Notes

- **`simple-card-validator`** is a lightweight npm library used entirely in-process. It performs no network calls. A failure or breaking change in this package would cause all payment validations to fail.
- **OpenTelemetry** instruments the gRPC server layer automatically via `@opentelemetry/instrumentation-grpc`. Telemetry data is exported to an OTLP-compatible collector (e.g., the OpenTelemetry Collector deployed in the cluster). If the collector is unavailable, payment processing itself should **not** be affected — telemetry export failures are non-blocking.
- **Google Cloud Profiler** runs as a background agent. It requires GCP credentials and connectivity to the Profiler API. Profiler unavailability does not impact payment processing.

---

## Inbound Calls

> **Note:** This section is populated from the product-level service graph and may be incomplete.

| Source Service | Method / RPC | Purpose |
|----------------|-------------|---------|
| checkoutservice | `CurrencyService/Charge` (gRPC) | Charges the customer's credit card during order placement |

paymentservice exposes a gRPC `Charge` RPC. In the standard `microservices-demo` topology, **checkoutservice** is the sole caller. It invokes paymentservice as the final step in the checkout flow after cart retrieval, currency conversion, and shipping cost calculation.

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Failure scenarios and blast radius analysis for paymentservice
- [checkoutservice/DEPENDENCIES.md](../checkoutservice/DEPENDENCIES.md) — Upstream service that calls paymentservice during order placement
- [OpenTelemetry Collector configuration](../otelcollector/) — Collector that receives telemetry from paymentservice
- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Source repository and architecture overview
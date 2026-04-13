<!-- generated: 2026-04-13T05:11:43.616Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Dependencies — checkoutservice

## TL;DR for Agents

- **checkoutservice** makes **14 outbound gRPC calls** to **8 distinct internal services** — it is the highest-fan-out service in the mesh and a critical orchestration point.
- **No databases or third-party integrations** are directly owned by this service; all state is delegated to downstream services.
- Core checkout flow depends on **cart-service → product-catalog-service → currency-service → shipping-service → payment-service → email-service** in sequence; failure in any breaks order placement.
- **ad-service** and **recommendation-service** calls are non-critical to order completion but are invoked during the checkout journey.
- No explicit timeouts or retries are configured on any outbound call — this is a resilience risk worth flagging during incident analysis.

---

## Outbound Calls

| # | Target | Type | Endpoint / Topic | Purpose | Timeout | Retries | External? |
|---|--------|------|-------------------|---------|---------|---------|-----------|
| 1 | `cart-service` | gRPC | `AddItem` | Add item to shopping cart | _not set_ | _not set_ | No |
| 2 | `cart-service` | gRPC | `GetCart` | Retrieve shopping cart contents | _not set_ | _not set_ | No |
| 3 | `cart-service` | gRPC | `EmptyCart` | Clear shopping cart after order | _not set_ | _not set_ | No |
| 4 | `recommendation-service` | gRPC | `ListRecommendations` | Get product recommendations | _not set_ | _not set_ | No |
| 5 | `product-catalog-service` | gRPC | `ListProducts` | List all available products | _not set_ | _not set_ | No |
| 6 | `product-catalog-service` | gRPC | `GetProduct` | Retrieve product details | _not set_ | _not set_ | No |
| 7 | `product-catalog-service` | gRPC | `SearchProducts` | Search for products | _not set_ | _not set_ | No |
| 8 | `shipping-service` | gRPC | `GetQuote` | Get shipping cost quote | _not set_ | _not set_ | No |
| 9 | `shipping-service` | gRPC | `ShipOrder` | Ship order to customer | _not set_ | _not set_ | No |
| 10 | `currency-service` | gRPC | `GetSupportedCurrencies` | Get list of supported currencies | _not set_ | _not set_ | No |
| 11 | `currency-service` | gRPC | `Convert` | Convert currency amounts | _not set_ | _not set_ | No |
| 12 | `payment-service` | gRPC | `Charge` | Process payment charge | _not set_ | _not set_ | No |
| 13 | `email-service` | gRPC | `SendOrderConfirmation` | Send order confirmation email | _not set_ | _not set_ | No |
| 14 | `ad-service` | gRPC | `GetAds` | Retrieve advertisements | _not set_ | _not set_ | No |

### Dependency Graph (Logical Order for Checkout)

```
checkoutservice
 ├── cart-service.GetCart          # 1. Fetch current cart
 ├── product-catalog-service.GetProduct  # 2. Resolve product details per item
 ├── currency-service.Convert     # 3. Convert prices to user currency
 ├── shipping-service.GetQuote    # 4. Calculate shipping cost
 ├── payment-service.Charge       # 5. Charge the customer
 ├── shipping-service.ShipOrder   # 6. Initiate shipment
 ├── cart-service.EmptyCart        # 7. Clear the cart post-order
 └── email-service.SendOrderConfirmation  # 8. Confirm via email
```

> **Note:** `recommendation-service.ListRecommendations`, `product-catalog-service.ListProducts`, `product-catalog-service.SearchProducts`, `currency-service.GetSupportedCurrencies`, `cart-service.AddItem`, and `ad-service.GetAds` are invoked during the broader checkout page experience but are not part of the critical order-placement path.

### Resilience Observations

| Concern | Detail |
|---------|--------|
| No timeouts configured | All 14 outbound calls have no explicit timeout. A hung downstream service will block `checkoutservice` indefinitely. |
| No retries configured | Transient failures in any dependency will propagate immediately to the caller. |
| No circuit breakers observed | No evidence of circuit-breaker patterns in the extracted dependency data. |
| High fan-out | 8 distinct downstream services make this the single largest blast-radius service in the topology. |

---

## Databases & Storage

| Name | Type | Purpose | Shared / Private |
|------|------|---------|------------------|
| _None_ | — | — | — |

`checkoutservice` does not own any database or persistent storage. All state (cart contents, product catalog, order records) is managed by downstream services.

---

## Third-Party Integrations

| Name | Category | SDK | Purpose |
|------|----------|-----|---------|
| _None_ | — | — | — |

No direct third-party integrations were detected. Payment processing is abstracted behind the internal `payment-service`.

---

## Inbound Calls

> **Note:** This section is populated from the product-level service graph and may be incomplete.

| Source | Type | Endpoint | Purpose |
|--------|------|----------|---------|
| `frontend` | gRPC | `PlaceOrder` | User-initiated checkout / order placement |

`checkoutservice` is typically invoked exclusively by the `frontend` service when a user completes the checkout flow. It is not expected to receive calls from other backend services.

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Failure scenarios and impact analysis for `checkoutservice` outages
- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Source repository and architecture overview
- [cart-service DEPENDENCIES.md](../cart-service/DEPENDENCIES.md) — Dependency details for the most-called downstream service
- [payment-service DEPENDENCIES.md](../payment-service/DEPENDENCIES.md) — Dependency details for the critical payment path
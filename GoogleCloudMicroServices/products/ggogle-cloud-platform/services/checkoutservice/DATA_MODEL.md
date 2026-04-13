<!-- generated: 2026-04-13T05:12:20.579Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Data Model — checkoutservice

## TL;DR for Agents

- **checkoutservice** is a stateless orchestration service with **zero database entities** — it persists no data of its own.
- It coordinates calls to other microservices (cart, product catalog, shipping, currency, payment, email) to fulfill an order.
- The most important data structures are the **PlaceOrderRequest** / **PlaceOrderResponse** DTOs and the **OrderResult** domain object.
- All structured data flows through **gRPC/protobuf messages** defined in the shared `hipstershop` proto package — there are no SQL tables or ORM entities.
- If you are looking for persisted order data, check the downstream services (e.g., cartservice, paymentservice); checkoutservice is purely transactional.

---

## Database Entities

**checkoutservice has no database entities.** It is a stateless orchestrator that assembles data from downstream services during the checkout flow and returns a composed result. No tables, collections, or persistent stores are owned by this service.

> If you expected to find order-persistence logic here, note that the [microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) architecture delegates persistence to individual backing services (e.g., `cartservice` uses Redis).

---

## Enums

There are no enums owned by checkoutservice. The following enum-like values appear in the protobuf contracts it consumes:

### CurrencyCode (external, used in Money messages)

| Value | Description |
|-------|-------------|
| `USD` | US Dollar — default currency used in demo |
| `EUR` | Euro |
| `CAD` | Canadian Dollar |
| `JPY` | Japanese Yen |
| `GBP` | British Pound |
| `TRY` | Turkish Lira |

> Currency codes follow ISO 4217. The full list is managed by **currencyservice**.

---

## Key Relationships

checkoutservice does not perform database joins. Instead, it orchestrates **service-to-service calls** in the following order during `PlaceOrder`:

```
PlaceOrderRequest
  │
  ├──► cartservice.GetCart(user_id)          → [CartItem...]
  │
  ├──► productcatalogservice.GetProduct(id)  → Product (per item)
  │
  ├──► currencyservice.Convert(price, code)  → Money (per item)
  │
  ├──► shippingservice.GetQuote(items, addr) → Money
  │
  ├──► shippingservice.ShipOrder(items, addr)→ tracking_id
  │
  ├──► paymentservice.Charge(amount, card)   → transaction_id
  │
  ├──► cartservice.EmptyCart(user_id)        → (void)
  │
  └──► emailservice.SendConfirmation(email, order) → (void)
```

- **PlaceOrderRequest** → fans out to 6 downstream services.
- **CartItem.product_id** → resolves against **productcatalogservice**.
- **Money** objects flow through **currencyservice** for conversion.
- **CreditCardInfo** is passed transiently to **paymentservice** and is never stored.

---

## DTOs & Transfer Objects

### PlaceOrderRequest `[request]`

**Used in:** `hipstershop.CheckoutService/PlaceOrder`

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|-----------------|-------------|
| `user_id` | `string` | Yes | Non-empty | Identifies the user whose cart will be checked out |
| `user_currency` | `string` | Yes | Valid ISO 4217 code | Target currency for pricing |
| `address` | `Address` | Yes | All sub-fields required | Shipping destination |
| `email` | `string` | Yes | Non-empty; valid email format | Confirmation email recipient |
| `credit_card` | `CreditCardInfo` | Yes | All sub-fields required | Payment instrument (transient, never persisted) |

---

### PlaceOrderResponse `[response]`

**Used in:** `hipstershop.CheckoutService/PlaceOrder`

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|-----------------|-------------|
| `order` | `OrderResult` | Yes | — | Composed order confirmation |

---

### OrderResult `[domain-object]`

**Used in:** Embedded in `PlaceOrderResponse`; passed to `emailservice` for confirmation rendering.

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|-----------------|-------------|
| `order_id` | `string` | Yes | UUID v4 generated at checkout | Unique identifier for the order |
| `shipping_tracking_id` | `string` | Yes | Returned by shippingservice | Carrier tracking reference |
| `shipping_cost` | `Money` | Yes | Non-negative | Cost of shipping in user's currency |
| `shipping_address` | `Address` | Yes | — | Destination address (echoed back) |
| `items` | `OrderItem[]` | Yes | At least 1 item | Line items in the order |

---

### OrderItem `[domain-object]`

**Used in:** Embedded in `OrderResult.items`

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|-----------------|-------------|
| `item` | `CartItem` | Yes | — | Product ID and quantity from the cart |
| `cost` | `Money` | Yes | Non-negative | Unit cost converted to user's currency |

---

### CartItem `[domain-object]`

**Used in:** Retrieved from `cartservice.GetCart`; referenced in `OrderItem`

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|-----------------|-------------|
| `product_id` | `string` | Yes | Must resolve in product catalog | SKU / product identifier |
| `quantity` | `int32` | Yes | > 0 | Number of units |

---

### Address `[domain-object]`

**Used in:** `PlaceOrderRequest.address`, `OrderResult.shipping_address`, `shippingservice` calls

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|-----------------|-------------|
| `street_address` | `string` | Yes | Non-empty | Street line |
| `city` | `string` | Yes | Non-empty | City name |
| `state` | `string` | Yes | Non-empty | State or province |
| `country` | `string` | Yes | Non-empty | Country name or code |
| `zip_code` | `int32` | Yes | — | Postal / ZIP code |

---

### CreditCardInfo `[domain-object]`

**Used in:** `PlaceOrderRequest.credit_card`, passed to `paymentservice.Charge`

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|-----------------|-------------|
| `credit_card_number` | `string` | Yes | Non-empty | Card PAN (transient — never logged or persisted) |
| `credit_card_cvv` | `int32` | Yes | 3–4 digits | Card verification value |
| `credit_card_expiration_year` | `int32` | Yes | ≥ current year | Expiry year |
| `credit_card_expiration_month` | `int32` | Yes | 1–12 | Expiry month |

---

### Money `[domain-object]`

**Used in:** Pricing fields across `OrderResult`, `OrderItem`, shipping quotes, payment charges

| Field | Type | Required | Validation Rules | Description |
|-------|------|----------|-----------------|-------------|
| `currency_code` | `string` | Yes | Valid ISO 4217 | Three-letter currency code |
| `units` | `int64` | Yes | — | Whole units of the currency |
| `nanos` | `int32` | Yes | 0–999,999,999; same sign as `units` | Fractional units in nano-denomination |

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — End-to-end checkout flow scenarios and failure modes
- [API.md](API.md) — gRPC endpoint definitions for `CheckoutService/PlaceOrder`
- [Proto definition (demo.proto)](https://github.com/GoogleCloudPlatform/microservices-demo/blob/main/protos/demo.proto) — Canonical protobuf source for all message types
- [ARCHITECTURE.md](ARCHITECTURE.md) — Service interaction diagram and deployment topology
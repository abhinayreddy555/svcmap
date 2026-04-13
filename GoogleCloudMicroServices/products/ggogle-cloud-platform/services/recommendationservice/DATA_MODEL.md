<!-- generated: 2026-04-13T05:22:53.831Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Data Model — RecommendationService

## TL;DR for Agents

- **Zero database entities** — RecommendationService is stateless; it owns no persistent storage and has no tables to query.
- **29 DTO/transfer objects** defined across the microservices-demo protobuf schema; **2 are directly used by RecommendationService** (`ListRecommendationsRequest`, `ListRecommendationsResponse`).
- The core operation is `RecommendationService.ListRecommendations`: accepts a `user_id` + exclusion list of `product_ids`, returns recommended `product_ids`.
- RecommendationService depends on **ProductCatalogService** (`ListProducts`) to fetch the full product catalog, then filters/samples from it.
- Key domain objects shared across services: `Product`, `CartItem`, `Money`, `Address`, `OrderResult`.

---

## Database Entities

RecommendationService **does not own any database entities**. It is a stateless service that:

1. Receives a request with a `user_id` and a list of product IDs to exclude.
2. Calls `ProductCatalogService.ListProducts` to retrieve the full catalog.
3. Filters out the excluded products and returns a random sample of remaining product IDs.

There are no tables, indexes, or foreign keys to document for this service.

---

## Enums

No enums are defined in the RecommendationService data model or its shared protobuf definitions.

---

## Key Relationships

RecommendationService sits at the intersection of user context and the product catalog. Although it has no persisted relationships, the runtime data flow is important:

- **`ListRecommendationsRequest.product_ids`** → corresponds to `Product.id` values from **ProductCatalogService**. These are the products to *exclude* (e.g., items already in the user's cart).
- **`ListRecommendationsResponse.product_ids`** → a subset of `Product.id` values returned by `ProductCatalogService.ListProducts`, after exclusion filtering.
- **`ListRecommendationsRequest.user_id`** → the same `user_id` string used by **CartService** (`GetCartRequest.user_id`) and **CheckoutService** (`PlaceOrderRequest.user_id`).

```
┌──────────────┐   ListProducts(Empty)   ┌──────────────────────┐
│              │ ──────────────────────►  │                      │
│ Recommendation│                         │ ProductCatalogService│
│   Service    │ ◄──────────────────────  │                      │
│              │   ListProductsResponse   └──────────────────────┘
└──────┬───────┘
       │
       │  Filters out request.product_ids
       │  Returns sampled product_ids
       ▼
  ListRecommendationsResponse
```

---

## DTOs & Transfer Objects

### ListRecommendationsRequest `[request]`

Request to list product recommendations for a user. The `product_ids` field contains IDs of products the user has already seen or added to cart, which should be excluded from recommendations.

**Used in:** `RecommendationService.ListRecommendations`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `user_id` | `string` | Yes | — | Identifier of the user requesting recommendations |
| `product_ids` | `string[]` | Yes | — | List of product IDs to exclude from recommendations |

---

### ListRecommendationsResponse `[response]`

Response containing recommended product IDs, filtered to exclude any products the caller specified.

**Used in:** `RecommendationService.ListRecommendations`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `product_ids` | `string[]` | Yes | — | Recommended product IDs |

---

### Product `[domain-object]`

Represents a product in the catalog. RecommendationService consumes this object via `ProductCatalogService.ListProducts` to build its recommendation pool.

**Used in:** `ProductCatalogService.ListProducts`, `ProductCatalogService.GetProduct`, `ProductCatalogService.SearchProducts`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `id` | `string` | Yes | — | Unique product identifier |
| `name` | `string` | Yes | — | Product display name |
| `description` | `string` | Yes | — | Product description text |
| `picture` | `string` | Yes | — | URL or path to product image |
| `price_usd` | `Money` | Yes | — | Product price in USD |
| `categories` | `string[]` | Yes | — | Category tags for the product |

---

### ListProductsResponse `[response]`

Response containing the full list of products from the catalog. This is the upstream response RecommendationService consumes.

**Used in:** `ProductCatalogService.ListProducts`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `products` | `Product[]` | Yes | — | Complete list of catalog products |

---

### Empty `[domain-object]`

Empty message used for requests/responses with no data. RecommendationService uses this as the request payload when calling `ProductCatalogService.ListProducts`.

**Used in:** `CartService.AddItem`, `CartService.EmptyCart`, `ProductCatalogService.ListProducts`, `CurrencyService.GetSupportedCurrencies`, `EmailService.SendOrderConfirmation`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| *(none)* | — | — | — | No fields |

---

### Money `[domain-object]`

Represents a monetary amount with currency. Used within `Product.price_usd` and throughout the checkout/payment flow.

**Used in:** `Product`, `GetQuoteResponse`, `CurrencyService.Convert`, `ChargeRequest`, `OrderItem`, `OrderResult`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `currency_code` | `string` | Yes | — | ISO 4217 currency code (e.g., `USD`) |
| `units` | `int64` | Yes | — | Whole units of the amount |
| `nanos` | `int32` | Yes | — | Nano units (10⁻⁹) of the amount |

---

### CartItem `[domain-object]`

Represents a single item in a shopping cart. Relevant to RecommendationService because cart items are typically passed as the exclusion list.

**Used in:** `CartService.AddItem`, `CartService.GetCart`, `ShippingService.GetQuote`, `ShippingService.ShipOrder`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `product_id` | `string` | Yes | — | Product identifier |
| `quantity` | `int32` | Yes | — | Quantity of the product |

---

### Cart `[response]`

Response containing a user's shopping cart. The frontend typically extracts `product_id` values from cart items to populate `ListRecommendationsRequest.product_ids`.

**Used in:** `CartService.GetCart`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `user_id` | `string` | Yes | — | Owner of the cart |
| `items` | `CartItem[]` | Yes | — | Items currently in the cart |

---

### GetCartRequest `[request]`

Request to retrieve a user's cart.

**Used in:** `CartService.GetCart`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `user_id` | `string` | Yes | — | Identifier of the cart owner |

---

### AddItemRequest `[request]`

Request to add an item to cart.

**Used in:** `CartService.AddItem`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `user_id` | `string` | Yes | — | Identifier of the cart owner |
| `item` | `CartItem` | Yes | — | Item to add |

---

### EmptyCartRequest `[request]`

Request to empty a user's cart.

**Used in:** `CartService.EmptyCart`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `user_id` | `string` | Yes | — | Identifier of the cart owner |

---

### GetProductRequest `[request]`

Request to retrieve a specific product by ID.

**Used in:** `ProductCatalogService.GetProduct`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `id` | `string` | Yes | — | Product identifier to look up |

---

### SearchProductsRequest `[request]`

Request to search for products by query string.

**Used in:** `ProductCatalogService.SearchProducts`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `query` | `string` | Yes | — | Search query text |

---

### SearchProductsResponse `[response]`

Response containing product search results.

**Used in:** `ProductCatalogService.SearchProducts`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `results` | `Product[]` | Yes | — | Products matching the search query |

---

### Address `[domain-object]`

Represents a physical address. Not directly used by RecommendationService but shared across shipping and checkout flows.

**Used in:** `ShippingService.GetQuote`, `ShippingService.ShipOrder`, `CheckoutService.PlaceOrder`, `OrderResult`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `street_address` | `string` | Yes | — | Street address line |
| `city` | `string` | Yes | — | City name |
| `state` | `string` | Yes | — | State or province |
| `country` | `string` | Yes | — | Country name or code |
| `zip_code` | `int32` | Yes | — | Postal / ZIP code |

---

### GetQuoteRequest `[request]`

Request to get a shipping quote.

**Used in:** `ShippingService.GetQuote`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `address` | `Address` | Yes | — | Destination address |
| `items` | `CartItem[]` | Yes | — | Items to ship |

---

### GetQuoteResponse `[response]`

Response containing a shipping cost estimate.

**Used in:** `ShippingService.GetQuote`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `cost_usd` | `Money` | Yes | — | Estimated shipping cost in USD |

---

### ShipOrderRequest `[request]`

Request to ship an order.

**Used in:** `ShippingService.ShipOrder`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `address` | `Address` | Yes | — | Shipping destination |
| `items` | `CartItem[]` | Yes | — | Items to ship |

---

### ShipOrderResponse `[response]`

Response containing the tracking ID for a shipped order.

**Used in:** `ShippingService.ShipOrder`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `tracking_id` | `string` | Yes | — | Shipment tracking identifier |

---

### GetSupportedCurrenciesResponse `[response]`

Response containing the list of supported currency codes.

**Used in:** `CurrencyService.GetSupportedCurrencies`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `currency_codes` | `string[]` | Yes | — | List of ISO 4217 currency codes |

---

### CurrencyConversionRequest `[request]`

Request to convert a monetary amount to a different currency.

**Used in:** `CurrencyService.Convert`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `from` | `Money` | Yes | — | Source amount with currency |
| `to_code` | `string` | Yes | — | Target ISO 4217 currency code |

---

### CreditCardInfo `[domain-object]`

Represents credit card information for payment processing.

**Used in:** `ChargeRequest`, `CheckoutService.PlaceOrder`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `credit_card_number` | `string` | Yes | — | Card number |
| `credit_card_cvv` | `int32` | Yes | — | Card verification value |
| `credit_card_expiration_year` | `int32` | Yes | — | Expiration year |
| `credit_card_expiration_month` | `int32` | Yes | — | Expiration month |

---

### ChargeRequest `[request]`

Request to charge a payment.

**Used in:** `PaymentService.Charge`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `amount` | `Money` | Yes | — | Amount to charge |
| `credit_card` | `CreditCardInfo` | Yes | — | Payment card details |

---

### ChargeResponse `[response]`

Response containing the transaction ID from a successful payment charge.

**Used in:** `PaymentService.Charge`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `transaction_id` | `string` | Yes | — | Unique transaction identifier |

---

### OrderItem `[domain-object]`

Represents a line item in a completed order.

**Used in:** `OrderResult`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `item` | `CartItem` | Yes | — | The cart item (product + quantity) |
| `cost` | `Money` | Yes | — | Total cost for this line item |

---

### OrderResult `[domain-object]`

Represents the result of a placed order, including shipping and item details.

**Used in:** `PlaceOrderResponse`, `SendOrderConfirmationRequest`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `order_id` | `string` | Yes | — | Unique order identifier |
| `shipping_tracking_id` | `string` | Yes | — | Shipment tracking ID |
| `shipping_cost` | `Money` | Yes | — | Cost of shipping |
| `shipping_address` | `Address` | Yes | — | Delivery address |
| `items` | `OrderItem[]` | Yes | — | Line items in the order |

---

### SendOrderConfirmationRequest `[request]`

Request to send an order confirmation email.

**Used in:** `EmailService.SendOrderConfirmation`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `email` | `string` | Yes | — | Recipient email address |
| `order` | `OrderResult` | Yes | — | Order details to include in the email |

---

### PlaceOrderRequest `[request]`

Request to place an order through the checkout flow.

**Used in:** `CheckoutService.PlaceOrder`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `user_id` | `string` | Yes | — | User placing the order |
| `user_currency` | `string` | Yes | — | Preferred currency code |
| `address` | `Address` | Yes | — | Shipping address |
| `email` | `string` | Yes | — | Email for order confirmation |
| `credit_card` | `CreditCardInfo` | Yes | — | Payment details |

---

### PlaceOrderResponse `[response]`

Response containing the order result after successfully placing an order.

**Used in:** `CheckoutService.PlaceOrder`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `order` | `OrderResult` | Yes | — | Complete order result |

---

### AdRequest `[request]`

Request to get ads based on context keys.

**Used in:** `AdService.GetAds`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `context_keys` | `string[]` | Yes | — | Context keywords for ad targeting |

---

### Ad `[domain-object]`

Represents an advertisement.

**Used in:** `AdResponse`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `redirect_url` | `string` | Yes | — | URL the ad links to |
| `text` | `string` | Yes | — | Ad display text |

---

### AdResponse `[response]`

Response containing a list of ads.

**Used in:** `AdService.GetAds`

| Field | Type | Required | Validation Rules | Description |
|---|---|---|---|---|
| `ads` | `Ad[]` | Yes | — | List of advertisements |

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — End-to-end request flows involving RecommendationService
- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Source repository with protobuf definitions in `protos/demo.proto`
- [API_REFERENCE.md](API_REFERENCE.md) — gRPC endpoint documentation for all services
- [ARCHITECTURE.md](ARCHITECTURE.md) — Service dependency graph and deployment topology
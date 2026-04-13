<!-- generated: 2026-04-13T05:26:44.439Z | model: claude-opus-4-6 | sha: c9857ee5 -->



# Business Rules — recommendationservice

## TL;DR for Agents

- **Zero formal state machines** — this service is stateless; it receives a request and returns product recommendations in a single call.
- **Zero explicit permission/RBAC rules** — the service trusts upstream callers (typically the frontend) with no auth layer of its own.
- **Core business rule**: filter out products the user already has in their cart, then return a random sample of up to 5 remaining products.
- **Most critical constraint an agent must not violate**: never recommend a product that is already in the user's cart.
- **The service depends on `productcatalogservice`** via gRPC to fetch the full product list; if that dependency is down, the recommendation call fails entirely.

---

## State Machines

There are no state machines in `recommendationservice`. The service is a **stateless, request-response gRPC endpoint**. Each `ListRecommendations` call is independent — no entity progresses through lifecycle states, and no data is persisted between calls.

> **Why no state machine?** The recommendation service acts as a pure function: it takes a list of product IDs (the user's cart) as input, fetches the full catalog, filters, samples, and returns results. There is no mutable domain entity.

---

## Business Rules

### Filter Out Cart Products

Products already present in the user's cart must be excluded from the recommendation set.

| Field | Value |
|---|---|
| **Category** | business-constraint |
| **Condition** | `product_id ∈ request.user_product_ids` |
| **Outcome** | Product is removed from the candidate pool before sampling |
| **Error Code** | N/A (silent exclusion, not an error) |
| **Code Ref** | `src/recommendation_server.py` — `ListRecommendations()` |

### Random Sampling Cap

The service returns **at most 5** product recommendations per request, chosen randomly from the filtered candidate pool.

| Field | Value |
|---|---|
| **Category** | business-constraint |
| **Condition** | `len(filtered_products) > 5` |
| **Outcome** | A random sample of exactly 5 products is returned; if ≤ 5 candidates exist, all are returned |
| **Error Code** | N/A |
| **Code Ref** | `src/recommendation_server.py` — `ListRecommendations()` |

### Catalog Dependency Availability

The service makes a gRPC call to `productcatalogservice` to retrieve the full product list. If that call fails, the recommendation request fails.

| Field | Value |
|---|---|
| **Category** | validation / dependency |
| **Condition** | `productcatalogservice` is unreachable or returns an error |
| **Outcome** | gRPC error is propagated to the caller |
| **Error Code** | gRPC status codes (e.g., `UNAVAILABLE`, `DEADLINE_EXCEEDED`) |
| **Code Ref** | `src/recommendation_server.py` — `ListRecommendations()` |

### Quick Reference

| Name | Category | Condition | Code Ref |
|---|---|---|---|
| Filter Out Cart Products | business-constraint | `product_id ∈ user_product_ids` | `src/recommendation_server.py` |
| Random Sampling Cap | business-constraint | `len(candidates) > 5` → sample 5 | `src/recommendation_server.py` |
| Catalog Dependency Availability | validation / dependency | `productcatalogservice` reachable | `src/recommendation_server.py` |

---

## Permission Matrix

| Resource | Action | Allowed Roles | Additional Conditions | Denial Behavior |
|---|---|---|---|---|
| `ListRecommendations` gRPC endpoint | call | Any (unauthenticated) | None | N/A — no auth enforcement |

**Auth model summary:** The `recommendationservice` does **not** implement any authentication or authorization. It is designed to run inside a trusted service mesh (e.g., behind the `frontend` service). All callers are implicitly trusted. There is no JWT validation, no RBAC, and no ABAC. If you are adding auth, it should be enforced at the ingress/frontend layer or via a service mesh policy (e.g., Istio `AuthorizationPolicy`).

---

## Calculations & Formulas

### Recommendation Selection

```
candidates = [p for p in catalog_products if p.id NOT IN request.user_product_ids]
num_to_return = min(len(candidates), 5)
result = random.sample(candidates, num_to_return)
```

| Field | Value |
|---|---|
| **Inputs** | Full product catalog (from `productcatalogservice`), user's current cart product IDs (`request.user_product_ids`) |
| **Output** | List of `Product.id` strings, length 0–5 |
| **Precision** | N/A (discrete selection, no floating-point math) |
| **Determinism** | **Non-deterministic** — `random.sample` produces different results per call |

---

## What an Agent Must Know

- **Never recommend a product already in the user's cart.** This is the single most important invariant. Any code change must preserve the cart-exclusion filter.
- **The maximum number of returned recommendations is 5.** Do not change this cap without understanding downstream UI assumptions in the `frontend` service.
- **The service is stateless.** Do not introduce caching or mutable state without considering that multiple replicas may run concurrently with no shared storage.
- **`productcatalogservice` is a hard runtime dependency.** If you modify the gRPC client call or the proto contract (`demo.proto`), ensure backward compatibility or coordinate the change.
- **There is no authentication.** Any code that assumes a user identity or role from the request context will find none. User identity is limited to the list of product IDs passed in `user_product_ids`.
- **Results are non-deterministic.** Tests must not assert on exact ordering or exact product IDs unless the random seed is fixed.
- **OpenTelemetry tracing is enabled.** If you add new outbound calls or significant logic branches, propagate the trace context and add spans to maintain observability.
- **The gRPC health check endpoint must remain functional.** Kubernetes liveness/readiness probes depend on it; breaking it will cause pod restarts.

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — End-to-end scenarios where recommendation rules are exercised (e.g., add-to-cart → get-recommendations flow)
- [ERRORS.md](ERRORS.md) — gRPC error codes and failure modes when `productcatalogservice` is unavailable
- [DATA_MODEL.md](DATA_MODEL.md) — Proto definitions for `ListRecommendationsRequest`, `ListRecommendationsResponse`, and `Product`
- [Architecture overview](https://github.com/GoogleCloudPlatform/microservices-demo#architecture) — Service dependency graph and deployment topology
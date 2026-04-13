<!-- generated: 2026-04-13T05:18:00.792Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Business Rules — productcatalogservice

## TL;DR for Agents

- **No state machines** exist in this service; it is a stateless read-only product catalog.
- **One critical branching rule**: catalog data source is determined by the `ALLOYDB_CLUSTER_NAME` environment variable — set → AlloyDB, unset → local `products.json`.
- **Product categories are normalized**: lowercased and comma-split when loaded from AlloyDB; agents generating or comparing category data must account for this.
- **Money values use nano-precision** (9 decimal places) with strict sign-consistency constraints between `units` and `nanos` — violating this will corrupt pricing data.
- **No permission/auth model** is enforced within this service; it relies on upstream service-mesh or gateway-level authorization.

---

## State Machines

No state machines were detected in `productcatalogservice`. The service exposes a stateless, read-only gRPC API for listing, getting, and searching products. Catalog data is loaded once at startup (or reloaded on signal) and served from memory.

---

## Business Rules

### Catalog & Data Loading

#### Catalog Loading Strategy

| Field | Value |
|---|---|
| **Category** | Configuration / Data Source Selection |
| **Condition** | `os.Getenv("ALLOYDB_CLUSTER_NAME") != ""` |
| **Outcome** | If the env var is set, calls `loadCatalogFromAlloyDB()`; otherwise calls `loadCatalogFromLocalFile()` which reads `products.json` |
| **Error Code** | N/A |
| **Code Ref** | `src/productcatalogservice/catalog_loader.go:loadCatalog` |

> **Agent note:** When writing tests or configuring deployments, the presence or absence of `ALLOYDB_CLUSTER_NAME` completely changes the data path. There is no fallback — if AlloyDB is configured but unreachable, the service will fail to load its catalog.

---

#### Product Category Normalization

| Field | Value |
|---|---|
| **Category** | Data Normalization |
| **Condition** | Categories string is read from an AlloyDB row |
| **Outcome** | `categories = strings.ToLower(categories)` then `product.Categories = strings.Split(categories, ",")` |
| **Error Code** | N/A |
| **Code Ref** | `src/productcatalogservice/catalog_loader.go:loadCatalogFromAlloyDB` |

> **Agent note:** This normalization only applies to the AlloyDB path. Categories loaded from `products.json` are used as-is. Any code that filters or matches categories must compare against **lowercase, comma-delimited** values when AlloyDB is the source.

---

### Quick Reference

| Name | Category | Condition | Code Ref |
|---|---|---|---|
| Catalog loading strategy | Configuration | `ALLOYDB_CLUSTER_NAME` env var set or unset | `catalog_loader.go:loadCatalog` |
| Product category normalization | Data Normalization | Categories read from AlloyDB | `catalog_loader.go:loadCatalogFromAlloyDB` |

---

## Permission Matrix

| Resource | Action | Allowed Roles | Additional Conditions | Denial Behavior |
|---|---|---|---|---|
| Product Catalog | List / Get / Search | Any caller | None enforced at service level | N/A |

**Auth model summary:** `productcatalogservice` does **not** implement any internal authentication or authorization. It is designed to run inside a service mesh (e.g., Istio in the microservices-demo) where mTLS and authorization policies are enforced at the infrastructure layer. Any gRPC client that can reach the service endpoint can call all RPCs. Agents generating code that calls this service should ensure network-level or mesh-level policies are in place rather than expecting the service itself to reject unauthorized requests.

---

## Calculations & Formulas

### Money Representation

```
total_value = units + (nanos / 1,000,000,000)
```

| Field | Description |
|---|---|
| **Inputs** | `units` (int64): whole currency units · `nanos` (int32): nano units (10⁻⁹), range `−999,999,999` to `+999,999,999` · `currencyCode` (string): ISO 4217 3-letter code (e.g., `USD`, `EUR`) |
| **Output** | `Money` protobuf object with fields `currency_code`, `units`, `nanos` |
| **Precision** | 9 decimal places (nano-precision) |
| **Sign Consistency Rule** | If `units > 0` → `nanos >= 0`. If `units < 0` → `nanos <= 0`. If `units == 0` → `nanos` can be any sign. |
| **Code Ref** | `src/productcatalogservice/genproto/demo.pb.go:Money` |

> **Critical constraint:** The sign of `nanos` must always agree with the sign of `units` (or `units` must be zero). Constructing a `Money` value like `{units: 5, nanos: -500000000}` is **invalid** and will produce incorrect pricing downstream.

---

## What an Agent Must Know

1. **Environment variable `ALLOYDB_CLUSTER_NAME` is the single switch** that determines the entire data-loading path. Misconfiguring it (e.g., setting it to an empty string vs. unsetting it) will route to the wrong loader.
2. **Category comparison must be case-insensitive** when the catalog is loaded from AlloyDB, because categories are lowercased during ingestion. Code that does exact-match against mixed-case category names will silently return zero results.
3. **Category normalization is asymmetric** between data sources: AlloyDB categories are lowercased and comma-split; `products.json` categories are used verbatim. Tests must account for which source is active.
4. **Money `nanos` sign must match `units` sign.** Violating this invariant corrupts price calculations in downstream services (cart, checkout, currency conversion). Always validate sign consistency when constructing or modifying `Money` objects.
5. **`nanos` must stay within `[-999,999,999, +999,999,999]`.** Overflow into the `units` field is not handled automatically by the protobuf type — the caller is responsible.
6. **No auth checks exist in this service.** Do not assume any RPC will be rejected based on caller identity. If you need access control, enforce it at the mesh/gateway layer.
7. **Catalog is loaded into memory at startup.** If the backing data (AlloyDB or `products.json`) changes, the service must be restarted or sent a reload signal to pick up changes. There is no hot-reload polling loop.
8. **There are no state machines or write operations.** Any agent reasoning about state transitions or mutations can skip this service entirely — it is purely read-only.

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — End-to-end scenarios exercising catalog loading and product search
- [ERRORS.md](ERRORS.md) — Error codes and failure modes (e.g., AlloyDB connection failures)
- [DATA_MODEL.md](DATA_MODEL.md) — Product and Money entity field definitions and protobuf schema
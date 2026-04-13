<!-- generated: 2026-04-13T05:17:20.782Z | model: claude-opus-4-6 | sha: c9857ee5 -->



# Business Rules — checkoutservice

## TL;DR for Agents

- **No state machines** exist in this service; all rules are validation and arithmetic constraints on the `Money` type.
- **4 business rules** govern monetary value validity and arithmetic operations — violating any will cause checkout total calculations to fail.
- **Most critical constraint**: Currency codes of both operands **must match** before calling `Sum()`, or the operation returns `ErrMismatchingCurrency`.
- **No permission/auth model** is defined within this service boundary; it operates as an internal gRPC microservice.
- Money nanos must stay within `[-999999999, +999999999]` and sign-match with units — this is the foundational invariant for every monetary calculation.

---

## State Machines

No state machines were detected in `checkoutservice`. This service does not manage entity lifecycle states. All logic is stateless request-scoped processing (validate cart, compute totals, place order).

---

## Business Rules

### Validation Rules

#### Money value sign consistency

| Field        | Value                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------- |
| **Category** | validation                                                                                         |
| **Condition** | `signMatches(m) == false` OR `validNanos(m.nanos) == false`                                       |
| **Outcome**  | `IsValid()` returns `false`; all downstream operations (Sum, MultiplySlow) reject the value         |
| **Error Code** | _(none — boolean check; callers raise `ErrInvalidValue`)_                                        |
| **Code Ref** | `src/checkoutservice/money/money.go:IsValid`                                                       |

Units and nanos must either share the same sign or one of them must be zero. A value like `{Units: 5, Nanos: -100}` is **invalid**.

#### Nanos range constraint

| Field        | Value                                                                  |
| ------------ | ---------------------------------------------------------------------- |
| **Category** | validation                                                             |
| **Condition** | `nanos < -999999999` OR `nanos > +999999999`                          |
| **Outcome**  | `IsValid()` returns `false`                                            |
| **Error Code** | _(none — boolean check)_                                             |
| **Code Ref** | `src/checkoutservice/money/money.go:validNanos`                        |

The nanos component represents the fractional part of a monetary value in billionths. It must never exceed ±999,999,999 to prevent overflow during carry/borrow arithmetic.

---

### Business Constraint Rules

#### Currency code matching for arithmetic

| Field        | Value                                                                  |
| ------------ | ---------------------------------------------------------------------- |
| **Category** | business-constraint                                                    |
| **Condition** | `l.currencyCode != r.currencyCode`                                    |
| **Outcome**  | `Sum()` returns error                                                  |
| **Error Code** | `ErrMismatchingCurrency`                                             |
| **Code Ref** | `src/checkoutservice/money/money.go:Sum`                               |

Both operands passed to `Sum()` must share the same currency code (e.g., both `"USD"`). Empty strings on both sides are also acceptable (treated as matching). Mixing `"USD"` and `"EUR"` is always rejected.

#### Money value validity for arithmetic

| Field        | Value                                                                  |
| ------------ | ---------------------------------------------------------------------- |
| **Category** | validation                                                             |
| **Condition** | `!IsValid(l)` OR `!IsValid(r)`                                        |
| **Outcome**  | `Sum()` returns error                                                  |
| **Error Code** | `ErrInvalidValue`                                                    |
| **Code Ref** | `src/checkoutservice/money/money.go:Sum`                               |

Before performing addition, `Sum()` validates both operands using `IsValid()`. If either operand has mismatched signs or out-of-range nanos, the operation is rejected immediately.

---

### Quick Reference

| Name | Category | Condition | Code Ref |
| ---- | -------- | --------- | -------- |
| Money value sign consistency | validation | `signMatches(m) == false` OR `validNanos(m.nanos) == false` | `money.go:IsValid` |
| Nanos range constraint | validation | `nanos < -999999999` OR `nanos > +999999999` | `money.go:validNanos` |
| Currency code matching for arithmetic | business-constraint | `l.currencyCode != r.currencyCode` | `money.go:Sum` |
| Money value validity for arithmetic | validation | `!IsValid(l)` OR `!IsValid(r)` | `money.go:Sum` |

---

## Permission Matrix

| Resource | Action | Allowed Roles | Additional Conditions | Denial Behavior |
| -------- | ------ | ------------- | --------------------- | --------------- |
| _(none defined)_ | — | — | — | — |

The `checkoutservice` does not implement its own authentication or authorization layer. It is an internal gRPC service within the microservices-demo mesh. Access control is expected to be enforced at the API gateway / frontend layer or via service mesh policies (e.g., Istio mTLS). Any caller that can reach the gRPC endpoint can invoke checkout operations.

---

## Calculations & Formulas

### Money sum with carry/borrow

```
total_nanos = l.nanos + r.nanos
carry       = total_nanos / 1_000_000_000   // integer division, propagates to units
result = {
    CurrencyCode: l.currencyCode,
    Units:        l.units + r.units + carry,
    Nanos:        total_nanos % 1_000_000_000,
}
```

| Field         | Value                                                                                  |
| ------------- | -------------------------------------------------------------------------------------- |
| **Inputs**    | `l.units` (int64), `l.nanos` (int32, ±999999999), `r.units` (int64), `r.nanos` (int32, ±999999999) |
| **Output**    | `Money` with units and nanos components; same currency code as inputs                  |
| **Precision** | Nanos stored as int32 with modulo 10⁹. Carry/borrow propagates to units when nanos exceed ±10⁹. |
| **Code Ref**  | `src/checkoutservice/money/money.go:Sum`                                               |

### Money multiplication (slow)

```
result = Money{CurrencyCode: m.currencyCode, Units: 0, Nanos: 0}
for i := 0; i < n; i++ {
    result = Sum(result, m)
}
```

| Field         | Value                                                                                  |
| ------------- | -------------------------------------------------------------------------------------- |
| **Inputs**    | `m` (Money value), `n` (uint32, multiplier count)                                      |
| **Output**    | `Money` with value `m × n`                                                             |
| **Precision** | Repeated addition via `Sum()`; inherits carry/borrow logic. O(n) complexity — suitable only for small multipliers (cart item quantities). |
| **Code Ref**  | `src/checkoutservice/money/money.go:MultiplySlow`                                      |

---

## What an Agent Must Know

1. **Always validate before arithmetic.** Never call `Sum()` or `MultiplySlow()` with a `Money` value that hasn't passed `IsValid()`. The function checks internally, but constructing invalid values upstream wastes a round-trip to an error.

2. **Sign consistency is non-obvious.** A `Money` value with `Units: 0, Nanos: -500000000` is **valid** (represents −$0.50). But `Units: 1, Nanos: -500000000` is **invalid** — mixed signs. If you're constructing Money values programmatically, always ensure `units` and `nanos` share the same sign or one is zero.

3. **Never mix currency codes in Sum().** Before summing line items, confirm all items share the same currency code. If the cart contains items priced in different currencies, convert first via the `currencyservice` — `Sum()` will hard-fail with `ErrMismatchingCurrency`.

4. **Nanos overflow is handled by carry, but input nanos must be in range.** If you construct a `Money` with `Nanos: 1500000000`, it will fail `IsValid()`. The carry logic only applies to the *result* of addition, not to input construction.

5. **`MultiplySlow` is O(n).** It is intentionally simple and only safe for small `n` values (typical cart quantities). Do not use it for large multipliers — it will be extremely slow and could cause request timeouts.

6. **No auth checks exist in this service.** If you are generating code that exposes checkout functionality, you **must** add authorization at the calling layer. The service trusts all inbound gRPC calls.

7. **Two distinct error sentinels exist.** Map `ErrInvalidValue` to a 400-equivalent (bad input) and `ErrMismatchingCurrency` to a 400-equivalent (business logic violation). Do not retry these — they are deterministic failures.

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — End-to-end checkout scenarios where these money rules are exercised
- [ERRORS.md](ERRORS.md) — Full catalog of error codes including `ErrInvalidValue` and `ErrMismatchingCurrency`
- [DATA_MODEL.md](DATA_MODEL.md) — `Money` entity field definitions (`units`, `nanos`, `currency_code`)
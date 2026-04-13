<!-- generated: 2026-04-13T05:20:34.669Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Business Rules — paymentservice

## TL;DR for Agents

- **No state machines** — paymentservice is a stateless charge operation with 3 validation rules gating a single action.
- **3 validation/business-constraint rules** must pass before any charge is processed: card validity, accepted card type (VISA/MasterCard only), and expiration check.
- **No permission/RBAC model** — the service is an internal gRPC endpoint; authorization is handled upstream.
- **Most critical constraint**: never process a charge for an expired, invalid, or non-VISA/MasterCard card — all three checks throw HTTP 400 errors.
- All validation logic lives in a single function: `src/paymentservice/charge.js:charge`.

---

## State Machines

No state machines were detected for this service. The paymentservice implements a **stateless request-response pattern**: each `charge()` call either succeeds and returns a transaction ID, or fails with one of three validation errors. There are no persisted states, no transitions to track, and no lifecycle to manage.

---

## Business Rules

### Validation Rules

#### Credit Card Validity Check

| Field        | Value                                                                 |
|--------------|-----------------------------------------------------------------------|
| **Category** | Validation                                                            |
| **Condition**| `cardValidator(cardNumber).getCardDetails().valid === false`           |
| **Outcome**  | Throws `InvalidCreditCard` error with HTTP 400                        |
| **Error Code** | `InvalidCreditCard`                                                 |
| **Code Ref** | `src/paymentservice/charge.js:charge`                                 |

The card number is validated using a card-validation library. If the number fails the algorithm check (e.g., Luhn), the request is immediately rejected before any other checks run.

---

#### Credit Card Expiration Check

| Field        | Value                                                                 |
|--------------|-----------------------------------------------------------------------|
| **Category** | Validation                                                            |
| **Condition**| `(currentYear * 12 + currentMonth) > (expirationYear * 12 + expirationMonth)` |
| **Outcome**  | Throws `ExpiredCreditCard` error with HTTP 400                        |
| **Error Code** | `ExpiredCreditCard`                                                 |
| **Code Ref** | `src/paymentservice/charge.js:charge`                                 |

Expiration is evaluated at **month-year granularity only** — a card expiring in the current month is still considered valid. See [Calculations & Formulas](#calculations--formulas) for the exact formula.

---

### Business Constraint Rules

#### Accepted Card Types

| Field        | Value                                                                 |
|--------------|-----------------------------------------------------------------------|
| **Category** | Business constraint                                                   |
| **Condition**| `cardType !== 'visa' AND cardType !== 'mastercard'`                   |
| **Outcome**  | Throws `UnacceptedCreditCard` error with HTTP 400                     |
| **Error Code** | `UnacceptedCreditCard`                                              |
| **Code Ref** | `src/paymentservice/charge.js:charge`                                 |

Only **VISA** and **MasterCard** are accepted. Any other card network (Amex, Discover, JCB, Diners Club, etc.) is rejected.

---

### Quick Reference

| Name                          | Category              | Condition                                                              | Code Ref                              |
|-------------------------------|-----------------------|------------------------------------------------------------------------|---------------------------------------|
| Credit card validity check    | Validation            | `cardValidator(cardNumber).getCardDetails().valid === false`           | `src/paymentservice/charge.js:charge` |
| Credit card expiration check  | Validation            | `(currentYear*12 + currentMonth) > (expYear*12 + expMonth)`           | `src/paymentservice/charge.js:charge` |
| Accepted card types           | Business constraint   | `cardType !== 'visa' AND cardType !== 'mastercard'`                    | `src/paymentservice/charge.js:charge` |

---

## Permission Matrix

| Resource        | Action  | Allowed Roles | Additional Conditions | Denial Behavior |
|-----------------|---------|---------------|-----------------------|-----------------|
| `charge()`      | Execute | Any caller    | None                  | N/A             |

**Auth model summary:** The paymentservice does not implement its own authentication or authorization layer. It is designed as an **internal microservice** called via gRPC by other services in the mesh (e.g., `checkoutservice`). Access control is expected to be enforced **upstream** — either at the API gateway, service mesh (e.g., Istio mTLS), or by the calling service. Agents generating code that calls this service should ensure the **caller** has already authenticated the end user and authorized the payment action before invoking `charge()`.

---

## Calculations & Formulas

### Card Expiration Validation

```
isExpired = (currentYear * 12 + currentMonth) > (expirationYear * 12 + expirationMonth)
```

| Field         | Value                                                                 |
|---------------|-----------------------------------------------------------------------|
| **Inputs**    | `currentYear` — `new Date().getFullYear()`                            |
|               | `currentMonth` — `new Date().getMonth() + 1` (1-indexed)             |
|               | `expirationYear` — from `credit_card_expiration_year` field           |
|               | `expirationMonth` — from `credit_card_expiration_month` field         |
| **Output**    | `boolean` — `true` if card is expired, `false` if still valid        |
| **Precision** | Month-year only; no day-level granularity                             |

> **Key detail:** A card whose expiration month/year equals the current month/year is **not** considered expired. The comparison is strictly greater-than (`>`), meaning the card remains valid through the entirety of its expiration month.

---

## What an Agent Must Know

- **All three validation rules are mandatory and order-sensitive.** Card number validity is checked first (via the card-validator library), then card type, then expiration. Do not skip or reorder.
- **Only `visa` and `mastercard` string values are accepted** as card types. If you are constructing test data or generating card numbers, ensure the number maps to one of these two networks — any other type triggers `UnacceptedCreditCard`.
- **Expiration comparison uses month-year math, not date objects.** The formula `year * 12 + month` converts both dates to a total-months scalar. A card expiring in the current month is still valid. Do not introduce day-level checks.
- **`getMonth()` is 0-indexed in JavaScript.** The code adds `+1` to convert to 1-indexed months. If you port or replicate this logic, you must account for this offset or you will misclassify cards as expired/valid by one month.
- **There is no idempotency or duplicate-charge protection** in this service. Calling `charge()` twice with the same parameters will produce two independent transaction IDs. The caller is responsible for deduplication.
- **There is no amount validation** in the extracted rules. The service does not check for zero, negative, or unreasonably large amounts — this must be enforced upstream.
- **Error codes are specific and must be preserved.** Downstream consumers (e.g., `checkoutservice`, frontend) may branch on `InvalidCreditCard`, `UnacceptedCreditCard`, or `ExpiredCreditCard`. Do not consolidate these into a generic error.
- **No auth checks exist in this service.** If you are adding a public-facing route or proxy to this service, you **must** add authentication and authorization — the service trusts all callers implicitly.

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — End-to-end scenarios where these validation rules are exercised (checkout happy path, invalid card flows)
- [ERRORS.md](ERRORS.md) — Full catalog of error codes (`InvalidCreditCard`, `UnacceptedCreditCard`, `ExpiredCreditCard`) with HTTP status mappings
- [DATA_MODEL.md](DATA_MODEL.md) — Schema for `CreditCard` entity fields (`credit_card_number`, `credit_card_expiration_year`, `credit_card_expiration_month`, `credit_card_cvv`)
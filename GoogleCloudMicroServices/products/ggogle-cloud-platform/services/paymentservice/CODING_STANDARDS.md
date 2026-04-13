<!-- generated: 2026-04-13T05:18:25.838Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Coding Standards — paymentservice

## TL;DR for Agents

- **Architecture**: Functional/procedural Node.js service — business logic exported as single functions, not classes. No controllers, no routers; gRPC handles transport.
- **Key rule**: Errors are domain-specific custom classes extending `Error` with HTTP status codes. Never use generic `Error`; always throw the appropriate `CreditCardError` subclass.
- **Naming**: Files are `camelCase.js`, classes are `PascalCase`, functions are `camelCase`, constants are `UPPER_SNAKE_CASE`.
- **Logging**: All logging uses `pino` with structured JSON and GCP Cloud Logging–compatible severity mapping. Import the shared logger from `src/paymentservice/logger.js`.
- **Dependencies**: `simple-card-validator` for card validation, `uuid` for transaction IDs, `@grpc/grpc-js` for service communication, `@opentelemetry/*` for tracing.

---

## Architecture Pattern

The paymentservice follows a **Functional/Procedural with Custom Error Classes** pattern. There are no class-based controllers or service layers. Business logic is implemented as standalone functions exported via `module.exports` and invoked by the gRPC server layer.

```
┌─────────────────────────────────────────────────┐
│              gRPC Transport Layer                │
│         (@grpc/grpc-js + proto defs)             │
└──────────────────┬──────────────────────────────┘
                   │ invokes
                   ▼
┌─────────────────────────────────────────────────┐
│           Business Logic Functions               │
│   charge.js — exported as module.exports = fn    │
│                                                  │
│  ┌─────────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Validation  │  │ Charging │  │  Error      │  │
│  │ (card-      │  │ (uuid    │  │  Classes    │  │
│  │  validator) │  │  gen)    │  │             │  │
│  └─────────────┘  └──────────┘  └────────────┘  │
└──────────────────┬──────────────────────────────┘
                   │ uses
                   ▼
┌─────────────────────────────────────────────────┐
│           External Libraries                     │
│  simple-card-validator · uuid · pino             │
│  @opentelemetry/*                                │
└─────────────────────────────────────────────────┘
```

There is no ORM, no database, and no HTTP layer. The service validates credit card data, generates a transaction ID, and returns it over gRPC.

---

## Layer Structure

| Layer | Directory | Responsibility | Can Call |
|---|---|---|---|
| Business Logic | `src/paymentservice/` | Credit card validation and charge processing | External libraries (`simple-card-validator`, `uuid`, `pino`) |

> **Note**: This service has a single layer. There is no separate data access, controller, or middleware layer. The gRPC server directly invokes the exported business logic function.

---

## Naming Conventions

| Category | Convention | Example |
|---|---|---|
| Files | `camelCase.js` | `charge.js`, `logger.js` |
| Classes | `PascalCase` | `CreditCardError`, `InvalidCreditCard`, `ExpiredCreditCard` |
| Functions | `camelCase` | `charge(request)` |
| Constants | `UPPER_SNAKE_CASE` | *(use for any fixed values, e.g., accepted card types)* |
| Database Columns | N/A | This service has no database |

---

## Error Handling

The paymentservice uses a **custom error class hierarchy** rooted at `CreditCardError`, which extends the native `Error` class and includes an HTTP-style `code` property. Subclasses include `InvalidCreditCard`, `UnacceptedCreditCard`, and `ExpiredCreditCard`. Errors are **thrown directly** from the business logic function and propagated to the gRPC caller — there are no `try-catch` blocks in `charge.js`. When generating code for this service, always throw the most specific error subclass rather than a generic `Error` or the base `CreditCardError`. Every custom error must include a descriptive message and the appropriate status code. Do not wrap business logic in `try-catch`; let the transport layer handle error translation to gRPC status codes.

```js
// ✅ Correct
throw new ExpiredCreditCard(cardNumber.substr(-4));

// ❌ Wrong — too generic
throw new Error('Card expired');
```

---

## Logging

All logging is performed via **pino** configured for GCP Cloud Logging compatibility. The logger is instantiated in `src/paymentservice/logger.js` with custom formatters that map pino's numeric log levels to a `severity` string field (e.g., `INFO`, `WARNING`, `ERROR`) expected by Cloud Logging. When adding logging to new modules, **import the shared logger from `logger.js`** rather than creating a new pino instance. Log output is structured JSON — never use `console.log`.

```js
// ✅ Correct
const logger = require('./logger');
logger.info('Payment processed successfully');

// ❌ Wrong — duplicate logger configuration
const pino = require('pino');
const logger = pino({ /* duplicated config */ });
```

---

## Authentication

There is **no application-level authentication** implemented in the paymentservice. Authentication and authorization are expected to be handled at the infrastructure level (e.g., service mesh, GKE network policies, or upstream API gateway). Do not add auth middleware or token validation to this service unless the architecture explicitly changes.

---

## Testing Approach

There is **no documented testing framework or test suite** currently in place for this service. When adding tests, follow these guidelines consistent with the existing codebase:

- Use a standard Node.js test runner (e.g., Jest or Mocha).
- Test the exported `charge` function directly with mock request objects.
- Verify that each custom error class is thrown for the correct invalid input scenario.
- Do not mock `uuid` unless testing deterministic transaction IDs.

---

## Notable Patterns

### Custom Error Hierarchy

Domain-specific error classes provide precise error categorization. Each subclass of `CreditCardError` carries a `code` property for HTTP/gRPC status mapping.

```js
// src/paymentservice/charge.js

class CreditCardError extends Error {
  constructor(message) {
    super(message);
    this.code = 400;
  }
}

class InvalidCreditCard extends CreditCardError {
  constructor(cardNumber) {
    super(`Credit card info is invalid`);
  }
}

class UnacceptedCreditCard extends CreditCardError {
  constructor(cardType) {
    super(`Sorry, we cannot process ${cardType} credit cards. Only VISA or MasterCard is accepted.`);
  }
}

class ExpiredCreditCard extends CreditCardError {
  constructor(lastFour) {
    super(`Your credit card (ending ${lastFour}) is expired.`);
  }
}
```

### Pino Logger Configuration

A centralized logger with custom formatters ensures all log output is compatible with GCP Cloud Logging's expected `severity` field.

```js
// src/paymentservice/logger.js
const pino = require('pino');

module.exports = pino({
  formatters: {
    level(label, number) {
      return { severity: label.toUpperCase() };
    },
  },
});
```

### Module Export as Function

Business logic is exported as a **single function** rather than a class or object with methods. This keeps the module focused and the call site simple.

```js
// src/paymentservice/charge.js
module.exports = function charge(request) {
  // validation, processing, return transaction ID
};

// Caller
const charge = require('./charge');
const result = charge(request);
```

---

## Anti-Patterns to Avoid

- **No null-guard on nested properties** — `creditCard.credit_card_number` will throw a `TypeError` if `creditCard` is `null` or `undefined`. Always validate the top-level object before accessing nested fields.
- **Inline string manipulation for card masking** — `cardNumber.substr(-4)` is used directly instead of a reusable utility function. Extract masking logic into a helper.
- **Hardcoded business rules** — Accepted card types (VISA, MasterCard) are hardcoded in the function body. These should be extracted to a named constant or configuration.
- **Mixed concerns in a single function** — Validation, business logic, and logging are interleaved in `charge()`. Prefer separating validation into its own function.
- **Duplicate logger instantiation** — Do not create new `pino` instances in each file. Always import from `src/paymentservice/logger.js`.
- **No correlation IDs or request tracing in errors** — Errors lack context for distributed tracing. Attach trace/span IDs from OpenTelemetry when available.
- **Synchronous-only validation** — The `charge` function is synchronous, which blocks future extensibility (e.g., external fraud-check APIs). Consider making it `async` for forward compatibility.
- **Magic numbers** — Values like `12` (months in a year) appear without named constants. Define `const MONTHS_IN_YEAR = 12;` instead.

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Common development scenarios and workflows for the paymentservice
- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Parent repository with all microservices and deployment configuration
- [src/paymentservice/charge.js](src/paymentservice/charge.js) — Core business logic and error class definitions
- [src/paymentservice/logger.js](src/paymentservice/logger.js) — Pino logger configuration for GCP Cloud Logging
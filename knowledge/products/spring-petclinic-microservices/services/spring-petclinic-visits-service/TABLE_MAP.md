<!-- generated: 2026-04-13T04:27:10.440Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Table Map — spring-petclinic-visits-service

## TL;DR for Agents

- **0 tables confirmed owned, 0 tables confirmed read-only** — no structured table usage data was provided for this service.
- This service is part of the `spring-petclinic-microservices` product and is expected to manage **visit** records for pets.
- The extracted table usage data is `undefined`, meaning static analysis or runtime tracing did not yield results.
- If you are investigating visit-related tables (e.g., `visits`), this service is the most likely owner — but **no concrete schema evidence is available in this document**.
- Cross-reference the product-level database catalog for authoritative table ownership mappings.

## Tables Owned

> **No table usage data was extracted for this service.**
>
> The extraction process returned `undefined`. This could indicate:
>
> | Possible Cause | Explanation |
> |---|---|
> | Dynamic query generation | Queries may be built at runtime (e.g., Spring Data JPA derived queries) and not captured by static analysis |
> | Missing annotation scanning | JPA `@Entity` or `@Table` annotations may not have been picked up by the extraction tooling |
> | Schema managed externally | The schema may be provisioned via Flyway/Liquibase scripts or an external process not covered by the scan |
> | In-memory / embedded DB | The service may use H2 in default profiles, with schema auto-generated from entities |
>
> **Expected table based on service conventions:**
>
> Based on the standard `spring-petclinic` reference architecture, this service is expected to own a `visits` table with a structure similar to:
>
> | Column | Type (expected) | Description |
> |---|---|---|
> | `id` | `INT / BIGINT` (PK) | Auto-generated visit ID |
> | `pet_id` | `INT / BIGINT` | Foreign reference to the pet (owned by `pets-service`) |
> | `visit_date` | `DATE / TIMESTAMP` | Date of the visit |
> | `description` | `VARCHAR` | Description / notes for the visit |
>
> ⚠️ **This is inferred from the canonical petclinic schema — not from extracted data. Do not treat as authoritative.**

## Tables Read From Other Services

| Table | Owning Service | Access Method | Reason |
|---|---|---|---|
| *(none confirmed)* | — | — | No cross-service table reads were detected in the extraction |

> **Note:** In the microservices variant of spring-petclinic, cross-service data access is typically performed via **REST API calls** (e.g., to `spring-petclinic-customers-service`) rather than direct database reads. The `pet_id` column in the `visits` table references a pet entity owned by the customers service, but this relationship is resolved at the application layer, not via database-level foreign keys.

## See Also

- [DATABASE_CATALOG.md](DATABASE_CATALOG.md) — Product-level database catalog for all spring-petclinic-microservices
- [SCENARIOS.md](SCENARIOS.md) — Feature and scenario documentation for this service
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Source repository with entity definitions and migration scripts
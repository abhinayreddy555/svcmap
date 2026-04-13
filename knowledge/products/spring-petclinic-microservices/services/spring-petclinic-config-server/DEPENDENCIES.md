<!-- generated: 2026-04-13T04:00:41.570Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Dependencies — spring-petclinic-config-server

## TL;DR for Agents

- **spring-petclinic-config-server** is the centralized Spring Cloud Config Server for the spring-petclinic-microservices product.
- **1 outbound dependency**: fetches configuration from an external GitHub repository (`spring-petclinic-microservices-config`).
- **0 databases**: this service has no direct database or storage dependencies.
- **1 third-party integration**: Jolokia for JVM monitoring over HTTP.
- **All other microservices in the product likely depend on this service** for their runtime configuration — an outage here cascades broadly.

---

## Outbound Calls

| Target | Type | Endpoint / Topic | Purpose | Timeout | Retries | External? |
|---|---|---|---|---|---|---|
| `spring-petclinic-microservices-config` | other | `https://github.com/spring-petclinic/spring-petclinic-microservices-config` | Fetch centralized configuration for microservices | N/A | N/A | **Yes** |

### Notes

- The config server pulls configuration files (e.g., `application.yml`, per-service profiles) from the external Git repository at startup and on refresh.
- Because the backing store is an **external public GitHub repository**, availability depends on GitHub's uptime and network egress policies. If GitHub is unreachable at boot time, the config server will fail to start and **no downstream service will receive configuration**.
- No explicit timeout or retry policy was detected in the extracted dependency data. Spring Cloud Config's default Git clone/fetch behavior applies (typically governed by JGit defaults and `spring.cloud.config.server.git.*` properties).

---

## Databases & Storage

| Name | Type | Purpose | Shared / Private |
|---|---|---|---|
| *(none)* | — | — | — |

This service does not use any database or persistent storage. Configuration state is sourced entirely from the upstream Git repository.

---

## Third-Party Integrations

| Name | Category | SDK / Package | Purpose |
|---|---|---|---|
| Jolokia | Monitoring | `jolokia-core` | JVM monitoring and management over HTTP (exposes MBeans as REST endpoints) |

---

## Inbound Calls

> **Note:** This section is populated from the product-level service graph and may be incomplete.

The config server is a **foundational infrastructure service**. Every microservice in the `spring-petclinic-microservices` product that uses Spring Cloud Config Client will call this service at startup (and optionally on refresh) to retrieve its configuration. Expected consumers include:

| Caller (expected) | Protocol | Purpose |
|---|---|---|
| `spring-petclinic-customers-service` | HTTP (`GET /config`) | Fetch application configuration at boot |
| `spring-petclinic-vets-service` | HTTP (`GET /config`) | Fetch application configuration at boot |
| `spring-petclinic-visits-service` | HTTP (`GET /config`) | Fetch application configuration at boot |
| `spring-petclinic-api-gateway` | HTTP (`GET /config`) | Fetch application configuration at boot |

Default endpoint pattern: `http://{config-server-host}:{port}/{application}/{profile}[/{label}]`

**Impact note:** If `spring-petclinic-config-server` is unavailable, all dependent microservices will fail to start or will fall back to local configuration (if configured). This makes the config server a **single point of failure** for the entire product unless client-side retry and fallback strategies are in place. See [SCENARIOS.md](SCENARIOS.md) for failure scenario analysis.

---

## See Also

- [spring-petclinic-microservices-config repository](https://github.com/spring-petclinic/spring-petclinic-microservices-config) — the Git-backed configuration source
- [SCENARIOS.md](SCENARIOS.md) — failure scenarios and cascading impact analysis
- [spring-petclinic-microservices root repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — product-level documentation and service graph
- [Spring Cloud Config Server reference documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_spring_cloud_config_server) — configuration options for Git backend, timeouts, and retry
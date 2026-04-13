<!-- generated: 2026-04-13T04:07:35.105Z | model: claude-opus-4-6 | sha: 597ad1fb -->

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

- The config server clones or pulls from the external Git repository at startup and on refresh. If GitHub is unreachable or the repository is deleted/renamed, **no microservice will be able to bootstrap its configuration**.
- No explicit timeout or retry policy was detected in the extracted dependency data. Spring Cloud Config Server defaults apply (underlying JGit / HTTP transport timeouts).

---

## Databases & Storage

| Name | Type | Purpose | Shared / Private |
|---|---|---|---|
| *(none)* | — | — | — |

This service does not connect to any database or persistent storage layer. Configuration state is sourced entirely from the upstream Git repository.

---

## Third-Party Integrations

| Name | Category | SDK / Package | Purpose |
|---|---|---|---|
| Jolokia | Monitoring | `jolokia-core` | JVM monitoring and management over HTTP |

### Notes

- Jolokia exposes JMX MBeans as HTTP/JSON endpoints. Ensure the `/jolokia` actuator endpoint is secured in production to prevent unauthorized access to JVM internals.

---

## Inbound Calls

> **Note:** This section is populated from the product-level service graph and may be incomplete.

The config server is a **foundational infrastructure service**. Every microservice in the `spring-petclinic-microservices` product that uses Spring Cloud Config Client will call this service at startup (and optionally on refresh) to retrieve its configuration. Expected consumers include:

| Caller | Protocol | Purpose |
|---|---|---|
| `spring-petclinic-customers-service` | HTTP (`GET /config`) | Fetch application configuration at bootstrap |
| `spring-petclinic-vets-service` | HTTP (`GET /config`) | Fetch application configuration at bootstrap |
| `spring-petclinic-visits-service` | HTTP (`GET /config`) | Fetch application configuration at bootstrap |
| `spring-petclinic-api-gateway` | HTTP (`GET /config`) | Fetch application configuration at bootstrap |

Typical endpoint pattern: `http://config-server:8888/{application}/{profile}[/{label}]`

### Blast Radius

An outage or misconfiguration of this service will **prevent all dependent microservices from starting or refreshing their configuration**. This makes the config server a single point of failure for the entire product unless clients are configured with local fallback profiles.

---

## See Also

- [spring-petclinic-microservices-config repository](https://github.com/spring-petclinic/spring-petclinic-microservices-config) — the Git-backed configuration source
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — parent product repository
- [SCENARIOS.md](SCENARIOS.md) — failure scenarios and runbooks for this service
- [Spring Cloud Config Server documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_spring_cloud_config_server) — upstream reference
<!-- generated: 2026-04-13T04:16:49.388Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Coding Standards — spring-petclinic-discovery-server

## TL;DR for Agents

- **Architecture**: This service is a **Spring Cloud Netflix Eureka Server** — its sole purpose is service discovery and registration for the `spring-petclinic-microservices` ecosystem. It contains almost no business logic.
- **Key rule**: The application class must be annotated with `@EnableEurekaServer`; all configuration is externalized via Spring Cloud Config Server and `application.yml`.
- **Naming**: Java files use `PascalCase.java`, classes use `PascalCase`, methods use `camelCase`. No database layer exists in this service.
- **Testing**: Only a context-load integration test (`@SpringBootTest`) exists — any new functionality must at minimum include a context-load verification.
- **Configuration**: The service uses profile-based configuration (`docker` profile) and imports settings from a centralized config server via `spring.config.import`.

---

## Architecture Pattern

This service implements the **Spring Cloud Microservices with Service Discovery (Eureka Server)** pattern. It acts as the central registry where all other microservices in the `spring-petclinic-microservices` system register themselves and discover each other.

```
┌──────────────────────────────────────────────────────────┐
│                   Config Server                          │
│          (externalized configuration source)             │
└──────────────┬───────────────────────────────────────────┘
               │  spring.config.import
               ▼
┌──────────────────────────────────────────────────────────┐
│            Discovery Server (this service)               │
│               @EnableEurekaServer                        │
│                                                          │
│   ┌────────────────────────────────────────────────┐     │
│   │          Eureka Service Registry               │     │
│   └────────────────────────────────────────────────┘     │
└──────────┬──────────┬──────────┬──────────┬──────────────┘
           │          │          │          │
     register/   register/  register/  register/
     discover    discover   discover   discover
           │          │          │          │
           ▼          ▼          ▼          ▼
       ┌───────┐ ┌────────┐ ┌───────┐ ┌────────┐
       │ Vets  │ │ Visits │ │ Custs │ │API GW  │
       │Service│ │Service │ │Service│ │        │
       └───────┘ └────────┘ └───────┘ └────────┘
```

The discovery server itself has **no business logic layers** — it is a thin bootstrap application that enables the embedded Eureka server provided by Spring Cloud Netflix.

---

## Layer Structure

| Layer | Directory | Responsibility | Can Call |
|---|---|---|---|
| **Application Bootstrap** | `spring-petclinic-discovery-server/src/main/java/org/springframework/samples/petclinic/discovery/` | Spring Boot application initialization and Eureka server enablement via `@EnableEurekaServer` | Spring Framework |
| **Configuration** | `spring-petclinic-discovery-server/src/main/resources/` | Application configuration via YAML; externalized config server integration; profile-based overrides | _(none)_ |

> **Note:** This service intentionally has no controller, service, or repository layers. All HTTP endpoints are provided automatically by the Eureka Server starter.

---

## Naming Conventions

| Category | Convention | Example |
|---|---|---|
| **Files** | `PascalCase.java` | `DiscoveryServerApplication.java` |
| **Classes** | `PascalCase` | `DiscoveryServerApplication` |
| **Functions / Methods** | `camelCase` | `main()`, `contextLoads()` |
| **Constants** | `UPPER_SNAKE_CASE` | `DEFAULT_PORT` |
| **Database Columns** | _N/A_ | This service has no database layer |

---

## Error Handling

The discovery server relies entirely on **Spring Framework default exception handling**. There is no custom error handling logic, no `@ControllerAdvice`, and no custom error pages. Errors surface through Spring Boot's default error page mechanism and, when enabled, through Spring Boot Actuator endpoints. If you add any custom endpoints to this service, follow Spring Boot conventions: use `@ExceptionHandler` or `@ControllerAdvice` and return standard `ProblemDetail` (RFC 7807) responses.

---

## Logging

Logging is configured via `application.yml` using Spring Boot's default logging framework (Logback). The configuration applies **level-based filtering**:

- `org.springframework.boot` → `INFO`
- `org.springframework.web` → `INFO`

No custom log formats, appenders, or MDC patterns are defined. When adding log statements, use SLF4J (`org.slf4j.Logger` / `org.slf4j.LoggerFactory`) and follow the existing level conventions — use `INFO` for lifecycle events and `WARN`/`ERROR` for exceptional conditions. Avoid `DEBUG`-level logging in production-bound code unless gated behind a conditional check.

---

## Authentication

The discovery server has **no authentication or authorization** configured. Service-to-service communication relies on open Eureka registration — any service that knows the discovery server's address can register and query the registry. In production environments, consider adding Spring Security with basic authentication or mutual TLS to protect the Eureka dashboard and registration endpoints.

---

## Testing Approach

Testing follows a **minimal integration test** strategy. The sole existing test uses `@SpringBootTest` to verify that the Spring application context loads successfully:

```java
@SpringBootTest
class DiscoveryServerApplicationTests {
    @Test
    void contextLoads() {
    }
}
```

This is the **baseline requirement** — any change to this service must at minimum pass the context-load test. The current test suite does **not** verify actual Eureka functionality (e.g., service registration, heartbeat handling, or dashboard availability). Contributors adding features should include integration tests that verify Eureka behavior, such as asserting that the `/eureka/apps` endpoint returns a valid response.

---

## Notable Patterns

### Spring Cloud Service Discovery

The core pattern of this service. The application class is annotated with `@EnableEurekaServer`, which activates the embedded Netflix Eureka server, including the service registry, the dashboard UI, and the REST API for registration/discovery.

```java
@SpringBootApplication
@EnableEurekaServer
public class DiscoveryServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(DiscoveryServerApplication.class, args);
    }
}
```

**Key points:**
- `@EnableEurekaServer` is the only annotation required beyond `@SpringBootApplication`.
- All Eureka behavior (registry, replication, self-preservation) is configured via properties, not code.
- The dependency `org.springframework.cloud:spring-cloud-starter-netflix-eureka-server` must be on the classpath.

### Externalized Configuration

Configuration is not hardcoded — it is imported from a centralized **Spring Cloud Config Server** using the `spring.config.import` property in `application.yml`. Profile-based overrides (e.g., `docker`) allow environment-specific settings without code changes.

```yaml
# application.yml
spring:
  config:
    import: optional:configserver:http://localhost:8888

---
spring:
  config:
    activate:
      on-profile: docker
  config:
    import: optional:configserver:http://config-server:8888
```

**Key points:**
- The `optional:` prefix ensures the service starts even if the config server is unavailable.
- The `docker` profile overrides the config server hostname for container networking.
- All Eureka tuning (lease duration, renewal interval, self-preservation) should be managed in the config server repository, not in this service's local YAML.

---

## Anti-Patterns to Avoid

- **Minimal test coverage only** — The current suite only verifies context loading. Do not treat this as sufficient for new features. Any new endpoint or configuration change should include targeted integration tests that verify actual Eureka behavior (e.g., `/eureka/apps` responses, dashboard availability).
- **No explicit error handling or logging configuration beyond defaults** — Avoid adding business logic to this service without also adding proper `@ControllerAdvice` error handling and structured logging. Relying solely on Spring defaults becomes opaque in production.
- **No health checks or monitoring endpoints explicitly configured** — Spring Boot Actuator is not explicitly enabled or configured. Before deploying to production, ensure `/actuator/health` is exposed and that Eureka-specific health indicators are active for orchestrator liveness/readiness probes.
- **Avoid adding business logic to this service** — The discovery server should remain a thin infrastructure component. Domain logic belongs in the downstream microservices (`vets-service`, `visits-service`, `customers-service`).

---

## See Also

- [Spring Cloud Netflix Eureka Documentation](https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/)
- [spring-petclinic-microservices root repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [SCENARIOS.md](SCENARIOS.md) — Common operational scenarios and troubleshooting for this service
- [Spring Cloud Config Server Documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/)
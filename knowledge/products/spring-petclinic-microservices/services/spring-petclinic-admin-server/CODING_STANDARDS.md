<!-- generated: 2026-04-13T04:10:15.827Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Coding Standards — spring-petclinic-admin-server

## TL;DR for Agents

- **Architecture**: Spring Boot Admin Server microservice using `@EnableAdminServer` and `@EnableDiscoveryClient` — this is a monitoring/management service, not a business logic service.
- **Key Rule**: This service has no business logic, repositories, or REST controllers of its own; it exists solely to aggregate and expose management endpoints for other microservices.
- **Configuration**: All config is externalized via Spring Cloud Config Server (`spring.config.import: configserver`) with profile-based overrides (e.g., `docker`).
- **Naming**: PascalCase for Java classes, camelCase for methods, `application.yml` for config, `logback-spring.xml` for logging.
- **Dependencies**: Only call Spring Framework, Spring Cloud Discovery, and Spring Boot Admin Server libraries — do not add domain-specific dependencies to this service.

## Architecture Pattern

The `spring-petclinic-admin-server` follows the **Spring Boot Admin Server** pattern. It acts as a centralized monitoring and management dashboard for all microservices in the `spring-petclinic-microservices` ecosystem. It discovers services automatically via Spring Cloud Discovery and provides a UI for health checks, metrics, log level management, and environment inspection.

```
┌─────────────────────────────────────────────────────────┐
│                   Config Server                         │
│            (Centralized Configuration)                  │
└──────────────────────┬──────────────────────────────────┘
                       │ spring.config.import: configserver
                       ▼
┌─────────────────────────────────────────────────────────┐
│            spring-petclinic-admin-server                 │
│  ┌───────────────┐  ┌────────────────────────────────┐  │
│  │ @EnableAdmin   │  │ @EnableDiscoveryClient         │  │
│  │   Server       │  │ (Eureka / Consul registration) │  │
│  └───────────────┘  └──────────────┬─────────────────┘  │
│                                    │                     │
│         Spring Boot Admin UI       │                     │
│    (monitoring, log levels, etc.)  │                     │
└────────────────────────────────────┼─────────────────────┘
                                     │ discovers
                       ┌─────────────┼─────────────┐
                       ▼             ▼             ▼
                ┌───────────┐ ┌───────────┐ ┌───────────┐
                │ customers │ │   vets    │ │  visits   │
                │  service  │ │  service  │ │  service  │
                └───────────┘ └───────────┘ └───────────┘
```

## Layer Structure

| Layer | Directory | Responsibility | Can Call |
|---|---|---|---|
| Application Bootstrap | `spring-petclinic-admin-server/src/main/java/org/springframework/samples/petclinic/admin/` | Spring Boot application initialization, enables Admin Server and Discovery Client | Spring Framework, Spring Cloud Discovery, Spring Boot Admin Server |
| Configuration | `spring-petclinic-admin-server/src/main/resources/` | Application properties (`application.yml`), profile-specific config, logging configuration (`logback-spring.xml`) | — |

> **Note:** This service intentionally has no service, repository, or controller layers. It is an infrastructure service, not a domain service.

## Naming Conventions

### Files

| Category | Convention | Example |
|---|---|---|
| Java classes | PascalCase with `.java` extension | `SpringBootAdminApplication.java` |
| Configuration files | Lowercase with `.yml` extension | `application.yml` |
| Logging config | Lowercase with `-spring.xml` suffix | `logback-spring.xml` |

### Java Identifiers

| Category | Convention | Example |
|---|---|---|
| Classes | PascalCase | `SpringBootAdminApplication` |
| Methods | camelCase | `springBootAdminApplication()` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_SERVER_PORT` |
| Database columns | N/A — this service has no database | — |

## Error Handling

This service relies entirely on Spring Framework's default error handling mechanisms and Spring Boot Actuator's built-in error reporting. Since the admin server contains no custom business logic, there are no application-level exception handlers, `@ControllerAdvice` classes, or custom error responses. Errors from monitored downstream services are surfaced through the Spring Boot Admin UI and actuator health endpoints. If you need to add custom error handling (e.g., for notification channels), follow Spring Boot Admin's `Notifier` abstraction rather than implementing raw exception handlers.

## Logging

Logging is configured via `logback-spring.xml` using Logback as the logging framework. The configuration enables the **JMX Configurator** (`<jmxConfigurator/>`), which allows runtime log level changes through the Spring Boot Admin UI without requiring a service restart. This is a critical feature — it enables operators to dynamically adjust log verbosity for debugging in production. When adding new classes, use SLF4J's `LoggerFactory` for logger creation:

```java
private static final Logger LOG = LoggerFactory.getLogger(MyClass.class);
```

Do not use `System.out.println` or direct Logback API calls.

## Authentication

Authentication is **not explicitly configured** in this service. Security is delegated to the infrastructure layer — specifically Spring Cloud Discovery and Spring Boot Admin Server defaults. In a production deployment, you should secure the admin server with Spring Security (e.g., HTTP Basic or OAuth2) to prevent unauthorized access to actuator endpoints and the admin UI. Any authentication additions should be configured via the externalized Config Server, not hardcoded in `application.yml`.

## Testing Approach

No test classes are visible in the current codebase for this service. Given that this is a thin infrastructure service with only a bootstrap class, testing should focus on:

1. **Application context loading** — Verify the Spring context starts successfully with `@SpringBootTest`.
2. **Configuration validation** — Ensure profile-based config (default, `docker`) resolves correctly.
3. **Discovery client registration** — Integration test confirming the service registers with the discovery server.

Any new tests should be placed in `spring-petclinic-admin-server/src/test/java/org/springframework/samples/petclinic/admin/` following the same package structure as the main source.

## Notable Patterns

### Spring Boot Admin Server Pattern

The core purpose of this service. The `@EnableAdminServer` annotation activates the Spring Boot Admin Server auto-configuration, which provides a web UI and API for monitoring all registered microservices.

```java
@EnableAdminServer
@SpringBootApplication
public class SpringBootAdminApplication {
    public static void main(String[] args) {
        SpringApplication.run(SpringBootAdminApplication.class, args);
    }
}
```

**Key point:** Do not add `@RestController` or business logic to this class. The admin server functionality is entirely provided by the `de.codecentric.boot.admin.server` library.

### Service Discovery Integration

The `@EnableDiscoveryClient` annotation enables automatic registration with the service registry (e.g., Eureka). The admin server uses this to automatically discover and monitor all other microservices without manual configuration of instance URLs.

```java
@EnableDiscoveryClient
@EnableAdminServer
@SpringBootApplication
public class SpringBootAdminApplication {
    // ...
}
```

### Externalized Configuration

All configuration is imported from a centralized Spring Cloud Config Server. This ensures consistency across environments and enables runtime config changes without redeployment.

```yaml
spring:
  config:
    import: optional:configserver:http://localhost:8888
```

### Profile-based Configuration

Environment-specific overrides are handled via Spring profiles. The `docker` profile overrides the Config Server URL to use Docker's internal DNS resolution.

```yaml
---
spring:
  config:
    activate:
      on-profile: docker
    import: optional:configserver:http://config-server:8888
```

## Anti-Patterns to Avoid

- **Adding business logic to this service.** The admin server is an infrastructure concern only. Domain logic belongs in `customers-service`, `vets-service`, or `visits-service`.
- **Hardcoding Config Server URLs without environment variable fallbacks.** The current YAML uses hardcoded `localhost:8888` and `config-server:8888` — prefer environment variable substitution (e.g., `${CONFIG_SERVER_URL:http://localhost:8888}`) for portability across deployment targets.
- **Disabling or removing the JMX Configurator from `logback-spring.xml`.** This is required for runtime log level management through the Admin UI.
- **Adding Spring Security without coordinating with the Config Server.** Security credentials should be externalized, not committed to `application.yml` or source code.
- **Directly depending on other microservice internals.** The admin server should only interact with other services through their actuator endpoints and the discovery registry — never via direct API calls or shared libraries.

## See Also

- [Spring Boot Admin Reference Documentation](https://docs.spring-boot-admin.com/)
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Spring Cloud Config Server documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/)
- [Spring Boot Actuator reference](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
<!-- generated: 2026-04-13T04:09:28.564Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Coding Standards — spring-petclinic-config-server

## TL;DR for Agents

- **Architecture**: Spring Cloud Config Server providing centralized configuration management for the `spring-petclinic-microservices` ecosystem — this is an infrastructure service, not a business-logic service.
- **Key Rule**: The entire module is a thin bootstrap around `@EnableConfigServer`; do not add business logic, REST controllers, or domain models here.
- **Naming**: Java files use `PascalCase.java`, methods use `camelCase`, constants use `UPPER_SNAKE_CASE`.
- **Testing**: Only `@SpringBootTest` context-load tests exist; any new functionality must include integration tests that verify Config Server behavior (not just context loading).
- **Config Backend**: Supports both Git and native (file system) backends via Spring profiles — see `application.yml` for profile-based configuration.

---

## Architecture Pattern

This service implements the **Centralized Configuration Management** pattern using Spring Cloud Config Server. It acts as a single source of truth for externalized configuration consumed by all other microservices in the `spring-petclinic-microservices` system.

```
┌──────────────────────────────────────────────────────────┐
│                  Configuration Backends                   │
│                                                          │
│   ┌─────────────────┐       ┌──────────────────────┐    │
│   │  Git Repository  │       │  Native File System   │    │
│   │  (default)       │       │  (profile: native)    │    │
│   └────────┬────────┘       └──────────┬───────────┘    │
│            │                           │                 │
│            └───────────┬───────────────┘                 │
│                        ▼                                 │
│         ┌──────────────────────────┐                     │
│         │  spring-petclinic-       │                     │
│         │  config-server           │                     │
│         │  (@EnableConfigServer)   │                     │
│         └──────────┬───────────────┘                     │
│                    │                                     │
└────────────────────┼─────────────────────────────────────┘
                     │  HTTP (GET /{app}/{profile})
       ┌─────────────┼──────────────┐
       ▼             ▼              ▼
 ┌───────────┐ ┌──────────┐ ┌────────────┐
 │ customers │ │  vets    │ │  visits    │
 │ service   │ │ service  │ │  service   │
 └───────────┘ └──────────┘ └────────────┘
       ... (all microservices in the system)
```

Each downstream microservice fetches its configuration from this server at startup (and optionally refreshes at runtime).

---

## Layer Structure

| Layer | Directory | Responsibility | Can Call |
|---|---|---|---|
| Application Bootstrap | `src/main/java/org/springframework/samples/petclinic/config/` | Spring Boot entry point; enables Config Server via `@EnableConfigServer` | Spring Cloud Config Server |
| Configuration | `src/main/resources/` | Server configuration (`application.yml`); defines Git/native backend, port, and profile-specific settings | — |

> **Note**: This service intentionally has only two layers. It is a pure infrastructure component with no domain, service, or repository layers.

---

## Naming Conventions

| Category | Convention | Example |
|---|---|---|
| Files | `PascalCase.java` | `ConfigServerApplication.java` |
| Classes | `PascalCase` | `ConfigServerApplication` |
| Functions / Methods | `camelCase` | `main(String[] args)` |
| Constants | `UPPER_SNAKE_CASE` | `DEFAULT_PORT` |
| Database Columns | N/A | This service has no database |

---

## Error Handling

This module relies entirely on **default Spring Boot error handling**. There are no custom exception classes, `@ControllerAdvice` handlers, or error response DTOs. If the Config Server cannot reach its backend (Git repository or native file system), Spring Cloud Config Server surfaces standard HTTP error responses (e.g., `500 Internal Server Error`). When contributing to this module, do **not** introduce custom error handling unless the change is coordinated across all consuming microservices, since clients depend on the default Spring Cloud Config error contract.

---

## Logging

The service uses **default Spring Boot logging** (Logback with console output). No explicit structured logging configuration (e.g., JSON format, MDC enrichment, or custom `logback-spring.xml`) is present. Log levels can be adjusted via `application.yml` or environment variables following standard Spring Boot conventions (e.g., `logging.level.org.springframework.cloud.config=DEBUG`). When adding log statements, use SLF4J (`org.slf4j.Logger`) and follow standard Spring Boot idioms.

---

## Authentication

**No authentication or authorization is configured** on this Config Server module. All configuration endpoints are publicly accessible by default. This is acceptable for local development and Docker Compose environments but represents a security concern for production deployments. If securing this service, consider Spring Security with Basic Auth or mutual TLS, and ensure all client microservices are updated with corresponding credentials.

---

## Testing Approach

Testing uses **JUnit 5 (Jupiter)** with `@SpringBootTest` for integration testing. Currently, the only test is a **context-load smoke test** that verifies the Spring application context starts successfully.

```java
@SpringBootTest
class ConfigServerApplicationTests {
    @Test
    void contextLoads() {
    }
}
```

When contributing new functionality:

- Always include at least one integration test that exercises the Config Server's HTTP endpoints (e.g., `GET /{application}/{profile}`).
- Use `@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)` with `TestRestTemplate` for endpoint verification.
- Use the `native` profile in tests to avoid external Git dependencies.

---

## Notable Patterns

### Spring Cloud Config Server Pattern

The core of this service is a single annotation that transforms a standard Spring Boot application into a fully functional Config Server.

```java
@SpringBootApplication
@EnableConfigServer
public class ConfigServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}
```

`@EnableConfigServer` auto-configures all REST endpoints for serving configuration to client microservices. Do not manually define configuration-serving controllers.

### Multi-Profile Configuration (Git + Native Backend)

The `application.yml` supports multiple configuration backends selected via Spring profiles:

```yaml
# Default: Git backend
spring:
  cloud:
    config:
      server:
        git:
          uri: https://github.com/spring-petclinic/spring-petclinic-microservices-config

---
# Activated with: --spring.profiles.active=native
spring:
  profiles: native
  cloud:
    config:
      server:
        native:
          searchLocations: file:///${HOME}/config-repo
```

Use the `native` profile for local development and testing to avoid Git network dependencies.

### Maven Multi-Module Project

This service is a child module of the `spring-petclinic-microservices` parent POM. Dependency versions and plugin configurations are inherited from the parent. Do not override dependency versions in this module's `pom.xml` unless absolutely necessary — manage versions in the parent POM instead.

---

## Anti-Patterns to Avoid

- **Minimal test coverage** — Do not add functionality without corresponding tests. The existing context-load-only test is insufficient as a model; write tests that verify actual Config Server behavior (endpoint responses, profile resolution, etc.).
- **No explicit error handling or validation** — While acceptable for the current thin module, any added endpoints or custom logic must include proper error handling and input validation.
- **Hardcoded Git URI in `application.yml`** — The Git repository URI should be externalized via environment variables (e.g., `SPRING_CLOUD_CONFIG_SERVER_GIT_URI`) rather than committed directly in `application.yml`. When modifying configuration, prefer `${ENV_VAR:default-value}` syntax.
- **No health checks or monitoring endpoints explicitly configured** — Spring Boot Actuator is available via Jolokia, but explicit health indicators for the config backend (Git connectivity, file system availability) are not configured. Consider adding `management.endpoints.web.exposure.include=health,info` and verifying the `/actuator/health` endpoint reflects backend status.
- **Adding business logic to this module** — This is an infrastructure service. Domain models, business services, and application-specific REST controllers belong in the respective microservice modules, not here.

---

## See Also

- [spring-petclinic-microservices (parent repository)](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [spring-petclinic-microservices-config (configuration repository)](https://github.com/spring-petclinic/spring-petclinic-microservices-config)
- [Spring Cloud Config Server Reference Documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_spring_cloud_config_server)
- [Spring Boot Externalized Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config)
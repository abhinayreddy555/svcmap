<!-- generated: 2026-04-13T04:06:35.840Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# spring-petclinic-config-server

> Centralized configuration server for the Spring PetClinic microservices ecosystem, serving dynamic configuration to all downstream services via Spring Cloud Config.

## TL;DR for Agents

- **What it does:** Serves externalized configuration to all PetClinic microservices at runtime using Spring Cloud Config Server — it is the single source of truth for application properties across the system.
- **Key dependency:** Fetches configuration files from an external Git repository at [spring-petclinic-microservices-config](https://github.com/spring-petclinic/spring-petclinic-microservices-config). If this repo is unreachable, no microservice can retrieve its config.
- **Entry point for bugs:** Start at `ConfigServerApplication.java` — the entire service is a single Spring Boot app with `@EnableConfigServer`; most issues will be in `application.yml` (backend URI, profiles) or in the external config repo itself.
- **No database:** This service owns no database and persists no state.
- **Not business logic:** This service contains zero domain logic — if you're debugging a business rule, this is the wrong service.

## Service Identity

| Attribute          | Value                                                                                  |
|--------------------|----------------------------------------------------------------------------------------|
| **Type**           | API (Configuration Server)                                                             |
| **Language**       | Java                                                                                   |
| **Framework**      | Spring Boot + Spring Cloud Config Server                                               |
| **Runtime**        | Java 11+                                                                               |
| **Repo**           | `spring-petclinic/spring-petclinic-microservices`                                      |
| **Primary Database** | None                                                                                 |
| **Deployed on**    | Typically the first service started; must be available before other microservices boot  |

## Responsibilities

### What it owns

- Serving centralized configuration properties to all PetClinic microservices at startup and on refresh.
- Connecting to and reading from the Git-based (or native file system) configuration backend.
- Exposing REST endpoints (e.g., `/{application}/{profile}`, `/{application}/{profile}/{label}`) for config retrieval.
- Supporting multiple Spring profiles and label-based versioning of configuration.

### This service does NOT handle:

- **Business logic implementation** — no domain rules live here.
- **Data persistence** — no databases are owned or managed.
- **Client-side configuration caching** — each consuming microservice is responsible for caching its own config.
- **Encryption of sensitive properties** — delegated to client implementations or external vaults.

## Entry Points

| File | Description |
|------|-------------|
| `src/main/java/org/springframework/samples/petclinic/config/ConfigServerApplication.java` | Spring Boot application entry point annotated with `@EnableConfigServer` to activate all config server functionality. |

## Key Abstractions

### Spring Cloud Config Server
The core framework component activated by `@EnableConfigServer`. Automatically exposes REST endpoints that serve configuration properties to client microservices based on application name, profile, and label.

### Git Backend Configuration Provider
The default backend strategy. Clones and reads configuration files from the remote Git repository at `https://github.com/spring-petclinic/spring-petclinic-microservices-config`. Configuration changes are picked up on the next client request or refresh event.

### File System Native Backend Provider
An alternative backend (`spring.profiles.active=native`) that reads configuration from the local file system instead of Git. Useful for local development and testing.

## What an Agent Needs to Know to Work on This Service

### Where to start
1. **`ConfigServerApplication.java`** — This is the only Java source file of significance. The service is almost entirely configuration-driven.
2. **`src/main/resources/application.yml`** — This is where the real configuration lives: the Git URI, default label, search paths, and server port. Most bugs and misconfigurations originate here.

### Key patterns
- **Convention over code:** The service has virtually no custom code. Spring Cloud Config Server auto-configures everything based on properties.
- **Startup order matters:** This service **must** be running and healthy before any other microservice starts, since they fetch their configuration from it on boot.
- **Testing:** Tests use `@SpringBootTest` to verify the application context loads correctly. If the context fails to load, check the Git backend URI and network connectivity.
- **Common failure modes:**
  - External config Git repo is unreachable → all downstream services fail to start.
  - Incorrect `spring.cloud.config.server.git.uri` → `404` or connection errors on config fetch.
  - Port conflict on default port (typically `8888`) → service fails to bind.

### Quick commands
```bash
# Build the config server
./mvnw -pl spring-petclinic-config-server clean package

# Run locally
java -jar spring-petclinic-config-server/target/*.jar

# Verify it serves config (example for the 'customers-service' app)
curl http://localhost:8888/customers-service/default
```

## Related Documents

- [API.md](API.md) — REST endpoint details and response formats
- [SCENARIOS.md](SCENARIOS.md) — Common operational scenarios and troubleshooting flows
- [DEPENDENCIES.md](DEPENDENCIES.md) — Full dependency graph including the external config repository
- [RUNBOOK.md](RUNBOOK.md) — Operational runbook for startup, health checks, and incident response

## See Also

- [Spring Cloud Config Server Reference Documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_spring_cloud_config_server)
- [spring-petclinic-microservices-config repository](https://github.com/spring-petclinic/spring-petclinic-microservices-config) — the external configuration source
- [spring-petclinic-microservices root repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — parent project with Docker Compose and full system setup
- [Spring Cloud Config Client documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_spring_cloud_config_client) — how downstream services consume configuration from this server
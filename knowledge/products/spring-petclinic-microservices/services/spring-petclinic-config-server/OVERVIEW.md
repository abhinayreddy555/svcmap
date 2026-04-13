<!-- generated: 2026-04-13T03:59:39.708Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# spring-petclinic-config-server

> Centralized configuration server for the Spring PetClinic microservices ecosystem, serving dynamic configuration to all downstream services via Spring Cloud Config.

## TL;DR for Agents

- **What it does:** Serves externalized configuration to all PetClinic microservices via HTTP endpoints using Spring Cloud Config Server — it is the single source of truth for runtime configuration.
- **Key dependency:** Fetches configuration files from an external Git repository at `https://github.com/spring-petclinic/spring-petclinic-microservices-config`. If this repo is unreachable, no microservice can retrieve its config.
- **Entry point for bugs:** Start at `ConfigServerApplication.java` — the entire service is a single Spring Boot app with `@EnableConfigServer`; most issues will be in `application.yml` or the upstream config repo, not in Java code.
- **No database:** This service owns no database and persists no state.
- **Blast radius:** If this service is down or misconfigured, **every microservice in the ecosystem** will fail to start or refresh configuration.

## Service Identity

| Attribute          | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Type**           | API (Configuration Server)                                            |
| **Language**       | Java                                                                  |
| **Framework**      | Spring Boot + Spring Cloud Config Server                              |
| **Runtime**        | Java 11+                                                              |
| **Repo**           | `spring-petclinic/spring-petclinic-microservices`                     |
| **Primary Database** | None                                                                |
| **Deployed on**    | Typically the first service started; must be available before clients  |

## Responsibilities

### What it owns

- Serving centralized configuration properties to all PetClinic microservices over HTTP (`/{application}/{profile}`, `/{application}/{profile}/{label}`)
- Connecting to and reading from the external Git-based configuration repository
- Supporting both Git-based and file system configuration backends
- Providing environment-specific (profile-based) configuration resolution

### This service does NOT handle:

- **Business logic implementation** — it has zero domain logic
- **Data persistence** — no databases, no state
- **Client-side configuration caching** — that is the responsibility of each consuming microservice (via Spring Cloud Config Client)
- **Encryption key management** — secrets encryption/decryption is not configured by default

## Entry Points

| File | Description |
|------|-------------|
| `src/main/java/org/springframework/samples/petclinic/config/ConfigServerApplication.java` | Spring Boot application entry point; the `@EnableConfigServer` annotation activates all Config Server functionality |

## Key Abstractions

### Spring Cloud Config Server
The core framework component activated by `@EnableConfigServer`. It exposes REST endpoints that microservices call to fetch their configuration properties at startup and during refresh events. Endpoints follow the pattern `/{application}/{profile}[/{label}]`.

### Git Backend Configuration Provider
The default backend that clones and reads configuration files from the remote Git repository (`spring-petclinic-microservices-config`). Configuration is resolved by matching the requesting application's name and active profile to files in the repo (e.g., `customers-service.yml`, `customers-service-docker.yml`).

### File System Backend Configuration Provider
An alternative backend that reads configuration from the local file system. Useful for local development or air-gapped environments. Activated via Spring profile or `spring.cloud.config.server.native.searchLocations` property.

## What an Agent Needs to Know to Work on This Service

### Where to start
1. **Java code is minimal.** The entire service is essentially one class (`ConfigServerApplication.java`) with two annotations. Almost all behavior comes from Spring Cloud Config Server auto-configuration.
2. **Configuration is king.** Look at `src/main/resources/application.yml` for the Git repo URI, default label, search paths, and server port (typically `8888`).
3. **The real config lives elsewhere.** The actual property files served to clients are in the external repo: `https://github.com/spring-petclinic/spring-petclinic-microservices-config`. If a microservice is getting wrong values, check that repo first.

### Key patterns
- **Startup order matters.** This service must be running before any client microservice starts. Look for `spring.config.import` or `spring.cloud.config.uri` in client services pointing to this server.
- **Testing is lightweight.** Tests use `@SpringBootTest` to verify the application context loads correctly. There is no complex test infrastructure.
- **Debugging config resolution:** Hit the config server directly:
  ```
  curl http://localhost:8888/{application-name}/{profile}
  ```
  This returns the resolved JSON configuration, making it easy to verify what a client would receive.

### Common failure modes

| Symptom | Likely Cause | First Check |
|---------|-------------|-------------|
| All microservices fail to start | Config server is down | `curl http://localhost:8888/actuator/health` |
| Config server starts but returns empty config | Git repo URI misconfigured or unreachable | Check `application.yml` → `spring.cloud.config.server.git.uri` |
| Wrong config values served | Wrong branch/label or file naming mismatch | Verify `default-label` and file names in the config repo |

## Related Documents

- [API.md](API.md) — Config Server HTTP endpoints and response formats
- [SCENARIOS.md](SCENARIOS.md) — Common operational scenarios and troubleshooting flows
- [DEPENDENCIES.md](DEPENDENCIES.md) — Detailed dependency graph including the external config Git repository
- [RUNBOOK.md](RUNBOOK.md) — Operational procedures for startup, health checks, and incident response

## See Also

- [spring-petclinic-microservices-config repository](https://github.com/spring-petclinic/spring-petclinic-microservices-config) — The external Git repo containing all configuration files served by this server
- [Spring Cloud Config Server documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_spring_cloud_config_server) — Official reference for Config Server features and configuration options
- [spring-petclinic-microservices root repo](https://github.com/spring-petclinic/spring-petclinic-microservices) — Parent repository containing all PetClinic microservices
- [DEPENDENCIES.md](DEPENDENCIES.md) — Full mapping of which services depend on this config server
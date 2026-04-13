<!-- generated: 2026-04-13T04:00:02.794Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# API Reference — spring-petclinic-config-server

## TL;DR for Agents

- **Zero custom API endpoints detected** — this service is a Spring Cloud Config Server, not a business API. It serves configuration to other microservices.
- **No custom authentication mechanism** is explicitly configured in the extracted contracts.
- The config server exposes **Spring Cloud Config native endpoints** (e.g., `/{application}/{profile}`, `/{application}/{profile}/{label}`) for serving externalized configuration.
- This service is an **infrastructure component** of the `spring-petclinic-microservices` system — if you're looking for pet/owner/vet business APIs, see the individual microservices.
- **No events, GraphQL types, or gRPC services** are defined for this service.

---

## Authentication

No authentication mechanism was detected in the extracted API contracts for this service.

In the default `spring-petclinic-microservices` setup, the config server typically runs on an internal network and is accessed by other microservices without token-based auth. In production deployments, you would typically secure it via:

| Method | Description |
|---|---|
| HTTP Basic Auth | Configured via `spring.security.user.name` / `spring.security.user.password` on the config server, and `spring.cloud.config.username` / `spring.cloud.config.password` on clients |
| Network-level security | Restrict access to the config server port at the infrastructure layer |

---

## Base URL

No explicit base URL was found in the extracted contracts. The config server's default and typical configurations are:

| Environment | Base URL | Notes |
|---|---|---|
| Local / Default | `http://localhost:8888` | Default Spring Cloud Config Server port |
| Docker Compose | `http://config-server:8888` | Service name as hostname within Docker network |
| Kubernetes | `http://config-server.default.svc.cluster.local:8888` | Adjust namespace as needed |

---

## Endpoints

No custom endpoints were extracted from the service contracts. However, as a **Spring Cloud Config Server**, this service automatically exposes the following native configuration endpoints:

### GET `/{application}/{profile}`

**Purpose:** Retrieve configuration properties for a given application and active profile.

| Parameter | Type | Description |
|---|---|---|
| `application` | path | The `spring.application.name` of the client service (e.g., `customers-service`) |
| `profile` | path | The active Spring profile (e.g., `default`, `docker`) |

**Example:**
```
GET http://localhost:8888/customers-service/default
```

**Response (success):**
```json
{
  "name": "customers-service",
  "profiles": ["default"],
  "label": null,
  "version": null,
  "propertySources": [
    {
      "name": "classpath:/config/customers-service.yml",
      "source": {
        "server.port": 8081,
        "spring.datasource.url": "jdbc:mysql://localhost:3306/petclinic"
      }
    }
  ]
}
```

| Status Code | Description |
|---|---|
| `200 OK` | Configuration returned successfully |
| `404 Not Found` | No configuration found for the given application/profile |

### GET `/{application}/{profile}/{label}`

**Purpose:** Retrieve configuration for a specific application, profile, and Git branch/label.

| Parameter | Type | Description |
|---|---|---|
| `application` | path | Client application name |
| `profile` | path | Active Spring profile |
| `label` | path | Git branch, tag, or commit hash (e.g., `main`, `v1.0`) |

### GET `/{application}-{profile}.yml`

**Purpose:** Retrieve configuration as a raw YAML file.

### GET `/{application}-{profile}.properties`

**Purpose:** Retrieve configuration as a raw `.properties` file.

---

## Events

No events (publish or subscribe) were detected for this service. The config server is a synchronous, pull-based configuration provider. Client microservices poll or fetch configuration at startup.

> **Note:** In setups using **Spring Cloud Bus**, the config server can publish refresh events (typically over RabbitMQ or Kafka) via `POST /actuator/busrefresh`. This was not detected in the current contract extraction.

---

## See Also

- [Spring Cloud Config Server Documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_spring_cloud_config_server)
- [spring-petclinic-microservices GitHub Repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Spring Cloud Bus Reference](https://docs.spring.io/spring-cloud-bus/docs/current/reference/html/) — for distributed configuration refresh events
- [SCENARIOS.md](SCENARIOS.md) — common integration and debugging scenarios for this service
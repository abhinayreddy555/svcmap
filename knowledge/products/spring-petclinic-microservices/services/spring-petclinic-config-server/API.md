<!-- generated: 2026-04-13T04:06:59.271Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# API Reference — spring-petclinic-config-server

## TL;DR for Agents

- **Zero application-level API endpoints** are exposed by this service — it is a **Spring Cloud Config Server**, not a business API.
- The config server serves externalized configuration to other microservices in the `spring-petclinic-microservices` ecosystem via Spring Cloud Config protocol.
- **No custom authentication mechanism** is defined in the extracted contracts.
- The only HTTP interfaces are the **Spring Cloud Config native endpoints** (e.g., `/{application}/{profile}`, `/{application}-{profile}.yml`) used internally by other services to fetch their configuration at startup.
- If you are looking for Pet Clinic business APIs (owners, vets, visits), see the individual service docs or the API gateway.

## Authentication

No authentication mechanism was identified in the extracted API contracts for this service.

By default, Spring Cloud Config Server endpoints are unauthenticated. In production deployments, access is typically restricted via:

| Method | Details |
|---|---|
| Network-level isolation | Config server is only reachable from internal service network |
| Spring Security (if added) | Basic auth with `spring.security.user.name` / `spring.security.user.password` |
| Token-based | Not configured by default in this repository |

## Base URL

The base URL is not explicitly defined in the extracted contracts. Standard defaults for Spring Cloud Config Server:

| Environment | Base URL | Notes |
|---|---|---|
| Local development | `http://localhost:8888` | Default Spring Cloud Config Server port |
| Docker Compose | `http://config-server:8888` | Service name as hostname within Docker network |
| Kubernetes | `http://config-server.default.svc.cluster.local:8888` | Adjust namespace as needed |

Other microservices reference this via their `spring.cloud.config.uri` property.

## Spring Cloud Config Native Endpoints

Since this service has **no custom API endpoints**, the only HTTP interfaces are the built-in Spring Cloud Config Server endpoints. These are not business APIs — they serve configuration files to client microservices.

### GET `/{application}/{profile}[/{label}]`

**Purpose:** Retrieve configuration properties for a given application, profile, and optional Git label (branch/tag).

**Auth:** None by default (see [Authentication](#authentication)).

**Example Request:**

```
GET /customers-service/default/main
```

**Response (Success):**

```json
{
  "name": "customers-service",
  "profiles": ["default"],
  "label": "main",
  "propertySources": [
    {
      "name": "https://github.com/spring-petclinic/spring-petclinic-microservices-config/customers-service.yml",
      "source": {
        "server.port": 8081,
        "spring.datasource.url": "jdbc:mysql://localhost:3306/petclinic"
      }
    }
  ]
}
```

| Status Code | Meaning |
|---|---|
| `200` | Configuration returned successfully |
| `404` | Application or profile not found (returns empty property sources) |
| `500` | Backend config repository (Git) unreachable |

### GET `/{application}-{profile}.yml`

**Purpose:** Retrieve configuration as a raw YAML file.

```
GET /customers-service-default.yml
```

### GET `/{application}-{profile}.properties`

**Purpose:** Retrieve configuration as a raw `.properties` file.

```
GET /customers-service-default.properties
```

### POST `/actuator/bus-refresh` *(if Spring Cloud Bus is enabled)*

**Purpose:** Trigger a configuration refresh event across all connected services.

| Status Code | Meaning |
|---|---|
| `204` | Refresh event published successfully |
| `405` | Bus refresh not enabled |

## Events

No custom events (Kafka, RabbitMQ topics, etc.) are published or subscribed to by the config server based on the extracted contracts.

> **Note:** If Spring Cloud Bus is enabled in the deployment, the config server may publish refresh events on a message broker topic (e.g., `springCloudBus`), but this is not part of the default extracted configuration.

## See Also

- [Spring Cloud Config Server Documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_spring_cloud_config_server)
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [spring-petclinic-microservices-config repository](https://github.com/spring-petclinic/spring-petclinic-microservices-config) — the Git backend holding the actual configuration files served by this config server
- [SCENARIOS.md](SCENARIOS.md) — common integration and debugging scenarios
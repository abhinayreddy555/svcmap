<!-- generated: 2026-04-13T04:22:14.866Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Configuration — spring-petclinic-genai-service

## TL;DR for Agents

- **Zero required secrets or environment variables** are declared in this configuration file — all config is managed via Spring Cloud and dependency injection.
- **No feature flags** are defined in this file.
- This is a Spring AI configuration class that defines beans for a **vector store** and a **load-balanced WebClient**.
- Configuration values are likely resolved from external sources (e.g., Spring Cloud Config Server, `application.yml`, or profile-specific property files).
- If you're debugging missing beans (`VectorStore`, `WebClient`), this is the relevant config class.

## Environment Variables

No environment variables are explicitly declared in this configuration file.

| Key | Required | Default | Category | Description | Sensitivity Note |
|-----|----------|---------|----------|-------------|------------------|
| _None declared_ | — | — | — | — | — |

> **Note:** Runtime configuration for this service (e.g., AI provider API keys, vector store connection strings, Spring Cloud Config Server URI) is expected to be supplied via Spring Cloud Config, `application.yml`/`application.properties`, or Kubernetes ConfigMaps/Secrets. Check the service's property files and the central config repository for the full set of required variables.

## Feature Flags

No feature flags are declared in this configuration file.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| _None declared_ | — | — | — |

## Deployment Notes

This is a Spring AI configuration class that defines beans for a **vector store** and a **load-balanced `WebClient`**. No environment variables or feature flags are declared directly in this file. All configuration is managed through Spring Cloud's externalized configuration mechanism and standard Spring dependency injection. When deploying this service, ensure that:

1. The **Spring Cloud Config Server** is reachable and serving the correct profile/label for `spring-petclinic-genai-service`.
2. Any **AI provider credentials** (e.g., OpenAI API keys) required by Spring AI are provisioned as secrets and injected via environment variables or a secrets manager — these will be referenced in the service's `application.yml` or bootstrap configuration, not in this Java config class.
3. The **vector store backend** (e.g., an in-memory store, PGVector, or another supported provider) is available and properly configured in the property files.
4. The `WebClient` bean is annotated or configured with `@LoadBalanced`, meaning it relies on **Spring Cloud LoadBalancer** (or Eureka/Ribbon) for service discovery. Ensure the discovery server is running and that downstream services are registered.

Because this file contains no inline defaults or hardcoded values, all tuning and secret management must happen in the externalized configuration layer.

## See Also

- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Spring AI Reference Documentation](https://docs.spring.io/spring-ai/reference/)
- [Spring Cloud Config Documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/)
- [SCENARIOS.md](SCENARIOS.md)
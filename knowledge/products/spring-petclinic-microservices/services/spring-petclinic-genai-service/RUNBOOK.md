<!-- generated: 2026-04-13T04:24:22.058Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Runbook — spring-petclinic-genai-service

## TL;DR for Agents

- **Health check endpoint:** Not explicitly configured — assume Spring Boot Actuator default at `/actuator/health` if Actuator is on the classpath.
- **Most common failure:** AI/embedding model connectivity issues and `SimpleVectorStore` initialization failures due to missing or corrupt vector data.
- **Is restart safe?** Likely yes — this is a stateless Spring Boot API service, but note that `SimpleVectorStore` holds vectors in memory; a restart will lose any non-persisted vector data.
- **Service-to-service communication** uses a `@LoadBalanced` `WebClient`, meaning it depends on a service registry (e.g., Eureka) being available.
- **No explicit rollback, scaling, or deployment platform** information is documented in the source — follow your org's standard Spring Boot microservice procedures.

---

## Service Identity

| Field                 | Value                                                                                         |
|-----------------------|-----------------------------------------------------------------------------------------------|
| **Service Name**      | `spring-petclinic-genai-service`                                                              |
| **Product**           | `spring-petclinic-microservices`                                                              |
| **Repository**        | `spring-petclinic/spring-petclinic-microservices`                                             |
| **Service Type**      | API (Spring Boot with Spring AI integration)                                                  |
| **Health Endpoint**   | `/actuator/health` (assumed — Spring Boot Actuator default)                                   |
| **Metrics Endpoint**  | `/actuator/prometheus` or `/actuator/metrics` (assumed — Spring Boot Actuator default)        |
| **Deployment Platform** | Not documented — check org-specific deployment configs                                      |
| **Scaling Notes**     | Not documented — note that `SimpleVectorStore` is in-memory and not shared across instances   |
| **Key Dependencies**  | Service registry (Eureka), AI/Embedding model provider, upstream petclinic microservices      |

---

## Startup Procedure

> No explicit startup procedure was documented in the source. The following is inferred from the Spring Boot + Spring AI stack.

1. Ensure the **service registry** (e.g., Eureka Server) is running and reachable.
2. Ensure the **AI/Embedding model provider** (e.g., OpenAI API, Ollama, or other configured LLM backend) is accessible and credentials/environment variables are set.
3. Verify required environment variables or config properties are present (e.g., API keys for the embedding model, service registry URL).
4. Start the service:
   ```bash
   java -jar spring-petclinic-genai-service.jar
   ```
   Or via Maven in development:
   ```bash
   ./mvnw spring-boot:run -pl spring-petclinic-genai-service
   ```
5. Confirm the service has registered with the service registry by checking the Eureka dashboard or calling:
   ```bash
   curl http://localhost:<port>/actuator/health
   ```
6. Verify vector store initialization by checking application logs for successful `SimpleVectorStore` and `EmbeddingModel` bean creation.

---

## Graceful Shutdown

> No explicit shutdown behaviour was documented in the source.

**Assumed behaviour (Spring Boot defaults):**

- On receiving `SIGTERM`, Spring Boot initiates graceful shutdown if `server.shutdown=graceful` is configured.
- In-flight HTTP requests are given a configurable timeout (`spring.lifecycle.timeout-per-shutdown-phase`, default 30s) to complete.
- The `SimpleVectorStore` is in-memory — **any vectors not persisted to disk will be lost on shutdown**.
- The service deregisters from the service registry (Eureka) during shutdown.
- If graceful shutdown is **not** configured, the process terminates immediately on `SIGTERM`.

**Recommendation:** Confirm whether `server.shutdown=graceful` is set in `application.yml` / `application.properties`.

---

## Common Failure Modes

### 1. Embedding Model Unavailable

| Field              | Detail |
|--------------------|--------|
| **Symptom**        | `5xx` errors on AI-related endpoints; logs show connection refused or timeout errors to the embedding/LLM provider. |
| **Likely Cause**   | AI model provider (OpenAI, Ollama, etc.) is down, unreachable, or API key is invalid/expired. |
| **Immediate Action** | Check connectivity to the AI provider. Verify API key environment variables are set and valid. |
| **Investigation Steps** | |

1. Check application logs for `EmbeddingModel` or HTTP client errors:
   ```bash
   kubectl logs <pod-name> | grep -i "embedding\|openai\|ollama\|connection"
   ```
2. Test connectivity to the AI provider from the pod/host:
   ```bash
   curl -v https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"
   ```
3. Verify environment variables:
   ```bash
   env | grep -i "OPENAI\|AI_\|SPRING_AI"
   ```
4. If using a self-hosted model (e.g., Ollama), verify the model server is running and healthy.

---

### 2. SimpleVectorStore Initialization Failure

| Field              | Detail |
|--------------------|--------|
| **Symptom**        | Service fails to start; logs show `BeanCreationException` related to `SimpleVectorStore` or `EmbeddingModel`. |
| **Likely Cause**   | Missing or misconfigured embedding model bean; corrupt or missing persisted vector store file (if loading from disk). |
| **Immediate Action** | Check startup logs for the root cause exception. Ensure the embedding model dependency is correctly configured. |
| **Investigation Steps** | |

1. Review full stack trace in startup logs:
   ```bash
   kubectl logs <pod-name> | head -200
   ```
2. Verify that the embedding model auto-configuration is satisfied (correct Spring AI starter on classpath, required properties set).
3. If the vector store loads from a file, verify the file exists and is not corrupt.
4. Restart the service after fixing configuration — restart is safe.

---

### 3. Service Registry (Eureka) Unreachable

| Field              | Detail |
|--------------------|--------|
| **Symptom**        | Service starts but cannot communicate with other petclinic microservices; `@LoadBalanced` `WebClient` calls fail with `No instances available` or `UnknownHostException`. |
| **Likely Cause**   | Eureka server is down, or the genai-service cannot reach it due to network/DNS issues. |
| **Immediate Action** | Verify Eureka server is running. Check network connectivity from the genai-service pod/host. |
| **Investigation Steps** | |

1. Check Eureka server health:
   ```bash
   curl http://<eureka-host>:8761/actuator/health
   ```
2. Check genai-service logs for Eureka registration errors:
   ```bash
   kubectl logs <pod-name> | grep -i "eureka\|discovery\|registry"
   ```
3. Verify `eureka.client.service-url.defaultZone` is correctly configured.
4. Check if other services are visible in the Eureka dashboard.

---

### 4. Downstream Service Communication Failure

| Field              | Detail |
|--------------------|--------|
| **Symptom**        | API calls that aggregate data from other petclinic services return errors or timeouts. Logs show `WebClient` errors. |
| **Likely Cause**   | Target microservice is down, overloaded, or not registered in the service registry. |
| **Immediate Action** | Check the health of the target downstream service. Verify it is registered in Eureka. |
| **Investigation Steps** | |

1. Identify which downstream service is failing from the error logs.
2. Check the downstream service's health endpoint.
3. Verify the service is registered in Eureka:
   ```bash
   curl http://<eureka-host>:8761/eureka/apps/<SERVICE-NAME>
   ```
4. Check for network policies or firewall rules blocking inter-service traffic.

---

## Rollback Procedure

> No explicit rollback steps were documented. Follow standard procedures for your deployment platform.

1. Identify the last known good version/image tag from your deployment history:
   ```bash
   # Example for Kubernetes
   kubectl rollout history deployment/spring-petclinic-genai-service
   ```
2. Roll back to the previous revision:
   ```bash
   kubectl rollout undo deployment/spring-petclinic-genai-service
   ```
3. Monitor the rollout:
   ```bash
   kubectl rollout status deployment/spring-petclinic-genai-service
   ```
4. Verify health after rollback:
   ```bash
   curl http://<service-host>:<port>/actuator/health
   ```
5. If using a CI/CD pipeline, trigger a redeployment of the previous known-good artifact version.

---

## Useful Commands

**Check service health:**
```bash
curl -s http://localhost:<port>/actuator/health | jq .
```

**Tail application logs (Kubernetes):**
```bash
kubectl logs -f deployment/spring-petclinic-genai-service
```

**Check Eureka registration status:**
```bash
curl -s http://<eureka-host>:8761/eureka/apps/GENAI-SERVICE | xmllint --format -
```

**Check environment variables in a running pod:**
```bash
kubectl exec <pod-name> -- env | grep -i "spring\|ai\|openai"
```

**Build the service locally:**
```bash
./mvnw clean package -pl spring-petclinic-genai-service -am -DskipTests
```

**Run locally with a specific profile:**
```bash
java -jar spring-petclinic-genai-service/target/*.jar --spring.profiles.active=<profile>
```

---

## Environment Notes

- **Framework:** Spring Boot application with **Spring AI** integration.
- **Vector Store:** Uses `SimpleVectorStore` (in-memory). Vector data is **not shared across instances** and will be **lost on restart** unless explicitly persisted to disk.
- **Embedding Model:** Uses Spring AI's `EmbeddingModel` abstraction. The concrete implementation (OpenAI, Ollama, etc.) depends on which Spring AI starter is on the classpath and how it is configured.
- **Service Communication:** A `@LoadBalanced` `WebClient` is configured for service-to-service calls, meaning requests are routed through the service registry (Eureka) using logical service names rather than hardcoded URLs.
- **Scaling Caveat:** Because `SimpleVectorStore` is in-memory and instance-local, scaling to multiple replicas means each instance has its own independent vector store. If vector data consistency across instances is required, consider an external vector database.

---

## Escalation

| Situation                                      | Who to Contact                                      |
|------------------------------------------------|-----------------------------------------------------|
| AI/Embedding model provider outage             | AI/ML platform team or provider status page          |
| Service registry (Eureka) down                 | Platform / infrastructure team                       |
| Persistent vector store data loss              | Application team / service owner                     |
| Deployment pipeline failure                    | DevOps / CI-CD team                                  |
| Unknown application-level bug                  | `spring-petclinic-microservices` repo maintainers    |

---

## See Also

- [spring-petclinic-microservices GitHub Repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Spring AI Reference Documentation](https://docs.spring.io/spring-ai/reference/)
- [Spring Boot Actuator — Production-Ready Features](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [Spring Cloud Netflix Eureka Documentation](https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/)
<!-- generated: 2026-04-13T04:10:08.692Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Runbook — spring-petclinic-config-server

## TL;DR for Agents

- **Health check**: No dedicated endpoint in code; use Spring Boot Actuator default at `/actuator/health` (if enabled) on **port 8888**.
- **Most common failure**: Config clients get `503` or connection refused on port 8888 — check if the Config Server pod is running (`kubectl get pods -l app=config-server`) and inspect logs for Git connectivity errors.
- **Restart is safe**: Yes. The Config Server is stateless. Config clients cache configuration locally, so a brief restart causes minimal disruption.
- **Critical dependency**: Upstream Git repository (`https://github.com/spring-petclinic/spring-petclinic-microservices-config`) or local path via `GIT_REPO` env var — if unreachable, the server cannot serve configs.
- **Rollback**: Standard `kubectl rollout undo deployment/config-server` is safe and fast.

---

## Service Identity

| Property              | Value                                                                                                  |
|-----------------------|--------------------------------------------------------------------------------------------------------|
| **Service**           | `spring-petclinic-config-server`                                                                       |
| **Product**           | `spring-petclinic-microservices`                                                                       |
| **Repository**        | `spring-petclinic/spring-petclinic-microservices`                                                      |
| **Type**              | API (Spring Cloud Config Server)                                                                       |
| **Port**              | `8888`                                                                                                 |
| **Health Endpoint**   | `/actuator/health` (Spring Boot Actuator default, if enabled)                                          |
| **Metrics Endpoint**  | `/actuator/metrics` (Spring Boot Actuator default, if enabled)                                         |
| **Deployment Platform** | Kubernetes                                                                                           |
| **Scaling**           | Stateless; horizontal scaling possible but typically single instance or small HA pair. Clients cache configs locally. |
| **Dependencies**      | Git repository (remote or local via `GIT_REPO` env var); no database dependencies                     |

---

## Startup Procedure

1. **Build the artifact** (if not using a pre-built image):
   ```bash
   mvn clean package
   ```
2. **Start the application**:
   ```bash
   java -jar spring-petclinic-config-server-4.0.1.jar
   ```
3. Config Server initializes on **port 8888**.
4. The server loads configuration from one of two backends:
   - **Git backend (default)**: Clones from `https://github.com/spring-petclinic/spring-petclinic-microservices-config` (branch: `main`).
   - **Native file system backend**: Used when the `GIT_REPO` environment variable is set, pointing to a local directory containing configuration files.
5. Verify the server is ready:
   ```bash
   curl http://localhost:8888/actuator/health
   ```

---

## Graceful Shutdown

The Config Server follows **Spring Boot default graceful shutdown** behavior:

- On receiving `SIGTERM`, the server stops accepting new connections.
- In-flight requests are completed within the configured timeout period.
- The process then exits cleanly.

> **Note:** Because config clients cache their configuration locally, a brief shutdown window does not typically cause downstream failures. Clients will use cached values until the Config Server is available again.

---

## Common Failure Modes

### 1. Config Clients Unable to Fetch Configuration

| Field              | Detail                                                                                                  |
|--------------------|---------------------------------------------------------------------------------------------------------|
| **Symptom**        | Config clients receive `503 Service Unavailable` or `Connection Refused` on port 8888                   |
| **Likely Cause**   | Config Server pod not running or not ready; Git repository unreachable; `GIT_REPO` env var not set when using native profile |

**Immediate Action:**

```bash
kubectl get pods -l app=config-server -n <namespace>
```

Verify the pod is in `Running` / `Ready` state. If not, check logs immediately.

**Investigation Steps:**

1. Check pod logs for startup errors:
   ```bash
   kubectl logs <config-server-pod> -n <namespace>
   ```
2. Verify Git repository accessibility from within the cluster:
   ```bash
   kubectl exec <config-server-pod> -n <namespace> -- git ls-remote https://github.com/spring-petclinic/spring-petclinic-microservices-config
   ```
3. If using Git backend with authentication, verify SSH keys or HTTPS credentials are correctly mounted/configured.
4. If using native profile, verify the `GIT_REPO` environment variable is set:
   ```bash
   kubectl describe pod <config-server-pod> -n <namespace> | grep GIT_REPO
   ```
5. Check network policies or egress rules that may block outbound Git traffic.

---

### 2. Config Server Returns Empty or Incorrect Configuration

| Field              | Detail                                                                                                  |
|--------------------|---------------------------------------------------------------------------------------------------------|
| **Symptom**        | Config Server responds `200 OK` but returns empty or unexpected configuration values                    |
| **Likely Cause**   | Git repository `main` branch does not exist; native file system path missing config files; Git credentials invalid (silent auth failure) |

**Immediate Action:**

Verify the Git repository has the expected branch and files:

```bash
curl http://config-server:8888/<application-name>/default
```

Check if the response body contains the expected configuration properties.

**Investigation Steps:**

1. Verify the `main` branch exists in the config repository:
   ```bash
   git ls-remote --heads https://github.com/spring-petclinic/spring-petclinic-microservices-config
   ```
2. Verify the configuration file naming convention matches the requesting application name (e.g., `customers-service.yml`, `vets-service.yml`).
3. Check pod logs for Git clone/pull errors:
   ```bash
   kubectl logs <config-server-pod> -n <namespace> | grep -i "error\|exception\|fatal"
   ```
4. If using native profile, exec into the pod and verify files exist at the `GIT_REPO` path:
   ```bash
   kubectl exec <config-server-pod> -n <namespace> -- ls -la <GIT_REPO_PATH>
   ```

---

### 3. Slow Configuration Retrieval / Client Timeouts

| Field              | Detail                                                                                                  |
|--------------------|---------------------------------------------------------------------------------------------------------|
| **Symptom**        | Config clients experience timeouts or very slow responses when fetching configuration                   |
| **Likely Cause**   | Git repository slow to respond; network latency; large configuration repository; pod resource starvation |

**Immediate Action:**

Check Git repository response time and pod resource usage:

```bash
kubectl top pod <config-server-pod> -n <namespace>
```

**Investigation Steps:**

1. Test Git repository access time from within the pod:
   ```bash
   kubectl exec <config-server-pod> -n <namespace> -- time git ls-remote https://github.com/spring-petclinic/spring-petclinic-microservices-config
   ```
2. Check pod resource limits (CPU/memory) for throttling:
   ```bash
   kubectl describe pod <config-server-pod> -n <namespace> | grep -A 5 "Limits\|Requests"
   ```
3. Monitor pod logs for Git operation duration:
   ```bash
   kubectl logs -f <config-server-pod> -n <namespace>
   ```
4. Consider switching to native profile with a local clone if Git latency is the bottleneck.

---

## Rollback Procedure

1. **Check deployment revision history:**
   ```bash
   kubectl rollout history deployment/config-server -n <namespace>
   ```
2. **Roll back to the previous stable revision:**
   ```bash
   kubectl rollout undo deployment/config-server -n <namespace> --to-revision=<previous-revision>
   ```
3. **Monitor the rollout status:**
   ```bash
   kubectl rollout status deployment/config-server -n <namespace>
   ```
4. **Verify the Config Server is serving configuration correctly:**
   ```bash
   curl http://config-server:8888/application/default
   ```

---

## Useful Commands

**View Config Server logs (streaming):**
```bash
kubectl logs -f deployment/config-server -n <namespace>
```

**Check Config Server pod status:**
```bash
kubectl get pods -l app=config-server -n <namespace>
```

**Fetch configuration for a specific client application:**
```bash
curl http://config-server:8888/<application-name>/<profile>
```

> Example: `curl http://config-server:8888/customers-service/default`

**Describe Config Server deployment:**
```bash
kubectl describe deployment config-server -n <namespace>
```

**Check pod resource consumption:**
```bash
kubectl top pod -l app=config-server -n <namespace>
```

**Restart the Config Server (rolling restart):**
```bash
kubectl rollout restart deployment/config-server -n <namespace>
```

---

## Environment Notes

| Variable / Setting   | Description                                                                                            |
|----------------------|--------------------------------------------------------------------------------------------------------|
| **Port**             | `8888` — the standard Spring Cloud Config Server port                                                  |
| **Git backend (default)** | Clones from `https://github.com/spring-petclinic/spring-petclinic-microservices-config`, branch `main` |
| **Native backend**   | Activated when `GIT_REPO` environment variable is set; points to a local file system directory          |
| **JMX Monitoring**   | Jolokia is included for JMX-over-HTTP monitoring                                                       |
| **Database**         | None — Config Server has no database dependencies                                                      |
| **Client caching**   | Config clients cache configuration locally; brief Config Server outages do not immediately impact downstream services |

---

## Escalation

| Situation                                                        | Who to Contact                                      |
|------------------------------------------------------------------|-----------------------------------------------------|
| Config Server pod crash-looping; restart does not resolve        | Platform / Kubernetes team                          |
| Git repository unreachable or credentials expired                | DevOps / SCM team (repository administrators)       |
| All downstream services failing to start due to missing config   | Application team lead + Platform team (P1 incident) |
| Configuration values incorrect causing application misbehavior   | Application team (config repository maintainers)    |

---

## See Also

- [spring-petclinic-microservices-config repository](https://github.com/spring-petclinic/spring-petclinic-microservices-config) — the configuration source repository
- [Spring Cloud Config Server documentation](https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_spring_cloud_config_server)
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — parent project with all microservices
- [SCENARIOS.md](SCENARIOS.md) — incident scenarios and resolution playbooks
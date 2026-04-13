<!-- generated: 2026-04-13T04:11:04.602Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Runbook — spring-petclinic-admin-server

## TL;DR for Agents

- **Health check endpoint:** Not explicitly configured; expected at `/actuator/health` (Spring Boot Actuator default).
- **Most common failure:** Admin server loses connectivity to registered microservice instances (Eureka-registered clients disappear from the dashboard).
- **Is restart safe?** Yes — this is a monitoring/admin UI with no persistent state. Restarting has no impact on downstream services.
- **Role:** Spring Boot Admin Server — provides a web UI for monitoring and managing all Spring Boot microservice instances in the spring-petclinic-microservices ecosystem.
- **No extracted signals available** — this runbook is constructed from framework defaults and conventional patterns. Verify details against the actual deployment.

---

## Service Identity

| Property             | Value                                                                 |
|----------------------|-----------------------------------------------------------------------|
| **Service**          | `spring-petclinic-admin-server`                                       |
| **Repository**       | `spring-petclinic/spring-petclinic-microservices`                     |
| **Type**             | API / Admin UI                                                        |
| **Health Endpoint**  | `/actuator/health` (assumed — Spring Boot Actuator default)           |
| **Metrics Endpoint** | `/actuator/metrics` (assumed — Spring Boot Actuator default)          |
| **Deployment Platform** | Not specified — verify with team (likely Docker / Kubernetes / VM) |
| **Scaling**          | Typically runs as a single instance; no special scaling requirements  |
| **Dependencies**     | Eureka discovery server (for service registration), monitored microservices |

---

## Startup Procedure

> **Note:** No explicit startup procedure was extracted. The following is based on standard Spring Boot conventions for this project.

1. Ensure the **Eureka discovery server** (`spring-petclinic-discovery-server`) is running and reachable.
2. Verify environment-specific configuration (e.g., `application.yml` or environment variables for Eureka URI, server port).
3. Start the service:
   ```bash
   # Via Maven (local development)
   ./mvnw -pl spring-petclinic-admin-server spring-boot:run

   # Via JAR
   java -jar spring-petclinic-admin-server/target/spring-petclinic-admin-server-*.jar

   # Via Docker (if applicable)
   docker-compose up admin-server
   ```
4. Confirm startup by checking the health endpoint:
   ```bash
   curl -s http://localhost:9090/actuator/health
   ```
   > Default port is typically `9090` — verify in `application.yml`.
5. Open the Spring Boot Admin UI in a browser (e.g., `http://localhost:9090`) and confirm registered instances appear.

---

## Graceful Shutdown

> **Note:** No explicit shutdown behaviour was extracted.

**Expected behaviour (Spring Boot defaults):**

- On receiving `SIGTERM`, Spring Boot initiates graceful shutdown.
- Active HTTP requests are given time to complete (configurable via `spring.lifecycle.timeout-per-shutdown-phase`, default 30s in Spring Boot 2.3+).
- The admin server deregisters from Eureka (if registered as a client).
- Since this service holds **no persistent state or queues**, shutdown is low-risk. In-flight dashboard requests may fail, but no data loss occurs.

```bash
# Graceful stop
kill -SIGTERM <pid>

# Force stop (last resort)
kill -9 <pid>
```

---

## Common Failure Modes

### 1. No Instances Visible in Admin Dashboard

| Field               | Detail |
|---------------------|--------|
| **Symptom**         | Admin UI shows zero registered applications, or applications intermittently disappear. |
| **Likely Cause**    | Eureka discovery server is down, unreachable, or microservices have not registered. |
| **Immediate Action** | Verify Eureka server health: `curl -s http://localhost:8761/actuator/health` |
| **Investigation Steps** | 1. Check Eureka dashboard at `http://localhost:8761` for registered instances. <br> 2. Verify `eureka.client.serviceUrl.defaultZone` in admin-server config points to the correct Eureka URL. <br> 3. Check network connectivity between admin-server and Eureka. <br> 4. Review admin-server logs for `Connection refused` or `UnknownHostException`. |

### 2. Admin Server Fails to Start

| Field               | Detail |
|---------------------|--------|
| **Symptom**         | Process exits immediately or health endpoint returns non-200. Logs show `APPLICATION FAILED TO START`. |
| **Likely Cause**    | Port conflict (default port already in use), misconfigured Eureka URI, or missing dependencies. |
| **Immediate Action** | Check logs: `docker logs admin-server` or review stdout/stderr. |
| **Investigation Steps** | 1. Check for port conflicts: `lsof -i :9090` or `netstat -tlnp \| grep 9090`. <br> 2. Validate `application.yml` / environment variables. <br> 3. Ensure the correct Java version is available (`java -version`). <br> 4. Try starting with debug logging: `java -jar ... --logging.level.root=DEBUG`. |

### 3. High Memory Usage / OOM Kill

| Field               | Detail |
|---------------------|--------|
| **Symptom**         | Container or process killed by OOM killer; `137` exit code in Docker/Kubernetes. |
| **Likely Cause**    | JVM heap too large for container memory limit, or a large number of monitored instances generating excessive metric data. |
| **Immediate Action** | Restart the service. Review container memory limits and JVM flags. |
| **Investigation Steps** | 1. Check `dmesg` or Kubernetes events for OOM messages. <br> 2. Review JVM flags: `-Xmx`, `-Xms`. <br> 3. Reduce the number of polled actuator endpoints if the instance count is very high. |

### 4. Admin UI Returns 502 / 503 Behind Reverse Proxy

| Field               | Detail |
|---------------------|--------|
| **Symptom**         | Browser shows 502 Bad Gateway or 503 Service Unavailable when accessing the admin UI. |
| **Likely Cause**    | Admin server process is down, or reverse proxy / ingress misconfiguration. |
| **Immediate Action** | Verify the admin-server process is running and the health endpoint responds locally. |
| **Investigation Steps** | 1. `curl` the health endpoint directly (bypassing proxy). <br> 2. Check proxy/ingress logs for upstream connection errors. <br> 3. Verify target port matches the admin-server's configured `server.port`. |

---

## Rollback Procedure

> **Note:** No explicit rollback steps were extracted. The following is a general procedure.

1. Identify the last known good version/tag/image:
   ```bash
   git log --oneline -10  # or check deployment history
   ```
2. Redeploy the previous version:
   ```bash
   # Docker example
   docker pull springcommunity/spring-petclinic-admin-server:<previous-tag>
   docker-compose up -d admin-server

   # Kubernetes example
   kubectl rollout undo deployment/admin-server -n petclinic
   ```
3. Verify health:
   ```bash
   curl -s http://localhost:9090/actuator/health
   ```
4. Confirm the admin UI loads and shows registered instances.
5. Notify the team and document the rollback reason.

---

## Useful Commands

**Check service health:**
```bash
curl -s http://localhost:9090/actuator/health | jq .
```

**View environment and config properties:**
```bash
curl -s http://localhost:9090/actuator/env | jq .
```

**Tail logs (Docker):**
```bash
docker logs -f admin-server --tail 200
```

**Check which process is using the expected port:**
```bash
lsof -i :9090
```

**View registered Eureka instances (from Eureka server):**
```bash
curl -s -H "Accept: application/json" http://localhost:8761/eureka/apps | jq '.applications.application[].instance[].app'
```

**Rebuild and restart locally:**
```bash
./mvnw -pl spring-petclinic-admin-server clean package -DskipTests
java -jar spring-petclinic-admin-server/target/spring-petclinic-admin-server-*.jar
```

---

## Environment Notes

> **No environment-specific notes were extracted.** Document the following for your deployment:

| Item                        | What to verify                                                        |
|-----------------------------|-----------------------------------------------------------------------|
| **Server port**             | Check `server.port` in `application.yml` (commonly `9090`)           |
| **Eureka URI**              | `eureka.client.serviceUrl.defaultZone` — must match discovery server  |
| **Java version**            | Typically Java 8 or 17 depending on branch — check `pom.xml`         |
| **Config server**           | If using `spring-petclinic-config-server`, ensure it is up first      |
| **Container memory limits** | Ensure JVM `-Xmx` fits within Docker/K8s memory limits               |

---

## Escalation

| Situation                                      | Who to Contact                                      |
|------------------------------------------------|-----------------------------------------------------|
| Admin server won't start after rollback        | Service owner / platform team                       |
| Eureka discovery server is down                | Platform / infrastructure team                      |
| Persistent OOM or resource exhaustion          | Platform / infrastructure team                      |
| Security vulnerability in Spring Boot Admin UI | Security team + service owner                       |
| Unknown configuration or environment issue     | Repository maintainers (`spring-petclinic` GitHub)  |

---

## See Also

- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Spring Boot Admin Documentation](https://docs.spring-boot-admin.com/)
- [Spring Boot Actuator Reference](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [SCENARIOS.md](SCENARIOS.md)
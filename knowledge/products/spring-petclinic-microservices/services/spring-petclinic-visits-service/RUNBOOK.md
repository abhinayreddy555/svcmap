<!-- generated: 2026-04-13T04:29:23.832Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Runbook — spring-petclinic-visits-service

## TL;DR for Agents

- **Health check endpoint:** Not explicitly configured — try `GET /actuator/health` (Spring Boot Actuator default).
- **Metrics endpoint:** `GET /actuator/prometheus` (Micrometer with `application=petclinic` tag).
- **Primary dependency:** `visits-db` — if the database is down, this service will fail.
- **Most common failure:** Database connectivity issues to `visits-db`; check connection pool and DB availability first.
- **Restart safe?** Yes — this is a stateless API service backed by an external database. Restarting is safe and is a reasonable first action.

---

## Service Identity

| Property | Value |
|---|---|
| **Service** | `spring-petclinic-visits-service` |
| **Type** | API |
| **Repository** | `spring-petclinic/spring-petclinic-microservices` |
| **Health Endpoint** | `GET /actuator/health` (assumed Spring Boot default) |
| **Metrics Endpoint** | `GET /actuator/prometheus` |
| **Deployment Platform** | Not specified |
| **Scaling Notes** | Not specified — service is stateless; horizontal scaling should be safe |
| **Key Dependency** | `visits-db` (dedicated datastore for visit records, pet-visit relationships, visit metadata) |

---

## Startup Procedure

> **Note:** No explicit startup procedure was documented in the source configuration. The following reflects standard Spring Boot microservice startup behavior.

1. Ensure `visits-db` is running and accepting connections.
2. Verify required environment variables / config server settings are available (datasource URL, credentials, service registry endpoint).
3. Start the service:
   ```bash
   java -jar spring-petclinic-visits-service.jar
   ```
   Or via the build tool:
   ```bash
   ./mvnw spring-boot:run -pl spring-petclinic-visits-service
   ```
4. Wait for the Spring Boot banner and `Started` log line in stdout.
5. Confirm health:
   ```bash
   curl -sf http://localhost:<port>/actuator/health
   ```
   Expected response: `{"status":"UP"}`.
6. Confirm metrics are being exported:
   ```bash
   curl -sf http://localhost:<port>/actuator/prometheus | head -20
   ```

---

## Graceful Shutdown

> **Note:** No explicit shutdown behavior was documented. The following reflects Spring Boot defaults.

- On receiving `SIGTERM`, Spring Boot initiates graceful shutdown.
- If `server.shutdown=graceful` is configured, in-flight HTTP requests are allowed to complete up to the configured timeout (`spring.lifecycle.timeout-per-shutdown-phase`, default 30s).
- If graceful shutdown is **not** explicitly configured, the service stops immediately upon `SIGTERM`.
- Database connections in the connection pool are released on JVM shutdown via standard Spring lifecycle hooks.
- **Safe to send `SIGTERM`** — no special drain procedure is documented.

---

## Common Failure Modes

### 1. Database Connectivity Failure (`visits-db`)

| Field | Detail |
|---|---|
| **Symptom** | `GET /actuator/health` returns `{"status":"DOWN"}` with `db` component unhealthy. API requests return `500 Internal Server Error`. Logs show `SQLException`, `HikariPool` connection timeout, or `Communications link failure`. |
| **Likely Cause** | `visits-db` is unreachable — network issue, database crash, credentials rotated, or connection pool exhausted. |
| **Immediate Action** | 1. Check `visits-db` availability: `pg_isready` / `mysqladmin ping` or equivalent. 2. Check network connectivity from the service host to the DB host/port. 3. Restart the visits service if the DB is confirmed healthy (clears stale pool). |
| **Investigation Steps** | 1. Inspect service logs for specific JDBC error messages. 2. Check HikariCP metrics via `/actuator/prometheus` — look for `hikaricp_connections_timeout_total`. 3. Verify DB credentials in config. 4. Check DB max connections vs. active connections. |

### 2. Service Unreachable / Not Registered

| Field | Detail |
|---|---|
| **Symptom** | Upstream services (e.g., API gateway) cannot route to visits-service. Service does not appear in service registry (Eureka/Consul). |
| **Likely Cause** | Service failed to start, crashed silently, or cannot reach the service registry. |
| **Immediate Action** | 1. Check if the process is running. 2. Check `/actuator/health`. 3. Check service registry dashboard. 4. Restart the service. |
| **Investigation Steps** | 1. Review application logs for startup errors. 2. Verify service registry URL in configuration. 3. Check for port conflicts on the host. |

### 3. High Latency / Timeout on Visit Endpoints

| Field | Detail |
|---|---|
| **Symptom** | API responses are slow (>2s). Upstream services report timeouts. Prometheus metrics show elevated `http_server_requests_seconds` values. |
| **Likely Cause** | Slow database queries, connection pool saturation, GC pressure, or resource starvation on the host. |
| **Immediate Action** | 1. Check DB query performance and active locks. 2. Check HikariCP pool metrics. 3. Check host CPU/memory. 4. Scale horizontally if resource-bound. |
| **Investigation Steps** | 1. Query `/actuator/prometheus` for `hikaricp_connections_active`, `hikaricp_connections_pending`. 2. Check `jvm_gc_pause_seconds` metrics. 3. Run slow query log analysis on `visits-db`. |

---

## Rollback Procedure

> **Note:** No explicit rollback steps were documented. The following is a general rollback procedure for this service.

1. Identify the last known good version/image tag (check deployment history, CI/CD pipeline, or container registry).
2. Deploy the previous version:
   ```bash
   # Example for Docker/Kubernetes — adjust to your platform
   kubectl rollout undo deployment/spring-petclinic-visits-service
   ```
   Or redeploy a specific version:
   ```bash
   kubectl set image deployment/spring-petclinic-visits-service \
     visits-service=spring-petclinic-visits-service:<previous-tag>
   ```
3. Monitor `/actuator/health` on the rolled-back instances until all report `UP`.
4. Verify visit-related API functionality end-to-end (e.g., `GET /pets/{petId}/visits`).
5. If the rollback involved a database schema migration, check whether a reverse migration is needed — **do not assume DB changes are backward-compatible**.

---

## Useful Commands

**Check service health:**
```bash
curl -sf http://<host>:<port>/actuator/health | jq .
```

**Scrape Prometheus metrics:**
```bash
curl -sf http://<host>:<port>/actuator/prometheus | grep -E 'hikaricp_|http_server_requests|jvm_memory'
```

**Check HikariCP connection pool status:**
```bash
curl -sf http://<host>:<port>/actuator/prometheus | grep hikaricp_connections
```

**Tail application logs (Kubernetes):**
```bash
kubectl logs -f deployment/spring-petclinic-visits-service --tail=200
```

**Check if the database port is reachable from the service host:**
```bash
nc -zv <visits-db-host> <visits-db-port>
```

**List all actuator endpoints available:**
```bash
curl -sf http://<host>:<port>/actuator | jq .
```

---

## Environment Notes

- **Metrics:** Spring Boot Micrometer metrics are configured with the common tag `application=petclinic`. All Prometheus metrics emitted by this service carry this tag — use it for filtering in dashboards and alerts.
- **Metrics endpoint:** `GET /actuator/prometheus` — ensure your Prometheus scrape config targets this path.
- **Database:** `visits-db` is a **dedicated** (non-shared) datastore. Schema changes affect only this service.
- **Framework:** Spring Boot with Spring Boot Actuator. Standard Actuator endpoints (`/actuator/health`, `/actuator/info`, `/actuator/env`, `/actuator/prometheus`) are expected to be available depending on exposure configuration.

---

## Escalation

| Situation | Who to Contact |
|---|---|
| `visits-db` is down or corrupted | Database / Platform team |
| Service repeatedly crashes on startup | Application development team (`spring-petclinic` maintainers) |
| Network connectivity issues between service and DB or service registry | Infrastructure / Networking team |
| Sustained high latency with no DB or host-level root cause | Application development team |

---

## See Also

- [Spring PetClinic Microservices Repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Spring Boot Actuator Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [HikariCP Monitoring & Metrics](https://github.com/brettwooldridge/HikariCP/wiki/MBean-(JMX)-Monitoring-and-Management)
- [Micrometer Prometheus Registry](https://micrometer.io/docs/registry/prometheus)
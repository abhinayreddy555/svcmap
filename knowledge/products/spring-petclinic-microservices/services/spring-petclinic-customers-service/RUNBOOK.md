<!-- generated: 2026-04-13T04:19:20.513Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Runbook — spring-petclinic-customers-service

## TL;DR for Agents

- **Health check endpoint is not explicitly configured** — use the default Spring Boot Actuator endpoint `GET /actuator/health` (standard for Spring Boot apps).
- **Metrics available** at `GET /actuator/prometheus` (Micrometer with `application=petclinic` tag).
- **Primary dependency**: `petclinic-db` — most outages will trace back to database connectivity issues.
- **Restart is generally safe** — this is a stateless API service backed by an external database; no in-memory state to lose.
- **No custom startup or shutdown procedures documented** — relies on standard Spring Boot lifecycle defaults.

---

## Service Identity

| Property              | Value                                                                 |
|-----------------------|-----------------------------------------------------------------------|
| **Service**           | `spring-petclinic-customers-service`                                  |
| **Product**           | `spring-petclinic-microservices`                                      |
| **Repo**              | `spring-petclinic/spring-petclinic-microservices`                     |
| **Type**              | API                                                                   |
| **Health Endpoint**   | `GET /actuator/health` (assumed Spring Boot default — not explicitly configured) |
| **Metrics Endpoint**  | `GET /actuator/prometheus`                                            |
| **Deployment Platform** | Not documented                                                      |
| **Scaling Notes**     | Not documented — service is stateless and should be horizontally scalable |

### Dependencies

| Dependency      | Type  | Purpose                                        | Shared? |
|-----------------|-------|-------------------------------------------------|---------|
| `petclinic-db`  | Other | Primary datastore for owners, pets, and pet types | No      |

---

## Startup Procedure

> **Note:** No custom startup procedure was documented for this service. The following reflects standard Spring Boot behavior.

1. The service process starts and the Spring Boot application context begins initialization.
2. Database connection pool is established to `petclinic-db`.
3. Schema migrations (if any, e.g., via Flyway/Liquibase or `schema.sql`/`data.sql`) are applied.
4. Embedded web server (Tomcat) binds to the configured port.
5. Actuator endpoints (`/actuator/health`, `/actuator/prometheus`) become available.
6. Service registers with the discovery server (if Eureka/service discovery is enabled).

**Verification:**

```bash
curl -s http://<host>:<port>/actuator/health | jq .
```

Expected response:

```json
{
  "status": "UP"
}
```

---

## Graceful Shutdown

> **Note:** No explicit shutdown behavior was documented. The following reflects standard Spring Boot defaults.

- On receiving `SIGTERM`, Spring Boot initiates graceful shutdown of the application context.
- The embedded Tomcat server stops accepting new connections.
- In-flight requests are given time to complete (configurable via `spring.lifecycle.timeout-per-shutdown-phase`, default 30s in Spring Boot 2.3+).
- The database connection pool is closed.
- If service discovery is configured, the instance deregisters.

**Important:** Sending `SIGKILL` will bypass graceful shutdown — use only as a last resort.

---

## Common Failure Modes

### 1. Database Connection Failure

**Symptom:**
- `GET /actuator/health` returns `{"status": "DOWN"}` with `db` component details showing connection errors.
- API requests to `/owners`, `/owners/{id}/pets` return `500 Internal Server Error`.
- Logs contain `java.sql.SQLException`, `HikariPool` connection timeout errors, or `Unable to acquire JDBC Connection`.

**Likely Cause:**
- `petclinic-db` is unreachable (network issue, database down, credentials rotated).
- Connection pool exhaustion due to slow queries or connection leaks.

**Immediate Action:**
1. Check database connectivity from the service host:
   ```bash
   # Test TCP connectivity to the database
   nc -zv <db-host> <db-port>
   ```
2. Verify database process is running and accepting connections.
3. Check connection pool metrics:
   ```bash
   curl -s http://<host>:<port>/actuator/prometheus | grep hikari
   ```
4. If the pool is exhausted, restart the service to reset connections.

**Investigation Steps:**
1. Review service logs for the exact SQL exception and stack trace.
2. Check database server logs for rejected connections or resource limits.
3. Verify database credentials and connection string in the service configuration.
4. Check for long-running queries or locks on the database side.

---

### 2. Service Unresponsive / High Latency

**Symptom:**
- Requests to the service time out or take significantly longer than normal.
- Upstream services (e.g., API gateway) report errors calling the customers service.
- Prometheus metrics show elevated response times.

**Likely Cause:**
- Database slow queries or table locks.
- JVM garbage collection pauses (heap exhaustion).
- Thread pool saturation in the embedded Tomcat server.

**Immediate Action:**
1. Check JVM memory metrics:
   ```bash
   curl -s http://<host>:<port>/actuator/prometheus | grep jvm_memory
   ```
2. Check active Tomcat threads:
   ```bash
   curl -s http://<host>:<port>/actuator/prometheus | grep tomcat_threads
   ```
3. If the service is completely unresponsive, restart it (restart is safe).

**Investigation Steps:**
1. Capture a thread dump to identify blocked threads:
   ```bash
   curl -s http://<host>:<port>/actuator/threaddump | jq .
   ```
2. Review Prometheus metrics for `http_server_requests_seconds` to identify slow endpoints.
3. Check database for slow query logs or lock contention.

---

### 3. Service Fails to Start

**Symptom:**
- Service process exits shortly after launch.
- Health endpoint is never reachable.
- Logs show `ApplicationContextException` or `BeanCreationException`.

**Likely Cause:**
- Database is unavailable at startup time and fail-fast is enabled.
- Port conflict — another process is already bound to the configured port.
- Missing or invalid configuration (environment variables, config server unreachable).

**Immediate Action:**
1. Check the service logs for the root cause exception.
2. Verify the database is reachable (see Database Connection Failure above).
3. Check for port conflicts:
   ```bash
   lsof -i :<port>
   ```
4. Verify all required environment variables and configuration sources are available.

**Investigation Steps:**
1. Attempt to start the service with `--debug` flag to get full auto-configuration report.
2. If using a config server, verify it is reachable and serving the correct profile.

---

## Rollback Procedure

> **Note:** No explicit rollback steps were documented. The following is a general rollback procedure.

1. Identify the last known good version/image tag of `spring-petclinic-customers-service`.
2. Verify the database schema is backward-compatible with the previous version (check for irreversible migrations).
3. Deploy the previous version using your deployment tooling:
   ```bash
   # Example — adjust for your actual deployment platform
   kubectl rollout undo deployment/customers-service -n petclinic
   ```
4. Monitor `GET /actuator/health` to confirm the rolled-back instance is `UP`.
5. Verify API functionality by testing a core endpoint:
   ```bash
   curl -s http://<host>:<port>/owners | jq .
   ```
6. Check Prometheus metrics for error rate normalization:
   ```bash
   curl -s http://<host>:<port>/actuator/prometheus | grep http_server_requests_seconds_count
   ```

---

## Useful Commands

**Check service health:**
```bash
curl -s http://<host>:<port>/actuator/health | jq .
```

**Scrape Prometheus metrics (all):**
```bash
curl -s http://<host>:<port>/actuator/prometheus
```

**Check HikariCP connection pool status:**
```bash
curl -s http://<host>:<port>/actuator/prometheus | grep -E 'hikaricp_(connections|pending)'
```

**Check HTTP request latency and error rates:**
```bash
curl -s http://<host>:<port>/actuator/prometheus | grep http_server_requests_seconds
```

**Check JVM heap usage:**
```bash
curl -s http://<host>:<port>/actuator/prometheus | grep jvm_memory_used_bytes
```

**Get a thread dump for debugging hangs:**
```bash
curl -s http://<host>:<port>/actuator/threaddump | jq .
```

**Get environment and configuration info:**
```bash
curl -s http://<host>:<port>/actuator/env | jq .
```

**Filter metrics by application tag (Prometheus query example):**
```promql
http_server_requests_seconds_count{application="petclinic", uri="/owners"}
```

---

## Environment Notes

- **Metrics framework:** Spring Boot Micrometer is configured with Prometheus registry.
- **Common metric tag:** All metrics are tagged with `application=petclinic`. Use this tag to filter in Prometheus/Grafana dashboards.
- **Method-level timing:** `TimedAspect` is enabled, meaning methods annotated with `@Timed` will emit individual timing metrics. Look for custom timer names in the Prometheus output.
- **Actuator endpoints:** Metrics are exposed via `/actuator/prometheus`. Other standard Actuator endpoints (`/health`, `/info`, `/env`, `/threaddump`) are expected to be available depending on security configuration.

---

## Escalation

| Situation                                      | Who to Contact                          |
|------------------------------------------------|-----------------------------------------|
| Database (`petclinic-db`) unreachable or corrupt | Database / Platform team                |
| Service repeatedly crashes on startup           | Application development team            |
| Elevated error rates with no obvious infra cause | Application development team            |
| Network connectivity issues between services    | Platform / Infrastructure team          |
| Unclear ownership or cross-service impact       | Product on-call lead                    |

---

## See Also

- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Spring Boot Actuator documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [Micrometer Prometheus registry documentation](https://micrometer.io/docs/registry/prometheus)
- [HikariCP monitoring and troubleshooting](https://github.com/brettwooldridge/HikariCP/wiki/MBean-(JMX)-Monitoring-and-Management)
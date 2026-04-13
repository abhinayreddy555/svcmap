<!-- generated: 2026-04-13T04:28:40.463Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Runbook — spring-petclinic-vets-service

## TL;DR for Agents

- **Health check endpoint:** `/actuator/health` (Spring Boot default — not explicitly confirmed in source; verify deployment config)
- **Primary dependency:** `vets-db` database — most likely failure mode is database connectivity loss
- **Restart is generally safe:** This is a stateless API service; restarting will not cause data loss, but in-flight requests will be dropped
- **Caching is enabled only in the `production` profile** — cache-related issues (stale data, memory pressure) will not reproduce in dev/test
- **This is a Spring Boot microservice** within the `spring-petclinic-microservices` ecosystem — it serves vet and specialty data

---

## Service Identity

| Property              | Value                                                                 |
|-----------------------|-----------------------------------------------------------------------|
| **Service**           | `spring-petclinic-vets-service`                                       |
| **Type**              | API (REST)                                                            |
| **Repository**        | `spring-petclinic/spring-petclinic-microservices`                     |
| **Health Endpoint**   | `/actuator/health` (assumed Spring Boot default — verify in config)   |
| **Metrics Endpoint**  | `/actuator/metrics` (assumed Spring Boot Actuator default)            |
| **Deployment Platform** | Not documented — check infrastructure config                       |
| **Scaling**           | Not documented — stateless service, horizontal scaling expected safe  |

### Dependencies

| Dependency | Type     | Purpose                                      | Shared? |
|------------|----------|----------------------------------------------|---------|
| `vets-db`  | Database | Primary datastore for vets and specialties   | No      |

---

## Startup Procedure

> ⚠️ No explicit startup procedure was found in the repository signals. The following is inferred from Spring Boot conventions.

1. Ensure `vets-db` is running and reachable at the configured JDBC URL.
2. Verify environment variables / config server settings are available (database credentials, active Spring profile).
3. Start the service:
   ```bash
   java -jar spring-petclinic-vets-service.jar --spring.profiles.active=production
   ```
   Or via Maven for local development:
   ```bash
   ./mvnw spring-boot:run -pl spring-petclinic-vets-service
   ```
4. Confirm startup by checking the health endpoint:
   ```bash
   curl -s http://localhost:<port>/actuator/health
   ```
   Expected response: `{"status":"UP"}`
5. Verify database connectivity is reported healthy in the health check response (look for `db` component status).

---

## Graceful Shutdown

> ⚠️ No explicit shutdown behavior was documented in the source.

**Inferred behavior (Spring Boot defaults):**

- On receiving `SIGTERM`, Spring Boot will initiate graceful shutdown if configured (`server.shutdown=graceful` in newer Spring Boot versions).
- If graceful shutdown is **not** configured, the process terminates immediately, dropping in-flight requests.
- Database connection pools (e.g., HikariCP) will attempt to close open connections.
- **Recommendation:** Verify whether `server.shutdown=graceful` and `spring.lifecycle.timeout-per-shutdown-phase` are set in the application configuration. If not, consider adding them.

---

## Common Failure Modes

### 1. Database Connection Failure

**Symptom:**
- Health endpoint returns `{"status":"DOWN"}` with database component failing.
- HTTP 500 errors on API endpoints that query vets or specialties.
- Logs contain `java.sql.SQLException`, `HikariPool` timeout errors, or `Unable to acquire JDBC Connection`.

**Likely Cause:**
- `vets-db` is down, unreachable, or has exhausted its connection limit.
- Network partition between the service and the database.
- Incorrect or expired database credentials.

**Immediate Action:**
1. Check `vets-db` status and connectivity:
   ```bash
   # Example for a containerized DB
   docker ps | grep vets-db
   ```
2. Test direct database connectivity from the service host:
   ```bash
   nc -zv <db-host> <db-port>
   ```
3. If the database is healthy, restart the vets-service to reset the connection pool.

**Investigation Steps:**
1. Review service logs for the exact exception and stack trace.
2. Check database server logs for connection rejections or resource exhaustion.
3. Verify credentials in the configuration (config server or environment variables).
4. Check HikariCP pool metrics if available via `/actuator/metrics/hikaricp.connections`.

---

### 2. Stale Cache Data (Production Profile Only)

**Symptom:**
- Recently added or updated vets/specialties are not reflected in API responses.
- Data appears correct when querying `vets-db` directly.

**Likely Cause:**
- Caching is enabled in the `production` profile. Cached data has not expired or been evicted.

**Immediate Action:**
1. If an actuator cache endpoint is available, evict the cache:
   ```bash
   curl -X DELETE http://localhost:<port>/actuator/caches
   ```
2. Alternatively, restart the service to clear all in-memory caches.

**Investigation Steps:**
1. Confirm the active Spring profile is `production` (caching is disabled in other profiles).
2. Review cache configuration for TTL and eviction policies in `application-production.yml` or equivalent.
3. Check `/actuator/caches` for cache names and sizes.

---

### 3. Service Fails to Start

**Symptom:**
- Process exits immediately or enters a crash loop.
- Logs show `ApplicationContextException`, `BeanCreationException`, or `PortAlreadyInUseException`.

**Likely Cause:**
- Database is unavailable at startup (Spring may fail-fast on datasource initialization).
- Port conflict with another process.
- Missing or malformed configuration (e.g., config server unreachable).

**Immediate Action:**
1. Check the last 50 lines of logs for the root cause exception.
2. Verify the configured port is not in use:
   ```bash
   lsof -i :<port>
   ```
3. Ensure `vets-db` is reachable before starting the service.
4. If using Spring Cloud Config, verify the config server is healthy.

**Investigation Steps:**
1. Run the service locally with `--debug` to get full auto-configuration report.
2. Validate all required environment variables are set.
3. Check for schema migration issues if Flyway/Liquibase is in use.

---

## Rollback Procedure

> ⚠️ No explicit rollback steps were documented. The following is a general procedure for a stateless Spring Boot microservice.

1. Identify the last known good version/tag/image of `spring-petclinic-vets-service`.
2. Check if there were any database schema migrations between the current and target versions:
   ```bash
   git log --oneline <good-version>..HEAD -- src/main/resources/db/
   ```
3. If **no schema changes**: redeploy the previous version using your deployment tooling.
4. If **schema changes exist**: assess backward compatibility before rolling back. Coordinate with the database team if a migration rollback is needed.
5. After rollback, verify the health endpoint:
   ```bash
   curl -s http://localhost:<port>/actuator/health
   ```
6. Verify core API functionality:
   ```bash
   curl -s http://localhost:<port>/vets
   ```
7. Monitor logs for errors for at least 5 minutes post-rollback.

---

## Useful Commands

**Check service health:**
```bash
curl -s http://localhost:<port>/actuator/health | jq .
```

**Fetch all vets (basic API smoke test):**
```bash
curl -s http://localhost:<port>/vets | jq .
```

**View active Spring profiles and configuration:**
```bash
curl -s http://localhost:<port>/actuator/env | jq '.activeProfiles'
```

**Check HikariCP connection pool metrics:**
```bash
curl -s http://localhost:<port>/actuator/metrics/hikaricp.connections.active | jq .
curl -s http://localhost:<port>/actuator/metrics/hikaricp.connections.pending | jq .
```

**View cache status (production profile):**
```bash
curl -s http://localhost:<port>/actuator/caches | jq .
```

**Tail service logs (container example):**
```bash
docker logs -f --tail 200 <container-id>
```

**Build the service locally:**
```bash
./mvnw clean package -pl spring-petclinic-vets-service -DskipTests
```

---

## Environment Notes

- **Caching is enabled in the `production` profile only.** It is disabled during unit tests. If you are debugging cache-related issues, ensure you are running with `--spring.profiles.active=production`.
- This is a **Spring Boot microservice** — standard Spring Boot Actuator conventions apply for health, metrics, info, and env endpoints.
- The service owns its own database (`vets-db`) — it is **not shared** with other microservices.
- When running locally or in dev, caching behavior will differ from production. Do not use dev/test environments to reproduce cache-related bugs.

---

## Escalation

| Situation                                      | Who to Contact                                      |
|------------------------------------------------|-----------------------------------------------------|
| `vets-db` is down or unrecoverable             | Database / Infrastructure team                      |
| Service crash-loops after deployment            | Application team / last deployer (check git blame)  |
| Config server unreachable                       | Platform / Infrastructure team                      |
| Data inconsistency between API and database     | Application team (likely cache or query issue)       |
| Widespread outage across multiple microservices | Platform team / Incident Commander                  |

---

## See Also

- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Spring Boot Actuator documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [HikariCP troubleshooting guide](https://github.com/brettwooldridge/HikariCP/wiki/Troubleshooting)
- [Spring Boot Graceful Shutdown](https://docs.spring.io/spring-boot/docs/current/reference/html/web.html#web.graceful-shutdown)
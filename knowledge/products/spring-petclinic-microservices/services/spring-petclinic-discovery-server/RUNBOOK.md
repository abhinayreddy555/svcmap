<!-- generated: 2026-04-13T04:17:57.244Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Runbook — spring-petclinic-discovery-server

## TL;DR for Agents

- **This is the Eureka Service Discovery server** — if it's down, all inter-service communication in the Spring PetClinic microservices ecosystem will fail or degrade.
- **Health check endpoint:** `http://<host>:8761/actuator/health` (default Spring Boot Actuator; port may vary by config).
- **Most common failure:** Other microservices unable to register or discover peers — check if this server is running and reachable on its configured port.
- **Restart is generally safe** — Eureka clients cache the registry locally, so a brief restart causes temporary inability to register/discover new instances but existing resolved routes continue working.
- **No external dependencies** — this service is a standalone Eureka server with no database or message broker requirements.

---

## Service Identity

| Property              | Value                                                                 |
|-----------------------|-----------------------------------------------------------------------|
| **Service Name**      | `spring-petclinic-discovery-server`                                   |
| **Repository**        | `spring-petclinic/spring-petclinic-microservices`                     |
| **Service Type**      | Infrastructure / Service Discovery (Netflix Eureka Server)            |
| **Health Endpoint**   | `http://<host>:8761/actuator/health` *(assumed default)*              |
| **Metrics Endpoint**  | `http://<host>:8761/actuator/metrics` *(assumed Spring Boot Actuator)*|
| **Eureka Dashboard**  | `http://<host>:8761/`                                                 |
| **Default Port**      | `8761`                                                                |
| **Deployment Platform** | Not specified — verify environment-specific deployment configs       |
| **Scaling Notes**     | Typically runs as a **single instance** or in a peer-aware cluster. Scaling requires Eureka peer configuration. Do not blindly scale horizontally without configuring peer replication. |
| **Dependencies**      | None (standalone infrastructure service)                              |

---

## Startup Procedure

1. **Verify configuration** — ensure `application.yml` (or profile-specific config from the Config Server) has the correct Eureka server settings:
   ```yaml
   server:
     port: 8761
   eureka:
     instance:
       hostname: localhost
     client:
       registerWithEureka: false
       fetchRegistry: false
   ```

2. **Start the Config Server first** (if the discovery server fetches config from it). Check the bootstrap configuration to determine if a config server dependency exists.

3. **Start the discovery server:**
   ```bash
   cd spring-petclinic-discovery-server
   ../mvnw spring-boot:run
   ```
   Or via a packaged JAR:
   ```bash
   java -jar spring-petclinic-discovery-server/target/spring-petclinic-discovery-server-*.jar
   ```

4. **Verify startup** — confirm the service is healthy:
   ```bash
   curl -s http://localhost:8761/actuator/health
   ```
   Expected response:
   ```json
   {"status":"UP"}
   ```

5. **Verify the Eureka dashboard** — open `http://localhost:8761/` in a browser and confirm the dashboard loads with no registered instances (if starting fresh) or with expected instances.

6. **Confirm downstream services can register** — start a client service (e.g., `api-gateway`) and verify it appears in the Eureka dashboard within 30 seconds.

---

## Graceful Shutdown

> **Note:** No explicit graceful shutdown behavior was documented for this service.

**Expected behavior based on Spring Boot defaults:**

- On receiving `SIGTERM`, Spring Boot initiates a graceful shutdown of the embedded Tomcat server.
- If `server.shutdown=graceful` is configured (Spring Boot 2.3+), in-flight requests are allowed to complete within a configurable timeout (`spring.lifecycle.timeout-per-shutdown-phase`, default 30s).
- Eureka client services will detect the server is unavailable and fall back to their locally cached service registry. Cached entries have a TTL and will eventually expire.
- **Impact window:** Client services tolerate a brief discovery server outage (typically 30–90 seconds) due to local caching. Longer outages will cause stale registrations and failed new lookups.

**To enable graceful shutdown explicitly, add to configuration:**
```yaml
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

---

## Common Failure Modes

### 1. Eureka Dashboard Unreachable / Service Not Starting

**Symptom:**
- `http://<host>:8761/` returns connection refused or timeout.
- Health check at `/actuator/health` is unreachable.

**Likely Cause:**
- Port `8761` is already in use by another process.
- JVM failed to start (out of memory, missing JAR, bad configuration).
- Config Server is down and the discovery server depends on it for bootstrap config.

**Immediate Action:**
```bash
# Check if the process is running
ps aux | grep discovery-server

# Check if the port is in use
lsof -i :8761
# or
netstat -tlnp | grep 8761
```

**Investigation Steps:**
1. Check application logs for startup errors:
   ```bash
   tail -200 logs/discovery-server.log
   ```
2. Look for `BindException` (port conflict) or `ConfigServiceException` (config server unreachable).
3. Verify JVM has sufficient memory allocated.
4. If using Docker/Kubernetes, check container status and resource limits.

---

### 2. Client Services Fail to Register

**Symptom:**
- Eureka dashboard shows zero or fewer registered instances than expected.
- Client service logs show `com.netflix.discovery.shared.transport.TransportException` or `Connection refused` to the Eureka URL.

**Likely Cause:**
- Discovery server is running but client services have an incorrect `eureka.client.serviceUrl.defaultZone` configured.
- Network/firewall rules blocking communication between client and discovery server.
- Discovery server is in self-preservation mode and not expiring stale entries (not directly causing registration failure, but related).

**Immediate Action:**
```bash
# Verify discovery server is accepting registrations
curl -s http://localhost:8761/eureka/apps | head -50

# Check a specific client's configured Eureka URL
grep -r "eureka.client.serviceUrl" <client-service>/src/main/resources/
```

**Investigation Steps:**
1. Confirm the discovery server's `/eureka/apps` REST endpoint returns a valid XML/JSON response.
2. Check client service logs for repeated registration retry messages.
3. Verify DNS resolution and network connectivity from client to discovery server host.
4. Check if the Config Server is serving the correct Eureka URL to clients.

---

### 3. Self-Preservation Mode Triggered

**Symptom:**
- Eureka dashboard displays a red warning: **"EMERGENCY! EUREKA MAY BE INCORRECTLY CLAIMING INSTANCES ARE UP WHEN THEY'RE NOT."**
- Stale/dead service instances remain in the registry.

**Likely Cause:**
- Network partition or instability causing heartbeat failures from multiple clients simultaneously.
- Clients were stopped abruptly without deregistering.
- In development/test environments with few instances, self-preservation triggers easily.

**Immediate Action:**
- **In production:** Do NOT disable self-preservation — it protects against mass deregistration during network issues. Wait for heartbeats to resume.
- **In development/test:** Optionally disable self-preservation:
  ```yaml
  eureka:
    server:
      enableSelfPreservation: false
  ```

**Investigation Steps:**
1. Check the Eureka dashboard for the renewal threshold vs. actual renewals per minute.
2. Verify network connectivity between clients and the discovery server.
3. Check if clients were recently restarted or scaled down without graceful shutdown.

---

### 4. High Memory / GC Pressure

**Symptom:**
- Discovery server becomes slow or unresponsive.
- Frequent full GC pauses in logs.
- Clients experience timeouts when communicating with Eureka.

**Likely Cause:**
- JVM heap too small for the number of registered instances.
- Memory leak (rare, but possible with certain Spring Boot / Eureka versions).

**Immediate Action:**
```bash
# Check JVM memory usage
jstat -gcutil $(pgrep -f discovery-server) 1000 5

# Generate heap dump for analysis if needed
jmap -dump:format=b,file=/tmp/discovery-heap.hprof $(pgrep -f discovery-server)
```

**Investigation Steps:**
1. Review JVM startup flags — ensure adequate heap (`-Xmx512m` minimum for moderate workloads).
2. Check the number of registered instances — an unusually high count may indicate a registration loop.
3. Review GC logs if enabled (`-Xlog:gc*` for JDK 11+).

---

## Rollback Procedure

> **Note:** No specific rollback steps were documented. The following is a general rollback procedure.

1. **Identify the last known good version** of the discovery server artifact (JAR or Docker image tag).

2. **Stop the current instance:**
   ```bash
   # If running as a process
   kill -SIGTERM $(pgrep -f spring-petclinic-discovery-server)
   
   # If running in Docker
   docker stop discovery-server
   ```

3. **Deploy the previous version:**
   ```bash
   # JAR-based deployment
   cp /path/to/backup/spring-petclinic-discovery-server-<previous-version>.jar \
      /path/to/deploy/spring-petclinic-discovery-server.jar
   
   # Docker-based deployment
   docker run -d --name discovery-server -p 8761:8761 \
     spring-petclinic-discovery-server:<previous-tag>
   ```

4. **Start and verify:**
   ```bash
   curl -s http://localhost:8761/actuator/health
   # Expected: {"status":"UP"}
   ```

5. **Monitor client re-registration** — check the Eureka dashboard to confirm client services re-register within 30–60 seconds.

6. **Notify the team** and document the rollback reason for post-incident review.

---

## Useful Commands

**Check service health:**
```bash
curl -s http://localhost:8761/actuator/health | jq .
```

**View all registered services:**
```bash
curl -s http://localhost:8761/eureka/apps | xmllint --format -
```

**Check a specific registered service:**
```bash
curl -s http://localhost:8761/eureka/apps/<SERVICE-NAME> | xmllint --format -
```

**View environment and config properties (if Actuator endpoints are exposed):**
```bash
curl -s http://localhost:8761/actuator/env | jq .
```

**Check Eureka server info endpoint:**
```bash
curl -s http://localhost:8761/actuator/info | jq .
```

**View application logs (common locations):**
```bash
# If running with default Spring Boot logging
tail -f logs/spring-petclinic-discovery-server.log

# If running in Docker
docker logs -f discovery-server --tail 200
```

**Force deregister a stale instance via Eureka REST API:**
```bash
curl -X DELETE http://localhost:8761/eureka/apps/<APP-NAME>/<INSTANCE-ID>
```

**Build the service from source:**
```bash
cd spring-petclinic-microservices
./mvnw clean package -pl spring-petclinic-discovery-server -am -DskipTests
```

---

## Environment Notes

- **Port configuration:** The default port is `8761`. This is the conventional Eureka port and is expected by most Spring Cloud clients by default. Changing it requires updating all client `eureka.client.serviceUrl.defaultZone` values.
- **Config Server dependency:** Check `bootstrap.yml` or `bootstrap.properties` to determine if this service fetches its configuration from the Spring Cloud Config Server. If so, the Config Server must be running before this service starts.
- **Single-instance vs. cluster:** In most PetClinic demo/dev deployments, the discovery server runs as a single instance with `registerWithEureka: false` and `fetchRegistry: false`. For production-like setups, configure peer awareness.
- **Spring profiles:** Check for environment-specific profiles (e.g., `docker`, `kubernetes`, `production`) that may override ports, hostnames, or peer URLs.
- **Container networking:** When running in Docker Compose or Kubernetes, ensure the service hostname matches what clients use to reach it (e.g., `discovery-server` as a Docker service name or Kubernetes service DNS).

---

## Escalation

| Situation | Who to Contact |
|---|---|
| Discovery server won't start after restart and rollback | Service owner / platform team |
| Persistent network partitions causing repeated self-preservation triggers | Network / infrastructure team |
| All microservices unable to discover each other (full outage) | On-call lead — treat as **P1 incident** |
| Suspected memory leak or JVM crash | Service owner / JVM platform team |
| Configuration issues originating from Config Server | Config Server owner (see [Config Server runbook](../spring-petclinic-config-server/RUNBOOK.md) if available) |

---

## See Also

- [Spring PetClinic Microservices — GitHub Repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Netflix Eureka Wiki — Understanding Self-Preservation](https://github.com/Netflix/eureka/wiki/Understanding-Eureka-Peer-to-Peer-Communication)
- [Spring Cloud Netflix — Eureka Server Reference Documentation](https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/#spring-cloud-eureka-server)
- [Spring Boot Actuator — Health Endpoints](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html#actuator.endpoints.health)
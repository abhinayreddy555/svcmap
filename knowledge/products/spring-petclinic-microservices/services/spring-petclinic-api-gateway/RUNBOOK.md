<!-- generated: 2026-04-13T04:13:34.943Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Runbook — spring-petclinic-api-gateway

## TL;DR for Agents

- **Health check endpoint:** Not explicitly configured — try `GET /actuator/health` (Spring Boot default) on port `8080`.
- **Most common failure:** Downstream service calls fail due to Resilience4j circuit breakers opening; check circuit breaker state and downstream pod health first.
- **Restart safe?** Yes — this is a stateless API gateway. Restarting a pod is a safe first-response action, but will not fix issues caused by unhealthy downstream services.
- **Key dependencies:** `owner-service`, `vet-service`, `visit-service`, `pet-service` — if any are down, the gateway will surface errors for those routes.
- **Resilience patterns in play:** Circuit breaker, bulkhead (thread pool isolation), and time limiter via Resilience4j — all three can independently cause request failures.

---

## Service Identity

| Field                | Value                                                                 |
|----------------------|-----------------------------------------------------------------------|
| **Service**          | `spring-petclinic-api-gateway`                                        |
| **Product**          | `spring-petclinic-microservices`                                      |
| **Repository**       | `spring-petclinic/spring-petclinic-microservices`                     |
| **Type**             | API Gateway                                                           |
| **Health Endpoint**  | `/actuator/health` (assumed Spring Boot default — not explicitly confirmed) |
| **Metrics Endpoint** | `/actuator/metrics` (assumed Spring Boot Actuator default)            |
| **Deployment Platform** | Kubernetes (inferred from operational commands)                    |
| **Scaling**          | Stateless — safe to horizontally scale replicas                       |
| **Dependencies**     | `owner-service`, `vet-service`, `visit-service`, `pet-service`        |

---

## Startup Procedure

> **Note:** No explicit startup procedure was found in the source code. The following is the expected Spring Boot / Kubernetes lifecycle.

1. Kubernetes scheduler places the pod on a node.
2. Container runtime pulls the image and starts the JVM process.
3. Spring Boot application context initializes, including Resilience4j circuit breaker, bulkhead, and time limiter beans.
4. The gateway registers with service discovery (if configured) and begins routing traffic.
5. Readiness probe (expected at `/actuator/health`) passes, and the pod is added to the Service endpoints.

**If the pod is stuck in `CrashLoopBackOff`:**
- Check logs immediately: `kubectl logs <gateway-pod> --previous`
- Common causes: missing config (environment variables, ConfigMap), downstream service discovery misconfiguration, port conflicts.

---

## Graceful Shutdown

> **Note:** No explicit shutdown behavior was documented in the source code.

**Expected behavior (Spring Boot defaults):**

- Kubernetes sends `SIGTERM` to the container process.
- Spring Boot begins graceful shutdown: stops accepting new requests and waits for in-flight requests to complete (default timeout: 30 seconds).
- Resilience4j bulkhead drains active threads.
- The JVM exits. If the process has not exited within the pod's `terminationGracePeriodSeconds` (default 30s), Kubernetes sends `SIGKILL`.

**Recommendation:** Ensure `terminationGracePeriodSeconds` in the pod spec is ≥ the longest configured `timelimiter` timeout to avoid hard-killing in-flight requests.

---

## Common Failure Modes

### 1. Downstream Service Calls Fail or Timeout

| Field              | Detail |
|--------------------|--------|
| **Symptom**        | Individual API routes return errors; clients see failures for specific resources (e.g., owners, vets, visits). |
| **Likely Cause**   | Circuit breaker in `OPEN` state due to repeated failures in one or more downstream services (`owner-service`, `vet-service`, `visit-service`, `pet-service`). |
| **Immediate Action** | Check circuit breaker status via Resilience4j metrics. Verify downstream service health. Check network connectivity between gateway and downstream pods. |

**Investigation Steps:**

1. Review gateway logs for `CircuitBreakerOpenException`:
   ```bash
   kubectl logs -f <gateway-pod> | grep -i "CircuitBreaker"
   ```
2. Check Resilience4j bulkhead and time limiter metrics:
   ```bash
   curl http://localhost:8080/actuator/metrics/resilience4j.circuitbreaker.state
   ```
3. Verify downstream microservice pod status:
   ```bash
   kubectl get pods -l app=<downstream-service>
   kubectl logs <downstream-pod> --tail=100
   ```
4. Check for cascading failures — if one service is slow, bulkhead exhaustion can starve threads for other services.

---

### 2. API Gateway Returns 5xx Errors on All Endpoints

| Field              | Detail |
|--------------------|--------|
| **Symptom**        | All API routes return `500`, `502`, `503`, or `504` errors. No downstream service is reachable. |
| **Likely Cause**   | All downstream microservices unreachable; all circuit breakers in `OPEN` state; bulkhead thread pool fully exhausted. |
| **Immediate Action** | Check pod logs for connection errors. Verify service discovery / DNS resolution. Restart gateway pod if logs suggest a stale state. |

**Investigation Steps:**

1. Verify all downstream microservice pods are running and healthy:
   ```bash
   kubectl get pods --selector='app in (owner-service,vet-service,visit-service,pet-service)'
   ```
2. Test DNS resolution from inside the gateway pod:
   ```bash
   kubectl exec -it <gateway-pod> -- nslookup owner-service
   ```
3. Review bulkhead active thread count and queue depth:
   ```bash
   curl http://localhost:8080/actuator/metrics/resilience4j.bulkhead.active.thread.pool.size
   curl http://localhost:8080/actuator/metrics/resilience4j.bulkhead.queue.depth
   ```
4. Check time limiter timeout configurations vs actual downstream latency.
5. If the gateway itself is unhealthy, restart:
   ```bash
   kubectl delete pod <gateway-pod>
   ```

---

### 3. Slow Response Times or Intermittent Timeouts

| Field              | Detail |
|--------------------|--------|
| **Symptom**        | Elevated p95/p99 latency. Intermittent `504 Gateway Timeout` errors. Some requests succeed, others do not. |
| **Likely Cause**   | Bulkhead thread pool near capacity; downstream services responding slowly; time limiter threshold too aggressive for current conditions. |
| **Immediate Action** | Monitor bulkhead metrics. Check downstream service latency. Consider scaling gateway replicas to increase total thread capacity. |

**Investigation Steps:**

1. Check bulkhead active thread count and queue size:
   ```bash
   curl http://localhost:8080/actuator/metrics/resilience4j.bulkhead.active.thread.pool.size
   ```
2. Profile downstream service response times:
   ```bash
   kubectl exec -it <gateway-pod> -- curl -w "@curl-format.txt" -o /dev/null -s http://owner-service:8080/owners
   ```
3. Review time limiter timeout configuration vs actual observed latency — if the timeout is 1s but the downstream p99 is 1.2s, you will see frequent timeouts.
4. Check for resource contention (CPU/memory) on the gateway pod:
   ```bash
   kubectl top pod <gateway-pod>
   ```
5. Scale if needed:
   ```bash
   kubectl scale deployment spring-petclinic-api-gateway --replicas=3
   ```

---

## Rollback Procedure

> **Note:** No explicit rollback steps were found in the repository. The following is a generic Kubernetes rollback procedure.

1. Identify the current and previous revision:
   ```bash
   kubectl rollout history deployment/spring-petclinic-api-gateway
   ```
2. Roll back to the previous revision:
   ```bash
   kubectl rollout undo deployment/spring-petclinic-api-gateway
   ```
3. To roll back to a specific revision:
   ```bash
   kubectl rollout undo deployment/spring-petclinic-api-gateway --to-revision=<N>
   ```
4. Monitor the rollout:
   ```bash
   kubectl rollout status deployment/spring-petclinic-api-gateway
   ```
5. Verify health after rollback:
   ```bash
   kubectl get pods -l app=spring-petclinic-api-gateway
   curl http://<gateway-endpoint>/actuator/health
   ```

---

## Useful Commands

**Check circuit breaker status in logs:**
```bash
kubectl logs -f <gateway-pod> | grep CircuitBreaker
```

**Monitor Resilience4j metrics via Actuator:**
```bash
kubectl port-forward <gateway-pod> 8080:8080
curl http://localhost:8080/actuator/metrics
curl http://localhost:8080/actuator/metrics/resilience4j.circuitbreaker.state
curl http://localhost:8080/actuator/metrics/resilience4j.bulkhead.active.thread.pool.size
curl http://localhost:8080/actuator/metrics/resilience4j.timelimiter.calls
```

**Verify downstream service connectivity from inside the gateway pod:**
```bash
kubectl exec -it <gateway-pod> -- curl -v http://owner-service:8080/actuator/health
kubectl exec -it <gateway-pod> -- curl -v http://vet-service:8080/actuator/health
kubectl exec -it <gateway-pod> -- curl -v http://visit-service:8080/actuator/health
kubectl exec -it <gateway-pod> -- curl -v http://pet-service:8080/actuator/health
```

**Check pod resource usage:**
```bash
kubectl top pod <gateway-pod>
```

**Force restart the gateway (stateless — safe):**
```bash
kubectl delete pod <gateway-pod>
```

**Get all events related to the gateway deployment:**
```bash
kubectl get events --field-selector involvedObject.name=<gateway-pod> --sort-by='.lastTimestamp'
```

---

## Environment Notes

- The API gateway is **stateless** and uses **Resilience4j** for fault tolerance with three patterns:
  - **Circuit Breaker** — prevents repeated calls to a failing downstream service; transitions through `CLOSED → OPEN → HALF_OPEN` states.
  - **Bulkhead** — thread pool isolation to prevent one slow downstream service from consuming all gateway threads.
  - **Time Limiter** — enforces maximum wait time for downstream responses.
- The gateway depends on four downstream microservices: `owner-service`, `vet-service`, `visit-service`, and `pet-service`. All must be reachable for full functionality.
- No explicit health check endpoint, Dockerfile, or Kubernetes manifests were found in the provided source. Operational behavior is inferred from Spring Boot and Resilience4j defaults.
- Circuit breaker state is **per-pod** — restarting a pod resets its circuit breakers to `CLOSED`, which can be useful as a temporary mitigation but will not fix underlying downstream issues.

---

## Escalation

| Situation | Who to Contact |
|-----------|----------------|
| Gateway pod crash-looping, logs show application context failure | Application / platform team owning `spring-petclinic-microservices` |
| All downstream services unreachable, DNS resolution failing | Kubernetes platform / infrastructure team |
| Persistent circuit breaker `OPEN` state for a specific downstream service | Team owning the affected downstream service (`owner-service`, `vet-service`, `visit-service`, or `pet-service`) |
| Network connectivity issues between pods / namespaces | Network / infrastructure team |
| Sustained high latency with no downstream issues identified | Application team — may require profiling, JVM tuning, or Resilience4j configuration changes |

---

## See Also

- [Spring PetClinic Microservices Repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [Resilience4j Documentation — Circuit Breaker](https://resilience4j.readme.io/docs/circuitbreaker)
- [Spring Boot Actuator — Production-Ready Features](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [Kubernetes — Debugging Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/)
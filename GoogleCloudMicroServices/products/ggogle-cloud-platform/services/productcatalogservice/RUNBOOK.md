<!-- generated: 2026-04-13T05:16:28.598Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Runbook — productcatalogservice

## TL;DR for Agents

- **Health check**: gRPC health protocol at `grpc.health.v1.Health/Check` on port `3550` — returns `SERVING` when operational. No HTTP health endpoint.
- **Most common failure**: High latency / CPU spike caused by dynamic catalog reloading being accidentally enabled via `SIGUSR1`. Fix immediately with `kill -USR2 1` inside the pod.
- **Restart safe?** Yes — service is stateless, reads `products.json` at startup, no persistent state or session affinity. Horizontal scaling is safe.
- **Data source**: Reads from `products.json` file at startup, or from AlloyDB if `ALLOYDB_CLUSTER_NAME` env var is set.
- **No SIGTERM drain**: Service lacks an explicit SIGTERM handler; in-flight requests may be interrupted on pod termination.

---

## Service Identity

| Property | Value |
|---|---|
| **Service Type** | gRPC API |
| **Health Endpoint** | `grpc.health.v1.Health/Check` on port `3550` |
| **Metrics Endpoint** | None (relies on OpenTelemetry tracing if enabled) |
| **Deployment Platform** | Kubernetes |
| **Default Port** | `3550` (override via `PORT` env var) |
| **Scaling** | Stateless; horizontal scaling safe. No session affinity required. |
| **Base Image** | Distroless (minimal attack surface) |
| **Dependencies** | `products.json` (file, bundled in image) or AlloyDB (PostgreSQL, when `ALLOYDB_CLUSTER_NAME` is set) |

---

## Startup Procedure

1. Load product catalog from `products.json` via `loadCatalog()` (or from AlloyDB if `ALLOYDB_CLUSTER_NAME` is configured).
2. Initialize gRPC server on port `3550` (or the value of the `PORT` environment variable).
3. Register `ProductCatalogService` and `Health` gRPC services.
4. Start listening for gRPC connections.
5. *(Optional)* Initialize OpenTelemetry tracing if `ENABLE_TRACING=1`. Requires `COLLECTOR_SERVICE_ADDR` to be set.
6. *(Optional)* Initialize Google Cloud Profiler unless `DISABLE_PROFILER` is set.

---

## Graceful Shutdown

| Signal | Behavior |
|---|---|
| `SIGUSR1` | Enables dynamic catalog reloading — catalog is re-parsed on **every request** (introduces significant latency; known bug). |
| `SIGUSR2` | Disables dynamic catalog reloading — reverts to startup-loaded catalog. |
| `SIGTERM` | No explicit handler. Relies on gRPC server default shutdown behavior. **In-flight requests may be interrupted without a drain period.** |

> **Warning:** Because there is no explicit SIGTERM drain, rolling deployments may cause brief request failures. Ensure readiness probes are configured so traffic is shifted before the pod is terminated.

---

## Common Failure Modes

### 1. Service Fails to Start (Panic in Logs)

- **Symptom:** Pod enters `CrashLoopBackOff`; panic visible in logs.
- **Likely Cause:** Missing `COLLECTOR_SERVICE_ADDR` environment variable when `ENABLE_TRACING=1`, or `products.json` file is missing/malformed.
- **Immediate Action:** Check pod logs for the panic message. Verify `products.json` exists in the container. If tracing is enabled, ensure `COLLECTOR_SERVICE_ADDR` is set.
- **Investigation Steps:**
  1. ```bash
     kubectl logs <pod-name> -c server
     ```
  2. Verify `products.json` is present (check the Dockerfile `COPY` step in the build).
  3. ```bash
     kubectl get pod <pod-name> -o yaml | grep -E 'ENABLE_TRACING|COLLECTOR_SERVICE_ADDR'
     ```

---

### 2. High Latency / CPU Spike in `parseCatalog`

- **Symptom:** All requests exhibit high latency; CPU usage spikes. Profiling shows `parseCatalog` consuming >80% CPU.
- **Likely Cause:** Dynamic catalog reloading was enabled via a `SIGUSR1` signal. The catalog is being re-parsed from `products.json` on **every single request**.
- **Immediate Action:**
  ```bash
  kubectl exec $(kubectl get pods -l app=productcatalogservice -o jsonpath='{.items[0].metadata.name}') -c server -- kill -USR2 1
  ```
- **Investigation Steps:**
  1. Check pod logs for the message `Enable catalog reloading`.
  2. Profile the service to confirm `parseCatalog` is the bottleneck.
  3. Verify no automation or operator recently sent `SIGUSR1` to the pod.

---

### 3. gRPC Health Check Fails

- **Symptom:** Readiness/liveness probes fail; `SERVING` status not returned from health check.
- **Likely Cause:** Service crashed, gRPC server is not listening, or `products.json` parse error during startup.
- **Immediate Action:** Restart the pod. Check logs for `loadCatalog()` errors.
- **Investigation Steps:**
  1. ```bash
     kubectl logs <pod-name> -c server
     ```
  2. Validate `products.json` is syntactically correct JSON.
  3. Confirm the gRPC server is listening:
     ```bash
     kubectl exec <pod-name> -c server -- netstat -tlnp | grep 3550
     ```

---

### 4. Unexpected Latency (EXTRA_LATENCY Not Intentionally Configured)

- **Symptom:** Requests are slower than expected, but dynamic catalog reloading is not enabled.
- **Likely Cause:** `EXTRA_LATENCY` environment variable is set to a high value, or tracing/profiling overhead is significant.
- **Immediate Action:** Check the `EXTRA_LATENCY` env var value and verify tracing/profiler settings.
- **Investigation Steps:**
  1. ```bash
     kubectl get pod <pod-name> -o yaml | grep EXTRA_LATENCY
     ```
  2. Check if the tracing exporter connection is slow or timing out:
     ```bash
     kubectl get pod <pod-name> -o yaml | grep COLLECTOR_SERVICE_ADDR
     ```
  3. Review profiler initialization logs for errors or retries.

---

## Rollback Procedure

1. Identify the previous stable image tag:
   ```bash
   kubectl rollout history deployment/productcatalogservice
   ```

2. Roll back the deployment:
   ```bash
   kubectl set image deployment/productcatalogservice productcatalogservice=<previous-image-tag>
   ```

3. Monitor rollout status:
   ```bash
   kubectl rollout status deployment/productcatalogservice
   ```

4. Verify the gRPC health check passes:
   ```bash
   grpcurl -plaintext localhost:3550 grpc.health.v1.Health/Check
   ```

5. Confirm product listing returns expected data:
   ```bash
   grpcurl -plaintext localhost:3550 hipstershop.ProductCatalogService/ListProducts
   ```

---

## Useful Commands

**View pod logs (streaming):**
```bash
kubectl logs -f deployment/productcatalogservice -c server
```

**Enable dynamic catalog reloading (⚠️ triggers known latency bug):**
```bash
kubectl exec $(kubectl get pods -l app=productcatalogservice -o jsonpath='{.items[0].metadata.name}') -c server -- kill -USR1 1
```

**Disable dynamic catalog reloading (fix for latency bug):**
```bash
kubectl exec $(kubectl get pods -l app=productcatalogservice -o jsonpath='{.items[0].metadata.name}') -c server -- kill -USR2 1
```

**Test gRPC health check:**
```bash
grpcurl -plaintext localhost:3550 grpc.health.v1.Health/Check
```

**Check environment variables in running pod:**
```bash
kubectl exec <pod-name> -c server -- env | grep -E 'ENABLE_TRACING|EXTRA_LATENCY|PORT|DISABLE_PROFILER|COLLECTOR_SERVICE_ADDR|ALLOYDB_CLUSTER_NAME'
```

**Restart the deployment (rolling):**
```bash
kubectl rollout restart deployment/productcatalogservice
```

---

## Environment Notes

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3550` | gRPC server listen port |
| `ENABLE_TRACING` | Disabled (`0`) | Set to `1` to enable OpenTelemetry tracing |
| `COLLECTOR_SERVICE_ADDR` | *(none)* | **Required** when `ENABLE_TRACING=1`. Address of the trace collector. |
| `DISABLE_PROFILER` | *(not set — profiler enabled)* | Set to any value to disable Google Cloud Profiler |
| `EXTRA_LATENCY` | `0` | Artificial latency added to every request (e.g., `100ms`). Used for demo/testing. |
| `ALLOYDB_CLUSTER_NAME` | *(none)* | When set, loads product catalog from AlloyDB (PostgreSQL) instead of `products.json` |

- **Stateless**: No database dependency by default. All data comes from `products.json` bundled in the container image.
- **AlloyDB mode**: When `ALLOYDB_CLUSTER_NAME` is set, the service connects to an AlloyDB PostgreSQL instance to load the catalog. Ensure network connectivity and credentials are configured.
- **Distroless image**: Minimal base image — no shell available for debugging. Use ephemeral debug containers if needed:
  ```bash
  kubectl debug -it <pod-name> --image=busybox --target=server
  ```

---

## Escalation

| Situation | Who to Contact |
|---|---|
| Service won't start after rollback; `products.json` corruption suspected | Application team / repo maintainers (`GoogleCloudPlatform/microservices-demo`) |
| AlloyDB connectivity failures | Database / infrastructure team |
| Persistent high latency after disabling catalog reload | Platform / SRE team (investigate node-level resource contention) |
| gRPC health check flapping across multiple pods | Kubernetes cluster admin (check node health, network policies) |
| Tracing exporter errors (`COLLECTOR_SERVICE_ADDR` unreachable) | Observability / platform team |

---

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Failure injection scenarios and demo workflows for this service
- [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — Source repository and architecture documentation
- [gRPC Health Checking Protocol](https://github.com/grpc/grpc/blob/master/doc/health-checking.md) — Specification for the `grpc.health.v1.Health` service
- [Kubernetes Troubleshooting Guide](https://kubernetes.io/docs/tasks/debug/) — General pod debugging and diagnostics
<!-- generated: 2026-04-13T05:09:21.610Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Runbook — cartservice

## TL;DR for Agents

- **Health Check**: gRPC health check on the serving port (default `:7070`). The service implements the standard gRPC health checking protocol.
- **Most Common Failure**: Cart storage backend unreachable — Redis connection refused, Spanner deadline exceeded, or AlloyDB connection timeout. Check `REDIS_ADDR`, `SPANNER_CONNECTION_STRING`, or `ALLOY_DB_CONNECTION_STRING` environment variables first.
- **Restart Safe?** Yes — cartservice is stateless; all cart data is persisted in the configured backend (Redis/Spanner/AlloyDB). Restarting will not cause data loss.
- **Storage Backend Selection**: The service selects exactly one backend based on environment variables. If none are set, it falls back to an in-memory cache (data lost on restart).
- **Part of**: [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — the Online Boutique reference architecture.

---

## Service Identity

| Attribute | Value |
|---|---|
| **Service Name** | `cartservice` |
| **Type** | gRPC API |
| **Language / Runtime** | C# / .NET |
| **Health Endpoint** | gRPC Health Checking Protocol on port `7070` |
| **Metrics** | OpenTelemetry (exported via OTEL collector) |
| **Default Port** | `7070` |
| **Deployment Platform** | Kubernetes (GKE) |
| **Scaling** | Horizontal — stateless pods behind Kubernetes Service |
| **Image** | `gcr.io/google-samples/microservices-demo/cartservice` |
| **Namespace** | Typically `default` or application-specific namespace |

---

## Startup Procedure

1. **Container starts** — the .NET runtime initializes and reads environment variables.
2. **Backend selection** — the service evaluates environment variables in priority order:
   - If `SPANNER_CONNECTION_STRING` is set → use **Google Cloud Spanner**.
   - If `ALLOY_DB_CONNECTION_STRING` is set → use **AlloyDB (PostgreSQL)**.
   - If `REDIS_ADDR` is set → use **Redis** via StackExchange.Redis.
   - If none are set → fall back to **in-memory distributed cache** (ephemeral).
3. **Connection pool initialization** — the selected backend client establishes connections (Redis multiplexer, Spanner session pool, or Npgsql connection pool).
4. **gRPC server binds** to port `7070` (or `PORT` env var if overridden).
5. **Health check endpoint** becomes `SERVING` — readiness probe passes.
6. **OpenTelemetry instrumentation** initializes and begins exporting traces/metrics to the configured OTEL collector.

> **Note**: If the backend is unreachable at startup, the service may start but health checks will fail, causing Kubernetes to mark the pod as not ready.

---

## Graceful Shutdown

When `SIGTERM` is received:

1. The .NET `IHostApplicationLifetime` triggers the application stopping event.
2. The gRPC server stops accepting new requests.
3. In-flight requests are given a grace period to complete (Kubernetes default: 30 seconds via `terminationGracePeriodSeconds`).
4. Backend connections are drained and closed:
   - **Redis**: The StackExchange.Redis `ConnectionMultiplexer` is disposed.
   - **Spanner**: The Spanner client session pool is closed.
   - **AlloyDB**: The Npgsql connection pool is disposed.
5. The process exits with code `0`.

Kubernetes will send `SIGKILL` after the termination grace period if the process has not exited.

---

## Common Failure Modes

### 1. Redis Connection Failure

**Symptom**
- gRPC calls return `UNAVAILABLE` or `INTERNAL` errors.
- Logs show `StackExchange.Redis.RedisConnectionException` or `It was not possible to connect to the redis server`.
- Health check transitions to `NOT_SERVING`.

**Likely Cause**
- Redis instance is down or unreachable.
- `REDIS_ADDR` is misconfigured (wrong host/port).
- Network policy blocking traffic to Redis.
- Redis memory limit exceeded (`OOM` command not allowed).

**Immediate Action**
```bash
# Verify Redis is reachable from the pod
kubectl exec -it <cartservice-pod> -- sh -c "nc -zv <redis-host> <redis-port>"

# Check Redis pod status
kubectl get pods -l app=redis-cart

# Check Redis logs
kubectl logs -l app=redis-cart --tail=50
```

**Investigation Steps**
1. Confirm `REDIS_ADDR` env var is correctly set: `kubectl exec <pod> -- printenv REDIS_ADDR`
2. Check Redis memory usage: `redis-cli -h <host> INFO memory`
3. Verify Kubernetes NetworkPolicy allows egress from cartservice to Redis on port `6379`.
4. Check if Redis has hit `maxmemory` and the eviction policy is rejecting writes.
5. Review cartservice logs for connection timeout values and retry patterns.

---

### 2. Google Cloud Spanner Errors

**Symptom**
- gRPC calls return `DEADLINE_EXCEEDED`, `UNAVAILABLE`, or `PERMISSION_DENIED`.
- Logs show `Grpc.Core.RpcException` with Spanner-related messages.
- Increased latency on all cart operations.

**Likely Cause**
- Spanner instance is paused, deleted, or in a different project.
- `SPANNER_CONNECTION_STRING` is malformed.
- Service account lacks `roles/spanner.databaseUser` IAM role.
- Spanner instance is at capacity (high CPU utilization).

**Immediate Action**
```bash
# Verify Spanner instance status
gcloud spanner instances describe <instance-id> --project=<project>

# Check IAM bindings
gcloud spanner databases get-iam-policy <database-id> \
  --instance=<instance-id> --project=<project>

# Check Spanner CPU utilization
gcloud monitoring read "spanner.googleapis.com/instance/cpu/utilization" \
  --project=<project> --filter='resource.instance_id="<instance-id>"'
```

**Investigation Steps**
1. Parse `SPANNER_CONNECTION_STRING` and verify project, instance, and database IDs.
2. Confirm the Kubernetes service account is mapped to a GCP service account with Spanner permissions (Workload Identity).
3. Check Spanner console for hotspots or high read/write latency.
4. Verify the `cart_items` table exists and schema is correct.
5. Check for retryable transaction aborts in logs — these are normal at low rates but indicate contention at high rates.

---

### 3. AlloyDB Connection Timeout

**Symptom**
- gRPC calls return `UNAVAILABLE` or `INTERNAL`.
- Logs show `Npgsql.NpgsqlException` or `Connection refused` / `timeout expired`.
- Pod is running but readiness probe fails.

**Likely Cause**
- AlloyDB primary instance is down or restarting.
- `ALLOY_DB_CONNECTION_STRING` has incorrect host, port, credentials, or database name.
- VPC peering or Private Service Connect is misconfigured.
- Connection pool exhaustion under high load.

**Immediate Action**
```bash
# Check AlloyDB instance status
gcloud alloydb instances list --cluster=<cluster> --region=<region> --project=<project>

# Test connectivity from pod
kubectl exec -it <cartservice-pod> -- sh -c "nc -zv <alloydb-host> 5432"

# Check cartservice logs
kubectl logs <cartservice-pod> --tail=100 | grep -i "npgsql\|alloy\|connection"
```

**Investigation Steps**
1. Verify `ALLOY_DB_CONNECTION_STRING` format: `Host=<ip>;Port=5432;Database=<db>;Username=<user>;Password=<pass>`.
2. Confirm VPC connectivity — AlloyDB requires Private IP access from the GKE cluster's VPC.
3. Check AlloyDB metrics in Cloud Console for CPU, memory, and connection count.
4. Verify the `cart_items` table exists: connect via `psql` and run `\dt`.
5. Check if max connections limit is reached on the AlloyDB instance.

---

### 4. In-Memory Fallback (Unintended)

**Symptom**
- Cart data is lost after pod restarts or rescheduling.
- No errors in logs — service appears healthy.
- Users report empty carts intermittently.

**Likely Cause**
- None of the backend environment variables (`REDIS_ADDR`, `SPANNER_CONNECTION_STRING`, `ALLOY_DB_CONNECTION_STRING`) are set.
- Environment variable was removed during a deployment or config change.

**Immediate Action**
```bash
# Check which env vars are set
kubectl exec <cartservice-pod> -- printenv | grep -E "REDIS_ADDR|SPANNER|ALLOY_DB"

# Check the deployment spec
kubectl get deployment cartservice -o jsonpath='{.spec.template.spec.containers[0].env}' | jq .
```

**Investigation Steps**
1. Review recent deployment changes: `kubectl rollout history deployment/cartservice`.
2. Check ConfigMaps and Secrets referenced by the deployment.
3. Confirm the intended backend and set the appropriate environment variable.
4. Redeploy with the correct configuration.

---

### 5. High Latency / gRPC Deadline Exceeded

**Symptom**
- Upstream services (e.g., `frontend`) report `DEADLINE_EXCEEDED` when calling cartservice.
- p99 latency spikes visible in traces.
- No explicit errors in cartservice logs.

**Likely Cause**
- Backend storage is slow (Redis slow queries, Spanner hotspots, AlloyDB under-provisioned).
- Pod resource limits too low — CPU throttling.
- Network latency between cartservice and storage backend.

**Immediate Action**
```bash
# Check pod resource usage
kubectl top pod <cartservice-pod>

# Check for CPU throttling
kubectl describe pod <cartservice-pod> | grep -A5 "Limits\|Requests"

# Check recent traces in your observability platform
```

**Investigation Steps**
1. Review distributed traces to identify which backend call is slow.
2. Check pod CPU throttling: if `cpu usage` is near `limits.cpu`, increase the limit.
3. For Redis: run `redis-cli --latency` and `redis-cli SLOWLOG GET 10`.
4. For Spanner: check the Query Statistics dashboard for slow queries.
5. For AlloyDB: check `pg_stat_activity` for long-running queries.

---

## Rollback Procedure

1. **Identify the last known good revision**:
   ```bash
   kubectl rollout history deployment/cartservice
   ```

2. **Roll back to the previous revision**:
   ```bash
   kubectl rollout undo deployment/cartservice
   ```
   Or to a specific revision:
   ```bash
   kubectl rollout undo deployment/cartservice --to-revision=<N>
   ```

3. **Monitor the rollout**:
   ```bash
   kubectl rollout status deployment/cartservice --timeout=120s
   ```

4. **Verify health**:
   ```bash
   kubectl get pods -l app=cartservice
   grpcurl -plaintext <cartservice-ip>:7070 grpc.health.v1.Health/Check
   ```

5. **Validate cart operations** — use the frontend or a gRPC client to add/retrieve/empty a cart.

6. **Notify the team** — document the rollback reason and open a follow-up issue.

---

## Useful Commands

**Check pod status and recent events**
```bash
kubectl get pods -l app=cartservice -o wide
kubectl describe pod <cartservice-pod>
```

**Stream logs**
```bash
kubectl logs -f -l app=cartservice --tail=100
```

**Check environment variables on running pod**
```bash
kubectl exec <cartservice-pod> -- printenv | sort
```

**gRPC health check (requires grpcurl)**
```bash
grpcurl -plaintext <pod-ip>:7070 grpc.health.v1.Health/Check
```

**Test cart operations via gRPC**
```bash
# Add item to cart
grpcurl -plaintext -d '{"user_id":"test-user","item":{"product_id":"OLJCESPC7Z","quantity":1}}' \
  <pod-ip>:7070 oteldemo.CartService/AddItem

# Get cart
grpcurl -plaintext -d '{"user_id":"test-user"}' \
  <pod-ip>:7070 oteldemo.CartService/GetCart

# Empty cart
grpcurl -plaintext -d '{"user_id":"test-user"}' \
  <pod-ip>:7070 oteldemo.CartService/EmptyCart
```

**Check Redis connectivity and state**
```bash
kubectl exec -it <redis-pod> -- redis-cli PING
kubectl exec -it <redis-pod> -- redis-cli INFO memory
kubectl exec -it <redis-pod> -- redis-cli DBSIZE
```

**Force restart all cartservice pods**
```bash
kubectl rollout restart deployment/cartservice
```

**Check resource quotas and limits**
```bash
kubectl top pods -l app=cartservice
kubectl get resourcequota -n <namespace>
```

---

## Environment Notes

| Environment Variable | Required | Description |
|---|---|---|
| `REDIS_ADDR` | Conditional | Redis address in `host:port` format (e.g., `redis-cart:6379`) |
| `SPANNER_CONNECTION_STRING` | Conditional | Spanner connection string: `projects/<p>/instances/<i>/databases/<d>` |
| `ALLOY_DB_CONNECTION_STRING` | Conditional | Npgsql connection string for AlloyDB |
| `PORT` | No | gRPC listening port (default: `7070`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | OpenTelemetry collector endpoint |
| `OTEL_SERVICE_NAME` | No | Service name for telemetry (default: `cartservice`) |

> **Backend priority**: Spanner > AlloyDB > Redis > In-Memory. Only one backend is active at a time. If multiple env vars are set, the highest-priority backend is selected.

> **In-memory fallback warning**: If no backend env var is set, the service uses an in-memory cache. This is acceptable for local development only — **never for production**.

---

## Escalation

| Situation | Who to Contact | Channel |
|---|---|---|
| cartservice pods crash-looping, restart does not resolve | Application team / SRE on-call | `#oncall-platform` |
| Redis instance down or unresponsive | Infrastructure / Database team | `#oncall-infra` |
| Spanner permission denied or instance unavailable | Cloud Platform / IAM team | `#oncall-cloud` |
| AlloyDB connectivity failure (VPC/networking) | Networking team | `#oncall-networking` |
| Data inconsistency (carts showing wrong items) | Application team + Database team | `#oncall-platform` + incident bridge |
| Sustained high latency across all backends | SRE on-call | `#oncall-platform` |

---

## See Also

- [microservices-demo repository](https://github.com/GoogleCloudPlatform/microservices-demo) — full source code and deployment manifests
- [Kubernetes Deployment manifests](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/kubernetes-manifests) — cartservice and Redis deployment specs
- [gRPC Health Checking Protocol](https://github.com/grpc/grpc/blob/master/doc/health-checking.md) — specification for the health check endpoint
- [OpenTelemetry .NET documentation](https://opentelemetry.io/docs/languages/net/) — instrumentation and exporter configuration
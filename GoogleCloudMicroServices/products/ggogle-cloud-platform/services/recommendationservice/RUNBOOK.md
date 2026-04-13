<!-- generated: 2026-04-13T05:25:31.838Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Runbook — recommendationservice

## TL;DR for Agents

- **Health Check**: gRPC health check on the service's listening port (default `:8080`)
- **Most Common Failure**: Python dependency issues or failure to connect to the `productcatalogservice` for product data
- **Restart Safe?**: Yes — this service is stateless; restarts are safe and often the fastest remediation
- **What it does**: Provides product recommendations via gRPC by querying the product catalog and returning a filtered list
- **Part of**: [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) — the Online Boutique demo application

## Service Identity

| Attribute            | Value                                                        |
|----------------------|--------------------------------------------------------------|
| **Service Name**     | `recommendationservice`                                      |
| **Type**             | API (gRPC)                                                   |
| **Language/Runtime** | Python                                                       |
| **Health Endpoint**  | gRPC Health Checking Protocol on service port (default `8080`) |
| **Metrics**          | OpenTelemetry traces exported to the configured collector     |
| **Deployment Platform** | Kubernetes (GKE) / Docker Compose                        |
| **Scaling**          | Horizontal — stateless; scale replicas freely                |
| **Dependencies**     | `productcatalogservice` (gRPC)                               |
| **Source Path**      | `src/recommendationservice/`                                 |

## Startup Procedure

1. Kubernetes scheduler places the pod on an available node.
2. Container image is pulled (image defined in `kubernetes-manifests/recommendationservice.yaml` or `release/`).
3. Python interpreter starts and loads `recommendation_server.py`.
4. OpenTelemetry SDK initializes and connects to the configured trace exporter/collector.
5. gRPC server binds to port specified by `PORT` environment variable (default `8080`).
6. gRPC health service is registered and begins responding to health check probes.
7. Service establishes a gRPC channel to `productcatalogservice` using the `PRODUCT_CATALOG_SERVICE_ADDR` environment variable.
8. Kubernetes readiness probe succeeds; pod is added to the Service endpoint list and begins receiving traffic.

## Graceful Shutdown

When a `SIGTERM` is received (e.g., during pod termination or rolling update):

1. Kubernetes sends `SIGTERM` to the container's PID 1.
2. The gRPC server initiates a graceful stop — it stops accepting new RPCs and waits for in-flight RPCs to complete.
3. The Python process exits after the grace period or when all in-flight requests are drained.
4. If the process does not exit within the `terminationGracePeriodSeconds` (default 30s), Kubernetes sends `SIGKILL`.

Because the service is stateless, forced termination (`SIGKILL`) does not cause data loss.

## Common Failure Modes

### 1. Unable to Reach productcatalogservice

**Symptom**: gRPC errors returned to callers with status `UNAVAILABLE` or `DEADLINE_EXCEEDED`. Logs show connection refused or DNS resolution failures for `productcatalogservice`.

**Likely Cause**: `productcatalogservice` is down, misconfigured, or the `PRODUCT_CATALOG_SERVICE_ADDR` environment variable is incorrect.

**Immediate Action**:
```bash
kubectl get pods -l app=productcatalogservice
kubectl logs -l app=productcatalogservice --tail=50
```

**Investigation Steps**:
1. Verify `productcatalogservice` pods are `Running` and `Ready`.
2. Check the Kubernetes Service object exists: `kubectl get svc productcatalogservice`.
3. Confirm `PRODUCT_CATALOG_SERVICE_ADDR` env var in the recommendationservice deployment matches the service DNS name and port.
4. Test connectivity from within the recommendationservice pod:
   ```bash
   kubectl exec -it deploy/recommendationservice -- python -c "import grpc; ch = grpc.insecure_channel('productcatalogservice:3550'); print(ch)"
   ```
5. Check NetworkPolicy or service mesh policies that may block traffic.

---

### 2. Pod CrashLoopBackOff

**Symptom**: Pod repeatedly restarts. `kubectl get pods` shows `CrashLoopBackOff` status.

**Likely Cause**: Missing Python dependencies, import errors, misconfigured environment variables, or OOM kills.

**Immediate Action**:
```bash
kubectl logs -l app=recommendationservice --previous --tail=100
kubectl describe pod -l app=recommendationservice
```

**Investigation Steps**:
1. Check previous container logs for Python tracebacks (ImportError, ModuleNotFoundError).
2. Check `describe pod` output for OOMKilled termination reason — if present, increase memory limits.
3. Verify all required environment variables are set:
   ```bash
   kubectl set env deploy/recommendationservice --list
   ```
4. If a bad image was deployed, proceed to [Rollback Procedure](#rollback-procedure).

---

### 3. High Latency / Timeout on Recommendations

**Symptom**: Frontend experiences slow load times. Traces show `recommendationservice` spans with high duration.

**Likely Cause**: `productcatalogservice` responding slowly, resource starvation (CPU throttling), or Python GIL contention under high concurrency.

**Immediate Action**:
```bash
kubectl top pod -l app=recommendationservice
kubectl top pod -l app=productcatalogservice
```

**Investigation Steps**:
1. Check CPU and memory usage — if CPU is near limits, the pod is being throttled.
2. Review `productcatalogservice` latency independently.
3. Scale horizontally if load is the issue:
   ```bash
   kubectl scale deploy/recommendationservice --replicas=3
   ```
4. Review OpenTelemetry traces for the slow span to identify the bottleneck.

---

### 4. OpenTelemetry Collector Connection Failure

**Symptom**: Logs show warnings about failed trace exports. No traces appear in the observability backend. Service otherwise functions normally.

**Likely Cause**: OpenTelemetry Collector is down or `OTEL_EXPORTER_OTLP_ENDPOINT` / `COLLECTOR_SERVICE_ADDR` is misconfigured.

**Immediate Action**:
```bash
kubectl get pods -l app=opentelemetrycollector
kubectl logs -l app=opentelemetrycollector --tail=50
```

**Investigation Steps**:
1. Verify the collector pod is running.
2. Confirm the endpoint environment variable is correct in the recommendationservice deployment.
3. This is non-critical for service functionality — recommendations will still be served. Prioritize accordingly.

## Rollback Procedure

1. Identify the last known good revision:
   ```bash
   kubectl rollout history deploy/recommendationservice
   ```
2. Roll back to the previous revision:
   ```bash
   kubectl rollout undo deploy/recommendationservice
   ```
   Or to a specific revision:
   ```bash
   kubectl rollout undo deploy/recommendationservice --to-revision=<N>
   ```
3. Monitor the rollout:
   ```bash
   kubectl rollout status deploy/recommendationservice --timeout=120s
   ```
4. Verify pods are healthy:
   ```bash
   kubectl get pods -l app=recommendationservice
   ```
5. Confirm the service is responding:
   ```bash
   kubectl exec -it deploy/frontend -- grpcurl -plaintext recommendationservice:8080 grpc.health.v1.Health/Check
   ```
6. Notify the team and document the rollback reason in the incident channel.

## Useful Commands

**Check pod status and recent events:**
```bash
kubectl get pods -l app=recommendationservice -o wide
kubectl describe deploy/recommendationservice
```

**Tail live logs:**
```bash
kubectl logs -f -l app=recommendationservice
```

**View previous container logs (after crash):**
```bash
kubectl logs -l app=recommendationservice --previous --tail=200
```

**Check environment variables:**
```bash
kubectl set env deploy/recommendationservice --list
```

**Resource usage:**
```bash
kubectl top pod -l app=recommendationservice
```

**Scale the service:**
```bash
kubectl scale deploy/recommendationservice --replicas=<N>
```

**Force restart (rolling):**
```bash
kubectl rollout restart deploy/recommendationservice
```

**Exec into pod for debugging:**
```bash
kubectl exec -it deploy/recommendationservice -- /bin/sh
```

**Test gRPC health check from within the cluster:**
```bash
kubectl run grpcurl --rm -it --image=fullstorydev/grpcurl --restart=Never -- -plaintext recommendationservice:8080 grpc.health.v1.Health/Check
```

## Environment Notes

| Environment Variable               | Description                                      | Example Value                        |
|------------------------------------|--------------------------------------------------|--------------------------------------|
| `PORT`                             | Port the gRPC server listens on                  | `8080`                               |
| `PRODUCT_CATALOG_SERVICE_ADDR`     | Address of productcatalogservice                 | `productcatalogservice:3550`         |
| `OTEL_EXPORTER_OTLP_ENDPOINT`     | OpenTelemetry collector endpoint                 | `http://opentelemetrycollector:4317` |
| `OTEL_SERVICE_NAME`               | Service name reported in traces                  | `recommendationservice`              |
| `DISABLE_PROFILER`                | Disable Cloud Profiler (`1` to disable)          | `1`                                  |
| `DISABLE_DEBUGGER`                | Disable Cloud Debugger (`1` to disable)          | `1`                                  |

- **Stateless**: No persistent volumes or local state. Safe to restart, reschedule, or scale at any time.
- **Python runtime**: Be aware of GIL limitations under high concurrency. Horizontal scaling is preferred over vertical.
- **Image**: Built from `src/recommendationservice/Dockerfile`. Ensure `requirements.txt` dependencies are pinned.

## Escalation

| Situation                                          | Who to Contact                        |
|----------------------------------------------------|---------------------------------------|
| Service repeatedly crashing after rollback         | Application team / service owner      |
| `productcatalogservice` dependency is down         | productcatalogservice on-call owner   |
| Kubernetes node-level issues (scheduling, OOM)     | Platform / infrastructure team        |
| Networking / service mesh policy blocking traffic  | Network / platform engineering team   |
| Traces missing in observability backend            | Observability / SRE team              |

## See Also

- [microservices-demo repository](https://github.com/GoogleCloudPlatform/microservices-demo)
- [Kubernetes Deployments — Rolling Updates & Rollbacks](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [gRPC Health Checking Protocol](https://github.com/grpc/grpc/blob/master/doc/health-checking.md)
- [OpenTelemetry Python SDK Documentation](https://opentelemetry.io/docs/languages/python/)
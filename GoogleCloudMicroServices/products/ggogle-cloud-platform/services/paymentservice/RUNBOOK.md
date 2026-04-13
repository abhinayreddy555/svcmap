<!-- generated: 2026-04-13T05:19:23.390Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Runbook — paymentservice

## TL;DR for Agents

- **paymentservice** is a gRPC API service in the [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) Online Boutique application that processes credit card payments (charges).
- **Health check**: gRPC health check on the service's listening port (default `:50051`); no separate HTTP health endpoint.
- **Most common failure**: Upstream dependency issues are unlikely (no external deps); most failures stem from invalid credit card input, misconfigured environment variables, or pod resource exhaustion.
- **Restart is safe**: Yes — the service is stateless. Restarting or killing pods will not cause data loss, though in-flight payment RPCs will fail.
- Related services: `checkoutservice` calls `paymentservice` during order placement.

---

## Service Identity

| Attribute | Value |
|---|---|
| **Service Name** | `paymentservice` |
| **Type** | API (gRPC) |
| **Language** | Node.js |
| **Repository** | [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) |
| **Source Path** | `src/paymentservice/` |
| **Health Endpoint** | gRPC Health Checking Protocol on port `50051` |
| **Metrics** | OpenTelemetry traces exported to the configured collector |
| **Deployment Platform** | Kubernetes (GKE) / any K8s cluster |
| **Scaling** | Horizontal — stateless; safe to scale replicas up/down freely |
| **Dependencies** | None (no downstream services or databases) |
| **Called By** | `checkoutservice` |

---

## Startup Procedure

1. Kubernetes scheduler places the pod on a node based on resource requests defined in the deployment manifest.
2. The container image is pulled (image path defined in `kubernetes-manifests/paymentservice.yaml` or the Helm/Kustomize equivalent).
3. The Node.js process starts and reads environment variables:
   - `PORT` — gRPC listen port (default `50051`)
   - `DISABLE_PROFILER` — toggles Cloud Profiler
   - `OTEL_EXPORTER_OTLP_ENDPOINT` — OpenTelemetry collector endpoint
4. The gRPC server binds to `0.0.0.0:${PORT}` and registers the `PaymentService/Charge` RPC method and the gRPC health check service.
5. Kubernetes readiness and liveness probes (gRPC health check) begin polling; the pod enters `Ready` state once the probe succeeds.
6. The pod is added to the Kubernetes `Service` endpoint list and begins receiving traffic from `checkoutservice`.

---

## Graceful Shutdown

- On `SIGTERM` (sent by Kubernetes during pod termination), the Node.js gRPC server initiates a graceful shutdown:
  1. The server stops accepting new connections.
  2. In-flight RPCs are allowed to complete (up to the `terminationGracePeriodSeconds`, default 30s).
  3. The process exits with code `0`.
- If the process does not exit within `terminationGracePeriodSeconds`, Kubernetes sends `SIGKILL`.
- Because the service is stateless, forced termination does not risk data corruption — only in-flight payment RPCs will return an error to `checkoutservice`.

---

## Common Failure Modes

### 1. Pod CrashLoopBackOff

**Symptom**
```
kubectl get pods -l app=paymentservice
# STATUS: CrashLoopBackOff, multiple restarts
```

**Likely Cause**
- Missing or malformed environment variables (e.g., `PORT` set to a non-numeric value).
- Container image pull failure (wrong tag, registry auth issue).
- Node.js runtime error on startup (corrupt `node_modules` or missing dependency).

**Immediate Action**
```bash
kubectl logs -l app=paymentservice --tail=100
kubectl describe pod -l app=paymentservice
```

**Investigation Steps**
1. Check logs for JavaScript stack traces or `Error: listen EADDRINUSE`.
2. Verify the image tag matches the expected release version.
3. Confirm environment variables in the deployment manifest are correct.
4. If image pull error, check `imagePullSecrets` and registry connectivity.

---

### 2. gRPC Health Check Failing (Pod Not Ready)

**Symptom**
- Pod is `Running` but not `Ready` (0/1).
- `checkoutservice` logs show connection errors to `paymentservice`.

**Likely Cause**
- The gRPC server failed to bind to the configured port.
- Port mismatch between the `PORT` environment variable and the container/service port definition.

**Immediate Action**
```bash
kubectl logs -l app=paymentservice --tail=50
kubectl get svc paymentservice -o yaml
```

**Investigation Steps**
1. Confirm `PORT` env var matches `containerPort` in the deployment and `targetPort` in the Service.
2. Exec into the pod and test locally:
   ```bash
   kubectl exec -it deploy/paymentservice -- sh
   # Inside pod:
   nc -zv localhost 50051
   ```
3. Check if resource limits are causing OOMKill (`kubectl describe pod ...` → look for `OOMKilled` in last state).

---

### 3. Payment Charge RPC Returns Error

**Symptom**
- `checkoutservice` logs: `rpc error: code = InvalidArgument` or `code = Internal` from `paymentservice`.
- Users see checkout failures in the frontend.

**Likely Cause**
- Invalid credit card data passed by `checkoutservice` (test card validation logic).
- Unhandled exception in the `Charge` handler.

**Immediate Action**
```bash
kubectl logs -l app=paymentservice --tail=200 | grep -i "error\|exception\|charge"
```

**Investigation Steps**
1. Review the specific gRPC status code returned.
2. Check if the issue is reproducible with a known-good test card number (the demo app uses `4432-8015-6152-0454`).
3. Inspect OpenTelemetry traces for the failing request to identify latency or error spans.
4. If the error is `Internal`, check for Node.js unhandled promise rejections in the logs.

---

### 4. High Latency on Payment RPCs

**Symptom**
- End-to-end checkout latency increases.
- Traces show `paymentservice` spans taking >500ms (normally <50ms).

**Likely Cause**
- CPU throttling due to low resource limits.
- Node.js event loop blocked (unlikely in normal operation but possible with corrupted dependencies).
- Network policy or service mesh sidecar (e.g., Istio) adding overhead.

**Immediate Action**
```bash
kubectl top pod -l app=paymentservice
kubectl describe pod -l app=paymentservice | grep -A5 "Limits\|Requests"
```

**Investigation Steps**
1. Compare CPU usage against limits — if usage is at the limit, increase `resources.limits.cpu`.
2. Check if Horizontal Pod Autoscaler (HPA) is configured and if replica count is sufficient.
3. Review network policies that may be causing connection retries.

---

## Rollback Procedure

1. Identify the last known-good image tag or deployment revision:
   ```bash
   kubectl rollout history deploy/paymentservice
   ```
2. Roll back to the previous revision:
   ```bash
   kubectl rollout undo deploy/paymentservice
   ```
   Or roll back to a specific revision:
   ```bash
   kubectl rollout undo deploy/paymentservice --to-revision=<N>
   ```
3. Monitor the rollout:
   ```bash
   kubectl rollout status deploy/paymentservice --timeout=120s
   ```
4. Verify pods are healthy:
   ```bash
   kubectl get pods -l app=paymentservice
   ```
5. Confirm `checkoutservice` can successfully call `paymentservice`:
   ```bash
   kubectl logs -l app=checkoutservice --tail=50 | grep -i payment
   ```
6. If using a CI/CD pipeline (e.g., Cloud Build), ensure the pipeline is paused or the rollback commit is pushed to prevent automatic re-deployment of the broken version.

---

## Useful Commands

**Check pod status and events**
```bash
kubectl get pods -l app=paymentservice -o wide
kubectl describe deploy/paymentservice
kubectl get events --field-selector involvedObject.name=paymentservice --sort-by='.lastTimestamp'
```

**Tail logs in real time**
```bash
kubectl logs -f -l app=paymentservice --all-containers=true
```

**Test gRPC health check manually (requires grpcurl)**
```bash
# Port-forward first
kubectl port-forward svc/paymentservice 50051:50051 &

# Check health
grpcurl -plaintext localhost:50051 grpc.health.v1.Health/Check
```

**Test the Charge RPC manually**
```bash
grpcurl -plaintext -d '{
  "amount": {"currency_code": "USD", "units": 10, "nanos": 0},
  "credit_card": {
    "credit_card_number": "4432-8015-6152-0454",
    "credit_card_cvv": 672,
    "credit_card_expiration_year": 2039,
    "credit_card_expiration_month": 1
  }
}' localhost:50051 hipstershop.PaymentService/Charge
```

**Check resource consumption**
```bash
kubectl top pod -l app=paymentservice
```

**Force restart all pods (rolling)**
```bash
kubectl rollout restart deploy/paymentservice
```

**Exec into a running pod**
```bash
kubectl exec -it deploy/paymentservice -- sh
```

---

## Environment Notes

| Environment | Notes |
|---|---|
| **Development** | Typically run via `skaffold dev` which builds and deploys all services to a local or remote K8s cluster. `paymentservice` uses the demo's test credit card numbers — no real payment processing occurs. |
| **Staging / Production** | Deployed via CI/CD (Cloud Build triggers or GitHub Actions). Ensure `OTEL_EXPORTER_OTLP_ENDPOINT` points to the correct OpenTelemetry Collector for the environment. |
| **Local (Docker Compose)** | Can be run via `docker-compose.yaml` in the repo root. Service is exposed on port `50051` within the Docker network. |
| **Resource Defaults** | Check `kubernetes-manifests/paymentservice.yaml` for current CPU/memory requests and limits. Typical: `100m`/`64Mi` request, `200m`/`128Mi` limit. |
| **Service Mesh** | If Istio/Anthos Service Mesh is enabled, ensure mTLS policies allow `checkoutservice` → `paymentservice` traffic. |

---

## Escalation

| Situation | Who to Contact |
|---|---|
| Pod won't start after rollback and restart | Platform / Kubernetes infrastructure team |
| Persistent gRPC errors not explained by application logs | Application development team (paymentservice owner) |
| Network connectivity issues between `checkoutservice` and `paymentservice` | Networking / Service Mesh team |
| Suspected security issue (unexpected traffic, compromised container) | Security / Incident Response team |
| OpenTelemetry traces not appearing in the backend | Observability / SRE team |

---

## See Also

- [GoogleCloudPlatform/microservices-demo — paymentservice source](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/src/paymentservice)
- [GoogleCloudPlatform/microservices-demo — Kubernetes manifests](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/kubernetes-manifests)
- [gRPC Health Checking Protocol](https://github.com/grpc/grpc/blob/master/doc/health-checking.md)
- [Online Boutique Architecture Docs](https://github.com/GoogleCloudPlatform/microservices-demo#architecture)
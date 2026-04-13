<!-- generated: 2026-04-13T05:15:34.225Z | model: claude-opus-4-6 | sha: c9857ee5 -->

# Runbook — checkoutservice

## TL;DR for Agents

- **checkoutservice** is the API orchestrator for the checkout flow in the Google Cloud microservices-demo (Online Boutique); if it's down, no orders can be placed.
- **Health check**: gRPC health endpoint on the service's configured port (default `5050`).
- **Most common failure**: Downstream dependency unavailability (payment, shipping, cart, currency, email, product catalog, or ad services) causing checkout timeouts or errors.
- **Restart is safe**: Yes — checkoutservice is stateless; restarting will not cause data loss, though in-flight requests will fail.
- **Runs on Kubernetes** (GKE typically); check pod status with `kubectl get pods -l app=checkoutservice`.

## Service Identity

| Attribute            | Value                                                        |
|----------------------|--------------------------------------------------------------|
| **Service Name**     | `checkoutservice`                                            |
| **Type**             | API (gRPC)                                                   |
| **Repository**       | `GoogleCloudPlatform/microservices-demo`                     |
| **Language**          | Go                                                           |
| **Health Endpoint**  | gRPC health check on port `5050` (`grpc.health.v1.Health`)   |
| **Metrics**          | OpenTelemetry traces/metrics exported to configured collector |
| **Deployment Platform** | Kubernetes (GKE / any conformant cluster)                 |
| **Scaling**          | Horizontal Pod Autoscaler (HPA) or manual replica scaling    |
| **Namespace**        | `default` (or as configured in deployment manifests)         |
| **Docker Image**     | `gcr.io/google-samples/microservices-demo/checkoutservice`   |

### Dependencies

checkoutservice orchestrates the full checkout flow and calls **all** of the following downstream services:

| Dependency              | Protocol | Purpose                          |
|-------------------------|----------|----------------------------------|
| `cartservice`           | gRPC     | Retrieve and empty user cart     |
| `productcatalogservice` | gRPC     | Get product details for cart items |
| `currencyservice`       | gRPC     | Convert prices to user currency  |
| `shippingservice`       | gRPC     | Get shipping cost & ship order   |
| `paymentservice`        | gRPC     | Charge credit card               |
| `emailservice`          | gRPC     | Send order confirmation email    |

## Startup Procedure

1. **Container image pull**: Kubernetes pulls the `checkoutservice` image from the container registry.
2. **Environment variable injection**: The pod reads environment variables for downstream service addresses (e.g., `PRODUCT_CATALOG_SERVICE_ADDR`, `CART_SERVICE_ADDR`, `CURRENCY_SERVICE_ADDR`, `SHIPPING_SERVICE_ADDR`, `PAYMENT_SERVICE_ADDR`, `EMAIL_SERVICE_ADDR`).
3. **gRPC server initialization**: The service starts a gRPC server on port `5050`.
4. **OpenTelemetry initialization**: Tracing/metrics exporters are configured based on `COLLECTOR_SERVICE_ADDR` or `DISABLE_PROFILER`/`DISABLE_TRACING` env vars.
5. **Health check registration**: The gRPC health service is registered and begins responding `SERVING`.
6. **Readiness probe passes**: Kubernetes marks the pod as `Ready` once the gRPC health check succeeds.
7. **Traffic routed**: The Kubernetes Service begins routing traffic to the pod.

## Graceful Shutdown

When a `SIGTERM` signal is received (e.g., during pod termination or rolling update):

- The Go runtime's signal handler catches `SIGTERM`.
- The gRPC server initiates a **graceful stop** (`grpcServer.GracefulStop()`), which stops accepting new connections and waits for in-flight RPCs to complete.
- Kubernetes allows up to `terminationGracePeriodSeconds` (default 30s) before sending `SIGKILL`.
- Since the service is **stateless**, no additional cleanup (e.g., draining queues or flushing state) is required beyond completing in-flight requests.

## Common Failure Modes

### Downstream Service Unavailable

**Symptom**: Checkout requests return gRPC error codes `UNAVAILABLE` (14) or `DEADLINE_EXCEEDED` (4). Users see "failed to complete checkout" errors in the frontend.

**Likely Cause**: One or more downstream dependencies (`cartservice`, `paymentservice`, `shippingservice`, `currencyservice`, `productcatalogservice`, `emailservice`) are down or unreachable.

**Immediate Action**:
1. Identify which downstream service is failing by checking checkoutservice logs for the specific RPC that errored.
2. Verify the health of the failing downstream service:
   ```bash
   kubectl get pods -l app=<downstream-service>
   kubectl logs -l app=<downstream-service> --tail=50
   ```
3. Restart the failing downstream service if appropriate.

**Investigation Steps**:
1. Check distributed traces in your tracing backend (Jaeger/Cloud Trace) for the failing checkout span.
2. Verify DNS resolution for the downstream service address:
   ```bash
   kubectl exec -it deploy/checkoutservice -- nslookup <service-name>
   ```
3. Check network policies that may be blocking inter-service communication.
4. Verify the environment variable for the downstream service address is correctly set:
   ```bash
   kubectl describe deploy checkoutservice | grep -A 20 "Environment"
   ```

---

### Pod CrashLoopBackOff

**Symptom**: `kubectl get pods -l app=checkoutservice` shows `CrashLoopBackOff` status. No checkout traffic is being served.

**Likely Cause**: Missing or malformed environment variables for downstream service addresses, or a bad image version.

**Immediate Action**:
1. Check pod logs for the crash reason:
   ```bash
   kubectl logs -l app=checkoutservice --previous --tail=100
   ```
2. If caused by a bad deployment, roll back immediately (see [Rollback Procedure](#rollback-procedure)).

**Investigation Steps**:
1. Verify all required environment variables are present in the deployment manifest.
2. Check if the container image exists and is pullable:
   ```bash
   kubectl describe pod -l app=checkoutservice | grep -A 5 "Events"
   ```
3. Check for OOMKilled events indicating insufficient memory limits.

---

### High Latency / Timeout on Checkout

**Symptom**: Checkout requests succeed but take >5 seconds, or intermittently time out. Frontend shows slow checkout experience.

**Likely Cause**: One downstream service is responding slowly (often `paymentservice` or `shippingservice`), or the pod is resource-constrained (CPU throttling).

**Immediate Action**:
1. Check pod resource usage:
   ```bash
   kubectl top pods -l app=checkoutservice
   ```
2. Scale up if CPU/memory is saturated:
   ```bash
   kubectl scale deploy checkoutservice --replicas=3
   ```

**Investigation Steps**:
1. Examine traces to identify the slow downstream call.
2. Check CPU throttling:
   ```bash
   kubectl describe pod -l app=checkoutservice | grep -A 5 "Limits"
   ```
3. Review HPA status if autoscaling is configured:
   ```bash
   kubectl get hpa checkoutservice
   ```

---

### ImagePullBackOff

**Symptom**: Pod stuck in `ImagePullBackOff` or `ErrImagePull` state.

**Likely Cause**: Container image tag does not exist, registry is unreachable, or image pull secrets are missing/expired.

**Immediate Action**:
1. Check the exact error:
   ```bash
   kubectl describe pod -l app=checkoutservice | grep -A 10 "Events"
   ```
2. If the image tag is wrong, roll back to the last known good image.

**Investigation Steps**:
1. Verify the image exists in the registry.
2. Check image pull secrets: `kubectl get secrets` and verify they are referenced in the deployment or service account.
3. Test registry connectivity from a debug pod.

## Rollback Procedure

1. **Identify the last known good revision**:
   ```bash
   kubectl rollout history deploy/checkoutservice
   ```
2. **Roll back to the previous revision**:
   ```bash
   kubectl rollout undo deploy/checkoutservice
   ```
   Or to a specific revision:
   ```bash
   kubectl rollout undo deploy/checkoutservice --to-revision=<N>
   ```
3. **Monitor the rollout**:
   ```bash
   kubectl rollout status deploy/checkoutservice --timeout=120s
   ```
4. **Verify health**:
   ```bash
   kubectl get pods -l app=checkoutservice
   ```
5. **Validate checkout flow**: Trigger a test checkout through the frontend or via `grpcurl` to confirm end-to-end functionality.
6. **Communicate**: Update the incident channel that rollback is complete and service is restored.

## Useful Commands

**Check pod status and readiness**:
```bash
kubectl get pods -l app=checkoutservice -o wide
```

**Stream live logs**:
```bash
kubectl logs -l app=checkoutservice -f --tail=100
```

**View logs from a crashed pod**:
```bash
kubectl logs -l app=checkoutservice --previous --tail=200
```

**Inspect environment variables and configuration**:
```bash
kubectl describe deploy checkoutservice
```

**Check resource consumption**:
```bash
kubectl top pods -l app=checkoutservice
```

**Test gRPC health check from within the cluster**:
```bash
kubectl exec -it deploy/checkoutservice -- grpc_health_probe -addr=:5050
```

**Or using grpcurl from a debug pod**:
```bash
grpcurl -plaintext checkoutservice:5050 grpc.health.v1.Health/Check
```

**Force restart all pods (rolling)**:
```bash
kubectl rollout restart deploy/checkoutservice
```

**Scale the deployment**:
```bash
kubectl scale deploy/checkoutservice --replicas=<N>
```

**Check Kubernetes events for the namespace**:
```bash
kubectl get events --sort-by='.lastTimestamp' | grep checkoutservice
```

## Environment Notes

| Environment Variable              | Description                                  | Example Value                        |
|-----------------------------------|----------------------------------------------|--------------------------------------|
| `PORT`                            | gRPC server listen port                      | `5050`                               |
| `PRODUCT_CATALOG_SERVICE_ADDR`    | Address of productcatalogservice             | `productcatalogservice:3550`         |
| `CART_SERVICE_ADDR`               | Address of cartservice                       | `cartservice:7070`                   |
| `CURRENCY_SERVICE_ADDR`           | Address of currencyservice                   | `currencyservice:7000`               |
| `SHIPPING_SERVICE_ADDR`           | Address of shippingservice                   | `shippingservice:50051`              |
| `PAYMENT_SERVICE_ADDR`            | Address of paymentservice                    | `paymentservice:50051`               |
| `EMAIL_SERVICE_ADDR`              | Address of emailservice                      | `emailservice:8080`                  |
| `COLLECTOR_SERVICE_ADDR`          | OpenTelemetry Collector address              | `opentelemetrycollector:4317`        |
| `DISABLE_TRACING`                 | Set to `1` to disable tracing                | `0`                                  |
| `DISABLE_PROFILER`                | Set to `1` to disable profiler               | `0`                                  |

- **Stateless**: No persistent volumes or local state. Safe to reschedule to any node.
- **No external secrets**: In the demo configuration, no API keys or external credentials are required. Production forks may differ.
- **Resource defaults**: Check `kubernetes-manifests/checkoutservice.yaml` for current CPU/memory requests and limits.

## Escalation

| Situation                                              | Who to Contact                              |
|--------------------------------------------------------|---------------------------------------------|
| checkoutservice pods won't start after rollback        | Platform / Kubernetes cluster admin          |
| Downstream service owned by another team is failing    | Owning team per service (check service repo) |
| Persistent high error rate with no obvious root cause  | Senior backend engineer / service owner      |
| Cluster-wide networking issues (DNS, CNI)              | Platform / Infrastructure team               |
| Container registry unreachable                         | Cloud infrastructure / DevOps team           |
| Suspected security incident (unexpected traffic)       | Security on-call                             |

## See Also

- [microservices-demo repository](https://github.com/GoogleCloudPlatform/microservices-demo) — Full source and Kubernetes manifests
- [src/checkoutservice](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/src/checkoutservice) — checkoutservice source code
- [kubernetes-manifests](https://github.com/GoogleCloudPlatform/microservices-demo/tree/main/kubernetes-manifests) — Deployment YAML files for all services
- [Online Boutique Architecture](https://github.com/GoogleCloudPlatform/microservices-demo#architecture) — Service dependency diagram and architecture overview
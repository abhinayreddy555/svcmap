<!-- generated: 2026-04-13T04:16:07.176Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Error Catalogue — spring-petclinic-discovery-server

## TL;DR for Agents

- **Zero custom error codes** are defined in this service — it relies entirely on Spring Boot and Eureka Server defaults.
- This is a **Spring Cloud Netflix Eureka Discovery Server** with minimal application logic; it does not implement custom error handling middleware or global exception handlers.
- All error responses follow **standard Spring Boot error handling** (e.g., `404`, `500`) and **Eureka Server built-in mechanisms** (e.g., peer replication failures, registration/heartbeat issues).
- If you are investigating a discovery-server error, check **Eureka Server logs and Spring Boot's `/error` endpoint behavior** rather than looking for application-level error codes.
- **Most transient Eureka errors (peer sync, heartbeat failures) are retryable**; the server is designed to self-heal through eventual consistency.

## Global Error Handling

The `spring-petclinic-discovery-server` does not implement any custom error handling middleware, `@ControllerAdvice`, or global exception handler. The service is a thin wrapper around Spring Cloud Netflix Eureka Server, enabled via the `@EnableEurekaServer` annotation, and contains virtually no custom application logic. All error handling is delegated to two layers: **Spring Boot's default error handling mechanism** (which provides the standard `BasicErrorController` mapped to `/error`, producing JSON error responses with `timestamp`, `status`, `error`, `message`, and `path` fields) and **Eureka Server's built-in error handling** (which manages service registration failures, heartbeat timeouts, peer-to-peer replication errors, and self-preservation mode triggers internally). Because no custom error codes or exception mappings exist in this codebase, any error you encounter will originate from these framework-level defaults.

## Error Reference

Since no custom error codes are defined in this service, the table below documents the **standard Spring Boot and Eureka Server errors** you are most likely to encounter when interacting with or operating this service:

| Code | HTTP Status | Category | Retryable | Description | When It Occurs | Recovery Hint |
|------|-------------|----------|-----------|-------------|----------------|---------------|
| N/A | `404` | Client | No | Standard Spring Boot "Not Found" | A request is made to an undefined endpoint on the discovery server. | Verify the URL path; consult Eureka REST API documentation for valid endpoints (e.g., `/eureka/apps`). |
| N/A | `405` | Client | No | Method Not Allowed | An unsupported HTTP method is used against a valid Eureka endpoint. | Use the correct HTTP method (`GET`, `POST`, `PUT`, `DELETE`) per the Eureka REST API spec. |
| N/A | `500` | Server | Yes | Internal Server Error | Unhandled exception within Spring Boot or Eureka Server internals (e.g., corrupted registry state, resource exhaustion). | Check discovery server logs (`stdout` / container logs) for stack traces; restart the service if the error persists. |
| N/A | `503` | Server | Yes | Service Unavailable | The Eureka server is starting up, shutting down, or overwhelmed. | Wait and retry with exponential backoff; verify the server process is healthy via `/actuator/health`. |
| `SELF_PRESERVATION` | N/A (log-level) | Operational | Yes | Eureka self-preservation mode activated | The server detects that too many clients have stopped sending heartbeats (network partition or mass client failure). | Typically self-resolving. If in a dev/test environment, consider setting `eureka.server.enableSelfPreservation=false`. In production, investigate network connectivity between clients and the discovery server. |
| `PEER_REPLICATION_FAILURE` | N/A (log-level) | Operational | Yes | Eureka peer replication failed | In a multi-node Eureka cluster, a peer node is unreachable or replication times out. | Verify network connectivity between Eureka peers; check that `eureka.client.serviceUrl.defaultZone` is correctly configured on all nodes. Eureka will retry automatically. |
| `HEARTBEAT_TIMEOUT` | N/A (log-level) | Operational | Yes | Client heartbeat not received within the configured lease expiration threshold | A registered service instance fails to renew its lease within `eureka.instance.leaseExpirationDurationInSeconds` (default: 90s). | The instance will be evicted from the registry. Investigate the health of the client service. If the client is healthy, check for network issues or misconfigured heartbeat intervals. |

> **Note:** The codes `SELF_PRESERVATION`, `PEER_REPLICATION_FAILURE`, and `HEARTBEAT_TIMEOUT` are not HTTP error codes — they are operational events surfaced in server logs. They are included here because they are the most common issues operators and agents encounter when triaging discovery-server incidents.

## See Also

- [Spring Cloud Netflix Eureka Server Documentation](https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/#spring-cloud-eureka-server)
- [Eureka REST API Operations](https://github.com/Netflix/eureka/wiki/Eureka-REST-operations)
- [spring-petclinic-microservices Repository](https://github.com/spring-petclinic/spring-petclinic-microservices)
- [SCENARIOS.md](SCENARIOS.md)
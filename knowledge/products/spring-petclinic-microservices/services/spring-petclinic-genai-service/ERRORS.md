<!-- generated: 2026-04-13T04:22:38.208Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Error Catalogue — spring-petclinic-genai-service

## TL;DR for Agents

- **10 total error codes** defined for the GenAI service; **7 are retryable**, 3 are not.
- Most likely errors in incidents: `ERR_VETS_SERVICE_UNAVAILABLE`, `ERR_CUSTOMERS_SERVICE_UNAVAILABLE`, and `ERR_SERVICE_DISCOVERY_FAILED` — all upstream dependency failures returning **503**.
- Validation errors (`ERR_INVALID_OWNER_REQUEST`, `ERR_INVALID_PET_REQUEST`) return **400** and are **not retryable**; fix the input payload.
- `ERR_CHAT_PROCESSING_FAILED` (500) is the catch-all for LLM/chat failures — check LLM service availability and API credentials.
- **No global error handling middleware exists**; most exceptions propagate via Spring Boot defaults, so expect raw stack traces in 500 responses.

## Global Error Handling

The `spring-petclinic-genai-service` does **not** implement a global error handling middleware (e.g., `@ControllerAdvice` or a servlet filter). The only explicit try-catch is in `PetclinicChatClient.exchange()`, which catches all exceptions during LLM chat processing and returns the generic user-facing message `"Chat is currently unavailable. Please try again later."`. All other components — including `RestClient` calls to `customers-service`, `WebClient` calls to `vets-service`, and Jackson serialization in `VectorStoreController` — propagate exceptions up the call stack without explicit handling. Spring Boot's default error mechanism catches these and returns HTTP 500 responses containing exception details and stack traces. This means that upstream service failures (e.g., `vets-service` or `customers-service` being unreachable) will surface as unstructured 500 errors unless the caller inspects the response body or logs for the underlying cause.

## Error Reference

| Code | HTTP Status | Category | Retryable | Description | When It Occurs | Recovery Hint |
|------|-------------|----------|-----------|-------------|----------------|---------------|
| `ERR_JSON_PROCESSING` | 500 | other | ✅ Yes | Jackson JSON serialization/deserialization failed | `VectorStoreController.convertListToJsonResource()` when `ObjectMapper.writeValueAsString()` throws `JacksonException` | Check that Vet objects are properly serializable; retry the operation |
| `ERR_VECTOR_STORE_LOAD_FAILED` | 500 | other | ✅ Yes | Failed to load vector store from file or populate from vets-service | `VectorStoreController.loadVetDataToVectorStoreOnStartup()` when file I/O fails or vets-service is unreachable | Ensure `vectorstore.json` exists or vets-service is available; restart the application |
| `ERR_VETS_SERVICE_UNAVAILABLE` | 503 | upstream | ✅ Yes | vets-service endpoint did not respond or returned error | `VectorStoreController` calls `webClient.get().uri('http://vets-service/vets')` and service is down or unreachable | Verify vets-service is running and accessible; retry after service recovery |
| `ERR_CUSTOMERS_SERVICE_UNAVAILABLE` | 503 | upstream | ✅ Yes | customers-service endpoint did not respond or returned error | `AIDataProvider` calls customers-service via `RestClient` (`getAllOwners`, `addPetToOwner`, `addOwnerToPetclinic`) and service is down | Verify customers-service is running; retry the operation |
| `ERR_SERVICE_DISCOVERY_FAILED` | 503 | upstream | ✅ Yes | DiscoveryClient could not find customers-service instances | `AIDataProvider.getCustomerServiceUri()` when `discoveryClient.getInstances('customers-service')` returns empty list | Ensure customers-service is registered with service discovery; verify service registry is operational |
| `ERR_CHAT_PROCESSING_FAILED` | 500 | other | ✅ Yes | LLM chat request processing failed with unhandled exception | `PetclinicChatClient.exchange()` when `chatClient.prompt().user().call().content()` throws any `Exception` | Retry the chat message; check LLM service availability and API credentials |
| `ERR_INVALID_OWNER_REQUEST` | 400 | validation | ❌ No | OwnerRequest validation failed | `PetclinicTools.addOwnerToPetclinic()` when `OwnerRequest` fields fail `@NotBlank` or `@Digits` constraints | Provide valid `firstName`, `lastName`, `address`, `city`, and 10–12 digit `telephone` number |
| `ERR_INVALID_PET_REQUEST` | 400 | validation | ❌ No | PetRequest validation or pet type ID invalid | `PetclinicTools.addPetToOwner()` when `petTypeId` is not in range 1–6 or `PetRequest` fields are invalid | Use valid `petTypeId` (1=cat, 2=dog, 3=lizard, 4=snake, 5=bird, 6=hamster) and valid pet details |
| `ERR_OWNER_NOT_FOUND` | 404 | other | ❌ No | Owner with specified ownerId does not exist | `PetclinicTools.addPetToOwner()` when customers-service returns 404 for the given `ownerId` | Verify the `ownerId` exists; use `listOwners()` to find valid owner IDs |
| `ERR_VET_JSON_SERIALIZATION` | 500 | other | ✅ Yes | Failed to serialize Vet object to JSON for vector store search | `PetclinicTools.listVets()` when `AIDataProvider.getVets()` throws `JacksonException` during `objectMapper.writeValueAsString(vetRequest)` | Ensure Vet object is properly constructed; retry the request |

### Error Distribution by Category

| Category | Count | Retryable | Not Retryable |
|----------|-------|-----------|---------------|
| upstream | 3 | 3 | 0 |
| validation | 2 | 0 | 2 |
| other | 5 | 4 | 1 |

### Pet Type ID Quick Reference

Used by `ERR_INVALID_PET_REQUEST` validation:

| `petTypeId` | Animal |
|-------------|--------|
| 1 | cat |
| 2 | dog |
| 3 | lizard |
| 4 | snake |
| 5 | bird |
| 6 | hamster |

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Common failure scenarios and troubleshooting runbooks for this service
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Source code and service architecture
- [Spring Boot Error Handling Reference](https://docs.spring.io/spring-boot/docs/current/reference/html/web.html#web.servlet.spring-mvc.error-handling) — Default error handling behavior relied upon by this service
- [Spring Cloud DiscoveryClient Docs](https://docs.spring.io/spring-cloud-commons/docs/current/reference/html/#discovery-client) — Relevant to `ERR_SERVICE_DISCOVERY_FAILED` troubleshooting
<!-- generated: 2026-04-13T04:21:09.603Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# Dependencies — spring-petclinic-genai-service

## TL;DR for Agents

- **spring-petclinic-genai-service** makes **4 outbound REST calls** to 2 internal services (`vets-service`, `customers-service`) and has **0 databases**.
- Depends on **OpenAI** or **Azure OpenAI** as an LLM provider for chat completion and embeddings (RAG over vet data).
- Fetches vet data from `vets-service` to populate a vector store; reads and writes owner/pet data via `customers-service`.
- No configured timeouts or retries on any outbound call — failures will propagate with default behavior.
- If `vets-service` is down, the RAG/vector store initialization for veterinarian lookup will fail; if `customers-service` is down, owner and pet management via the AI chat is unavailable.

## Outbound Calls

| Target | Type | Endpoint / Topic | Purpose | Timeout (ms) | Retries | External? |
|---|---|---|---|---|---|---|
| `vets-service` | REST | `GET /vets` | Fetch all veterinarian entities to load into vector store for RAG functionality | _not configured_ | _not configured_ | No |
| `customers-service` | REST | `GET /owners` | Retrieve list of all pet owners | _not configured_ | _not configured_ | No |
| `customers-service` | REST | `POST /owners/{ownerId}/pets` | Add a new pet to an owner | _not configured_ | _not configured_ | No |
| `customers-service` | REST | `POST /owners` | Add a new owner to the pet clinic | _not configured_ | _not configured_ | No |

> **⚠️ Resilience note:** None of the outbound calls declare explicit timeouts or retry policies. Under sustained downstream latency, this service may accumulate blocked threads or connections. Consider adding timeout and retry configuration, especially for the `GET /vets` call that gates RAG initialization.

## Databases & Storage

| Name | Type | Purpose | Shared / Private |
|---|---|---|---|
| _None_ | — | — | — |

This service does not own or connect to any database. It relies entirely on upstream services for persistent data and uses an in-memory vector store populated at runtime from `vets-service`.

## Third-Party Integrations

| Name | Category | SDK / Package | Purpose |
|---|---|---|---|
| OpenAI | LLM | `spring-ai-starter-model-openai` | Chat completion and embedding model for generative AI functionality |
| Azure OpenAI | LLM | `spring-ai-starter-model-azure-openai` | Alternative chat completion and embedding model for generative AI functionality |

OpenAI and Azure OpenAI are **mutually exclusive** runtime choices — the active provider is selected via Spring profile or configuration. Both supply the chat model (for conversational responses) and the embedding model (for vectorizing vet records used in RAG retrieval).

## Inbound Calls

| Source | Type | Endpoint / Topic | Purpose |
|---|---|---|---|
| `api-gateway` (probable) | REST | _unknown_ | Route end-user AI chat requests to this service |

> **Note:** Inbound call data is populated from the product-level service graph and may be incomplete. The API gateway in `spring-petclinic-microservices` typically fronts all backend services, so it is the most likely caller. Consult the product-level topology for the authoritative routing table.

## See Also

- [SCENARIOS.md](SCENARIOS.md) — Failure scenarios and impact analysis for this service
- [spring-petclinic-microservices repository](https://github.com/spring-petclinic/spring-petclinic-microservices) — Source repository and architecture overview
- [Spring AI documentation](https://docs.spring.io/spring-ai/reference/) — Reference for `spring-ai-starter-model-openai` and Azure OpenAI integration
- [TOPOLOGY.md](TOPOLOGY.md) — Product-level service topology and dependency graph
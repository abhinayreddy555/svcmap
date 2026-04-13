<!-- generated: 2026-04-13T04:18:42.753Z | model: claude-opus-4-6 | sha: 597ad1fb -->

# spring-petclinic-genai-service

> REST API service providing generative AI chat capabilities for the Spring PetClinic microservices ecosystem, powered by OpenAI/Azure OpenAI LLMs with function calling and RAG.

## TL;DR for Agents

- **What it does:** Exposes a `POST /chatclient` endpoint that accepts natural-language queries and uses LLM function calling to query/manipulate pet clinic data (owners, pets, vets, visits) via other microservices.
- **Key dependencies:** Calls `customers-service` (owners, pets) and `vets-service` (veterinarians) over REST; requires an external OpenAI or Azure OpenAI LLM provider; uses Eureka for service discovery.
- **No database ownership:** This service has no database — it is stateless aside from in-memory chat memory and a vector store used for RAG over vet data.
- **Entry point for bugs:** Start at `PetclinicChatClient.java` (REST controller) and `PetclinicTools.java` (function definitions the LLM can invoke).
- **Not an LLM host:** It delegates all inference to an external OpenAI/Azure OpenAI API; it does not train, fine-tune, or serve models.

## Service Identity

| Attribute          | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| **Type**           | API (microservice)                                                    |
| **Language**       | Java                                                                  |
| **Framework**      | Spring Boot 3.x, Spring AI                                           |
| **Runtime**        | Java (Spring Boot 3.x)                                               |
| **Repo**           | `spring-petclinic/spring-petclinic-microservices`                     |
| **Primary Database** | None (stateless; in-memory vector store and chat memory only)       |
| **Deployed on**    | Registered with Eureka discovery server alongside sibling services    |

## Responsibilities

### What this service owns

- Accepting natural-language chat requests and returning AI-generated responses via `POST /chatclient`.
- Orchestrating LLM function calling to translate user intent into REST calls against `customers-service` and `vets-service`.
- Loading veterinarian data into a vector store for Retrieval-Augmented Generation (RAG) queries.
- Maintaining per-session chat memory for multi-turn conversations.
- Defining the set of tools/functions the LLM is allowed to invoke (`PetclinicTools`).

### This service does NOT handle:

- **LLM model hosting** — delegates all inference to OpenAI / Azure OpenAI.
- **Customer/owner data persistence** — delegates to `customers-service`.
- **Veterinarian data persistence** — delegates to `vets-service`.
- **Pet and visit management** — delegates to `customers-service`.

## Entry Points

| File | Description |
|------|-------------|
| `src/main/java/org/springframework/samples/petclinic/genai/GenAIServiceApplication.java` | Spring Boot application entry point; enables Eureka discovery client. |
| `src/main/java/org/springframework/samples/petclinic/genai/PetclinicChatClient.java` | REST controller exposing `POST /chatclient` for chat interactions with the LLM. |

## Key Abstractions

| Abstraction | Description |
|-------------|-------------|
| **ChatClient** | Spring AI abstraction that wraps the configured LLM provider, sends prompts, and receives completions. |
| **ChatMemory** | Stores conversation history per session so the LLM can maintain multi-turn context. |
| **VectorStore** | In-memory vector store populated with vet data embeddings, used for RAG-style retrieval when answering vet-related questions. |
| **EmbeddingModel** | Generates vector embeddings from text (vet records) for insertion into the `VectorStore`. |
| **PetclinicTools** | Defines the callable functions (tools) the LLM can invoke — e.g., list owners, add pet, add owner. These map to outbound REST calls. |
| **AIDataProvider** | Fetches data from sibling microservices (`customers-service`, `vets-service`) and prepares it for the LLM or vector store. |
| **RestClient / DiscoveryClient** | `RestClient` makes HTTP calls to sibling services; `DiscoveryClient` (Eureka) resolves their network locations at runtime. |

## What an Agent Needs to Know to Work on This Service

### Where to start

1. **Controller layer:** `PetclinicChatClient.java` — the single REST endpoint. Trace inbound requests here.
2. **Tool definitions:** `PetclinicTools.java` — every function the LLM can call is defined here. If the AI is doing something wrong with data, this is where to look.
3. **Data loading:** `AIDataProvider.java` — responsible for fetching vet/owner data from sibling services and populating the vector store.

### Key patterns

- **Spring AI function calling:** The LLM is configured with a set of Java methods (tools). When the model decides it needs data, it emits a function call; Spring AI intercepts it, invokes the corresponding Java method, and feeds the result back to the model.
- **RAG for vets:** On startup (or refresh), vet records are embedded and stored in the `VectorStore`. When a user asks about veterinarians or specialties, relevant records are retrieved and injected into the prompt context.
- **Service discovery:** All outbound REST calls use Eureka-resolved URLs — there are no hardcoded hostnames. If a downstream service is unreachable, expect `DiscoveryClient` resolution failures or HTTP connection errors.
- **No database migrations:** There is no database. Chat memory and vector store are in-memory and ephemeral.

### Outbound dependency quick-reference

| Target Service | Endpoint | Method | Purpose |
|----------------|----------|--------|---------|
| `vets-service` | `/vets` | GET | Fetch all vets for vector store / RAG |
| `customers-service` | `/owners` | GET | List all pet owners |
| `customers-service` | `/owners` | POST | Add a new owner |
| `customers-service` | `/owners/{ownerId}/pets` | POST | Add a new pet to an existing owner |

### Testing

- Uses **Spring Boot Test** with **JUnit 5**.
- Integration tests depend on Eureka and the availability of sibling microservices; ensure the full stack is running or mocked.

## Related Documents

- [API.md](API.md) — Endpoint contracts and request/response schemas for `POST /chatclient`.
- [SCENARIOS.md](SCENARIOS.md) — Common interaction scenarios (e.g., multi-turn chat, adding a pet via natural language).
- [DEPENDENCIES.md](DEPENDENCIES.md) — Full dependency graph including transitive Spring AI and Spring Cloud dependencies.
- [RUNBOOK.md](RUNBOOK.md) — Operational playbook: startup, health checks, common failure modes, and LLM provider configuration.

## See Also

- [Spring AI Reference Documentation](https://docs.spring.io/spring-ai/reference/) — Framework used for LLM integration, function calling, and vector stores.
- [spring-petclinic-microservices README](https://github.com/spring-petclinic/spring-petclinic-microservices/blob/main/README.md) — Top-level repo documentation and architecture overview.
- [Spring Cloud Netflix Eureka](https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/) — Service discovery mechanism used by this service.
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling) — Upstream API pattern this service relies on for tool invocation.
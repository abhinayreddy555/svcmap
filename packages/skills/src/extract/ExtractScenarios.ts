import { z } from 'zod';
import type { Skill, SkillContext, RawAssets } from '../types.js';
import { extractJSON, extractWithChunks } from '../types.js';
import { formatAllAssets, JSON_SYSTEM, jsonUserPrompt } from './prompts.js';

export const ScenarioStepSchema = z.object({
  order: z.number().catch(0),
  description: z.string().catch(''),
  codeRef: z.string().nullish().default(null).describe('file:functionName — exact location in the codebase'),
  functionSignature: z.string().nullish().default(null).describe(
    'Exact function/method signature as it appears in code — e.g. "OrderService.createOrder(dto: CreateOrderDto, userId: string): Promise<Order>"',
  ),
  branchCondition: z.string().nullish().default(null).describe(
    'The if/when/guard clause that routes execution into this step — e.g. "if payment.status === CAPTURED" or "when order.total < minimum"',
  ),
  codeSnippet: z.string().nullish().default(null).describe(
    '5–15 lines of the most important code doing the work in this step. Only include for non-trivial logic — skip for simple getters, DB reads with no logic, or log calls.',
  ),
  stateChange: z.string().nullish().default(null).describe(
    'Entity state transition caused by this step — e.g. "order.status: PENDING → PROCESSING" or "payment.capturedAt set"',
  ),
  callsExternal: z.string().nullish().default(null).describe('Name of external service, queue, or DB this step interacts with'),
});

export const ScenarioSchema = z.object({
  name: z.string(),
  trigger: z.string().describe('What initiates this scenario — e.g. "POST /orders with valid JWT and body"'),
  entryPoint: z.string().nullable().describe('File and function where this scenario starts — e.g. "src/routes/orders.ts → createOrderHandler"'),
  preconditions: z.array(z.string()).describe(
    'State that must be true before this scenario can run — e.g. "user must be authenticated", "order.status must be PENDING"',
  ),
  steps: z.array(ScenarioStepSchema),
  successOutcome: z.string().describe('Exact observable outcome: HTTP response, DB state, events emitted'),
  sideEffects: z.array(z.string()).describe('DB writes, events published, external calls, cache invalidations'),
  failureModes: z.array(z.object({
    condition: z.string(),
    outcome: z.string(),
    errorCode: z.string().nullish().default(null),
    isRetryable: z.boolean().catch(false),
  })).catch([]),
  tags: z.array(z.string()).catch([]),
  testedBy: z.string().nullish().default(null),
});

export const ScenariosSchema = z.object({
  scenarios: z.array(ScenarioSchema),
});
export type Scenarios = z.infer<typeof ScenariosSchema>;

const SCHEMA = JSON.stringify({
  scenarios: [{
    name: 'Happy Path — Create Order',
    trigger: 'POST /orders with valid JWT and well-formed body',
    entryPoint: 'src/routes/orders.ts → createOrderHandler',
    preconditions: ['user is authenticated (valid JWT)', 'order.items.length >= 1', 'order.subtotal >= 10.00'],
    steps: [
      {
        order: 1,
        description: 'Extract and verify JWT; attach userId to request context',
        codeRef: 'src/middleware/auth.ts:verifyJWT',
        functionSignature: 'verifyJWT(req: Request, res: Response, next: NextFunction): void',
        branchCondition: null,
        codeSnippet: null,
        stateChange: null,
        callsExternal: null,
      },
      {
        order: 2,
        description: 'Validate request body against CreateOrderSchema — reject if items empty or total below minimum',
        codeRef: 'src/services/OrderService.ts:validateOrder',
        functionSignature: 'validateOrder(dto: CreateOrderDto): void',
        branchCondition: null,
        codeSnippet: 'if (dto.items.length === 0) throw new AppError(\'ERR_EMPTY_ORDER\', 422);\nif (dto.subtotal < MIN_ORDER_VALUE) throw new AppError(\'ERR_BELOW_MINIMUM\', 422);',
        stateChange: null,
        callsExternal: null,
      },
      {
        order: 3,
        description: 'Call inventory-service to reserve requested stock quantities',
        codeRef: 'src/clients/InventoryClient.ts:reserveStock',
        functionSignature: 'reserveStock(items: OrderItem[]): Promise<ReservationResult>',
        branchCondition: null,
        codeSnippet: null,
        stateChange: null,
        callsExternal: 'inventory-service',
      },
      {
        order: 4,
        description: 'Persist order with status PENDING inside a DB transaction',
        codeRef: 'src/repositories/OrderRepository.ts:create',
        functionSignature: 'create(dto: CreateOrderDto, userId: string, tx: Transaction): Promise<Order>',
        branchCondition: null,
        codeSnippet: 'const order = await tx.orders.create({ data: { ...dto, userId, status: \'PENDING\' } });\nreturn order;',
        stateChange: 'order created with status: PENDING',
        callsExternal: 'PostgreSQL',
      },
      {
        order: 5,
        description: 'Publish order.created event to Kafka topic',
        codeRef: 'src/events/EventBus.ts:publish',
        functionSignature: 'publish(topic: string, payload: OrderCreatedEvent): Promise<void>',
        branchCondition: null,
        codeSnippet: null,
        stateChange: null,
        callsExternal: 'Kafka',
      },
    ],
    successOutcome: 'Returns 201 { orderId, status: "PENDING", total }; order row in DB; order.created on Kafka',
    sideEffects: ['INSERT into orders table', 'INSERT into order_items table', 'Kafka publish order.created', 'inventory reservation held'],
    failureModes: [
      { condition: 'items array is empty OR subtotal < $10', outcome: 'Returns 422 { error: { code: "ERR_BELOW_MINIMUM" } }', errorCode: 'ERR_BELOW_MINIMUM', isRetryable: false },
      { condition: 'inventory-service returns 409 (stock unavailable)', outcome: 'Returns 409 { error: { code: "ERR_STOCK_INSUFFICIENT" } }', errorCode: 'ERR_STOCK_INSUFFICIENT', isRetryable: false },
      { condition: 'inventory-service times out (> 3000ms)', outcome: 'Returns 503 { error: { code: "ERR_UPSTREAM_TIMEOUT" } }; reservation NOT held', errorCode: 'ERR_UPSTREAM_TIMEOUT', isRetryable: true },
      { condition: 'DB write fails (connection lost, constraint violation)', outcome: 'Returns 500; reservation rolled back via saga compensating action', errorCode: 'ERR_INTERNAL', isRetryable: true },
    ],
    tags: ['happy-path', 'rest-api', 'transactional'],
    testedBy: 'tests/integration/orders.test.ts → "POST /orders creates order successfully"',
  }],
}, null, 2);

export const ExtractScenariosSkill: Skill<RawAssets, Scenarios> = {
  name: 'ExtractScenarios',
  description: 'Extract exhaustive execution scenarios with code-level step detail from a service',
  tier: 'extraction',
  inputSchema: z.any() as any,
  outputSchema: ScenariosSchema as any,

  async execute(input: RawAssets, ctx: SkillContext): Promise<Scenarios> {
    const content = formatAllAssets(input, ['route', 'source', 'test', 'event', 'error']);

    const instruction = `Extract ALL distinct execution scenarios from this service. Be exhaustive — this is a product bible.
A scenario is a real end-to-end execution path: from trigger (HTTP request, event, cron) through to outcome.

For each scenario provide CODE-LEVEL DETAIL:
- preconditions: what state must be true before this scenario runs
- For each step:
  - codeRef: exact file:functionName
  - functionSignature: the exact signature as it appears in code
  - branchCondition: the if/guard/when clause that routes here (null for unconditional steps)
  - codeSnippet: 5–15 lines of the key code for non-trivial steps ONLY — skip trivial DB reads, log calls, getters
  - stateChange: if this step changes an entity's status/state field, document it as "entity.field: FROM → TO"
  - callsExternal: the external service, queue, DB being called (null if none)
- failureModes: every failure condition with exact error code AND whether it is retryable
- testedBy: the test file/test name that exercises this scenario (null if untested)

Coverage requirements — you MUST include:
- Every HTTP/gRPC endpoint: happy-path + auth-failure + validation-failure + upstream-failure scenarios each
- Every background job, cron trigger, scheduled task
- Every inbound event/message handler (Kafka, queue, webhook)
- Every startup or initialisation path with meaningful failure modes
- Any async retry, compensation, or circuit-breaker path

No upper limit on scenario count. Minimum 15 scenarios for any non-trivial service.`;

    const mapInstruction = `${instruction}

NOTE: You are seeing a PARTIAL view of the codebase. Extract every scenario visible in this portion.
More portions will be merged — do not skip scenarios assuming they appear elsewhere.`;

    const parse = (raw: string) => ScenariosSchema.parse(JSON.parse(extractJSON(raw)));

    return extractWithChunks(content, ctx, {
      tier: 'extraction',
      mapPrompt: (chunk) => ({
        system: JSON_SYSTEM,
        user: jsonUserPrompt(SCHEMA, chunk, mapInstruction),
      }),
      reducePrompt: (partials) => ({
        system: JSON_SYSTEM,
        user: `You received ${partials.length} partial scenario extractions from different portions of the same codebase.
Merge them into a single complete list. Rules:
- Combine ALL scenario arrays.
- Deduplicate by name — if the same scenario appears in multiple parts, keep the version with the most step detail (most non-null codeSnippets, functionSignatures).
- Do NOT drop any unique scenarios.
Output schema (output ONLY this JSON, nothing else):
${SCHEMA}

Partial results:
${partials.map((p, i) => `--- Part ${i + 1} ---\n${p}`).join('\n\n')}`,
      }),
      parse,
    });
  },
};

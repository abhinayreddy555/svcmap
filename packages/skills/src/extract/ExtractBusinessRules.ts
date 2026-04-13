import { z } from 'zod';
import type { Skill, SkillContext, RawAssets } from '../types.js';
import { extractJSON, extractWithChunks } from '../types.js';
import { formatAllAssets, JSON_SYSTEM, jsonUserPrompt } from './prompts.js';

// ─── State machines ──────────────────────────────────────────────────────────

export const StateTransitionSchema = z.object({
  from: z.string().describe('Source state'),
  to: z.string().describe('Target state'),
  trigger: z.string().describe('What causes this transition — method call, event, user action'),
  guards: z.array(z.string()).catch([]),
  sideEffects: z.array(z.string()).catch([]),
  codeRef: z.string().nullish().default(null),
});

export const StateMachineSchema = z.object({
  entity: z.string().describe('Entity or domain object whose status/state changes — e.g. Order, Payment'),
  statusField: z.string().describe('The field that holds the state — e.g. status, state, phase'),
  states: z.array(z.string()).describe('All possible state values'),
  initialState: z.string().nullable(),
  terminalStates: z.array(z.string()).describe('States from which no further transitions are possible'),
  transitions: z.array(StateTransitionSchema),
});

// ─── Business rules ──────────────────────────────────────────────────────────

export const BusinessRuleSchema = z.object({
  name: z.string().describe('Short descriptive name — e.g. "Minimum order value"'),
  category: z.enum([
    'validation',
    'calculation',
    'state-guard',
    'permission',
    'rate-limit',
    'business-constraint',
    'idempotency',
    'other',
  ]).catch('other'),
  description: z.string().describe('What this rule enforces and why'),
  condition: z.string().describe('The when/if clause — e.g. "when order.total < 10"'),
  outcome: z.string().describe('What happens when the condition is met — error thrown, value computed, etc.'),
  entities: z.array(z.string()).catch([]),
  codeRef: z.string().nullish().default(null),
  errorCode: z.string().nullish().default(null),
});

// ─── Permissions ─────────────────────────────────────────────────────────────

export const PermissionRuleSchema = z.object({
  resource: z.string().describe('Endpoint, entity, or operation — e.g. "DELETE /orders/:id"'),
  action: z.string().describe('cancel, create, view, update, delete, etc.'),
  allowedRoles: z.array(z.string()).catch([]),
  conditions: z.array(z.string()).catch([]),
  denialBehavior: z.string().nullish().default(null),
  codeRef: z.string().nullish().default(null),
});

// ─── Calculations & formulas ─────────────────────────────────────────────────

export const CalculationSchema = z.object({
  name: z.string().describe('Name of the calculation — e.g. "Order total with tax"'),
  formula: z.string().describe('Human-readable formula or algorithm description'),
  inputs: z.array(z.string()).catch([]),
  output: z.string().catch('unknown'),
  precision: z.string().nullish().default(null),
  codeRef: z.string().nullish().default(null),
});

// ─── Top-level schema ─────────────────────────────────────────────────────────

export const BusinessRulesSchema = z.object({
  stateMachines: z.array(StateMachineSchema),
  rules: z.array(BusinessRuleSchema),
  permissions: z.array(PermissionRuleSchema),
  calculations: z.array(CalculationSchema),
});
export type BusinessRules = z.infer<typeof BusinessRulesSchema>;

// ─── Example schema for prompt ───────────────────────────────────────────────

const SCHEMA = JSON.stringify({
  stateMachines: [{
    entity: 'Order',
    statusField: 'status',
    states: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
    initialState: 'PENDING',
    terminalStates: ['DELIVERED', 'REFUNDED'],
    transitions: [
      {
        from: 'PENDING', to: 'PROCESSING',
        trigger: 'PaymentService.confirmPayment(orderId)',
        guards: ['payment.status === CAPTURED', 'order.items.length > 0'],
        sideEffects: ['emits order.confirmed event', 'notifies warehouse queue'],
        codeRef: 'src/services/OrderService.ts:confirmPayment',
      },
      {
        from: 'PROCESSING', to: 'CANCELLED',
        trigger: 'OrderService.cancel(orderId, reason)',
        guards: ['requester is order owner OR admin role', 'cancellation window < 30 minutes'],
        sideEffects: ['triggers refund flow', 'emits order.cancelled event', 'releases inventory'],
        codeRef: 'src/services/OrderService.ts:cancelOrder',
      },
    ],
  }],
  rules: [
    {
      name: 'Minimum order value',
      category: 'validation',
      description: 'Orders below the minimum value are rejected to prevent uneconomical processing',
      condition: 'order.subtotal < 10.00',
      outcome: 'Throws ERR_ORDER_BELOW_MINIMUM with HTTP 422',
      entities: ['Order'],
      codeRef: 'src/services/OrderService.ts:validateOrder',
      errorCode: 'ERR_ORDER_BELOW_MINIMUM',
    },
    {
      name: 'Discount cap',
      category: 'business-constraint',
      description: 'No single discount code can reduce order value by more than 50%',
      condition: 'discount.percentage > 50',
      outcome: 'Discount clamped to 50%, audit log entry created',
      entities: ['Order', 'Discount'],
      codeRef: 'src/services/DiscountService.ts:applyDiscount',
      errorCode: null,
    },
  ],
  permissions: [
    {
      resource: 'DELETE /orders/:id',
      action: 'cancel',
      allowedRoles: ['customer', 'admin', 'support'],
      conditions: ['customer role: must be order.userId === req.user.id', 'cancellation window must be open'],
      denialBehavior: 'Returns 403 with ERR_FORBIDDEN',
      codeRef: 'src/middleware/authorize.ts:requireOrderOwnerOrAdmin',
    },
  ],
  calculations: [
    {
      name: 'Order total with tax',
      formula: 'subtotal * (1 + taxRate) + shippingCost — discountAmount',
      inputs: ['subtotal', 'taxRate (from user.country)', 'shippingCost', 'discountAmount'],
      output: 'order.total (2 decimal places, rounded half-up)',
      precision: 'Currency: USD stored as cents (integer). Displayed as /100.',
      codeRef: 'src/services/PricingService.ts:calculateTotal',
    },
  ],
}, null, 2);

// ─── Skill ────────────────────────────────────────────────────────────────────

export const ExtractBusinessRulesSkill: Skill<RawAssets, BusinessRules> = {
  name: 'ExtractBusinessRules',
  description: 'Extract state machines, business rules, permission matrix, and calculation formulas from service logic',
  tier: 'extraction',
  inputSchema: z.any() as any,
  outputSchema: BusinessRulesSchema as any,

  async execute(input: RawAssets, ctx: SkillContext): Promise<BusinessRules> {
    const content = formatAllAssets(input, ['source', 'route', 'schema', 'error', 'event']);

    const instruction = `Extract the complete set of business rules, state machines, permissions, and calculations from this service.

PART 1 — State machines:
Look for: enums or constants that define status/state values, switch statements or if-chains that control state transitions,
methods like transitionTo(), updateStatus(), cancel(), approve(), reject().
For each state machine: identify ALL possible states, the initial and terminal states, and every valid transition
including what triggers it, what guards it (conditions that must be true), and what side effects it causes.

PART 2 — Business rules:
Look for: guard clauses at the start of service methods, validation functions, constraint checks before DB writes,
conditional business logic that enforces "only allow X when Y".
Capture: minimum/maximum value rules, ownership checks, timing constraints, idempotency guards.

PART 3 — Permissions:
Look for: auth middleware, role checks, ownership assertions (userId === req.user.id), policy classes, @Roles() decorators.
For each protected resource: who can access it, under what additional conditions, what happens on denial.

PART 4 — Calculations:
Look for: pricing functions, tax calculations, discount logic, scoring algorithms, quota calculations.
For each: describe the formula in plain English, list inputs, describe precision/rounding rules.`;

    const parse = (raw: string) => BusinessRulesSchema.parse(JSON.parse(extractJSON(raw)));

    return extractWithChunks(content, ctx, {
      tier: 'extraction',
      mapPrompt: (chunk) => ({
        system: JSON_SYSTEM,
        user: jsonUserPrompt(SCHEMA, chunk,
          `${instruction}\n\nNOTE: This is a PARTIAL view — extract what is visible here. Everything will be merged.`),
      }),
      reducePrompt: (partials) => ({
        system: JSON_SYSTEM,
        user: `You received ${partials.length} partial business rule extractions from different portions of the same codebase.
Merge them into one complete result. Rules:
- stateMachines: deduplicate by entity name. If the same entity appears in multiple parts, merge the transitions arrays (deduplicate by from+to pair, keep the most detailed).
- rules: combine all, deduplicate by name (keep most detailed).
- permissions: combine all, deduplicate by resource+action.
- calculations: combine all, deduplicate by name.
Output schema (output ONLY this JSON, nothing else):
${SCHEMA}

Partial results:
${partials.map((p, i) => `--- Part ${i + 1} ---\n${p}`).join('\n\n')}`,
      }),
      parse,
    });
  },
};

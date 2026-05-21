import type { PrismIR } from '@prism/core';
import type { PrismStore } from '@prism/runtime';
import { z } from 'zod';

export type ActionHandler = (input: unknown) => Promise<unknown>;

/**
 * Wires IR actions to store operations.
 * Returns a map of actionName → handler function.
 */
export function buildHandlers(
  ir: PrismIR,
  store: PrismStore<Record<string, unknown>>
): Map<string, ActionHandler> {
  const handlers = new Map<string, ActionHandler>();

  for (const action of ir.actions) {
    switch (action.name) {
      case 'search_products':
        handlers.set(action.name, async (input) => {
          const parsed = action.inputSchema.parse(input) as {
            query?: string;
            origin?: string;
            roast?: string;
          };
          const filters: Record<string, string> = {};
          if (parsed.origin) filters['origin'] = parsed.origin;
          if (parsed.roast) filters['roast'] = parsed.roast;
          return store.search({ query: parsed.query, filters });
        });
        break;

      case 'get_product':
        handlers.set(action.name, async (input) => {
          const parsed = action.inputSchema.parse(input) as { id: string };
          const product = store.findById(parsed.id);
          if (!product) throw new Error(`Product not found: ${parsed.id}`);
          return product;
        });
        break;

      case 'check_availability':
        handlers.set(action.name, async (input) => {
          const parsed = action.inputSchema.parse(input) as {
            id: string;
            quantity: number;
          };
          const product = store.findById(parsed.id);
          if (!product) throw new Error(`Product not found: ${parsed.id}`);
          const stock = Number(product['stock'] ?? 0);
          return { available: stock >= parsed.quantity, stock };
        });
        break;

      case 'purchase':
        handlers.set(action.name, async (input) => {
          const parsed = action.inputSchema.parse(input) as {
            id: string;
            quantity: number;
            customerEmail: string;
          };
          const product = store.findById(parsed.id);
          if (!product) throw new Error(`Product not found: ${parsed.id}`);
          const stock = Number(product['stock'] ?? 0);
          if (stock < parsed.quantity)
            throw new Error(`Insufficient stock: ${stock} available`);

          // Deduct stock
          store.update(parsed.id, { stock: stock - parsed.quantity } as Partial<Record<string, unknown>>);

          const orderId = `ORD-${Date.now()}`;
          const price = Number(product['price'] ?? 0);
          // TODO(phase-2): emit real Stripe payment intent
          // TODO(phase-3): emit ARTF purchase signal
          return {
            orderId,
            status: 'confirmed',
            total: price * parsed.quantity,
            product: product['name'],
            quantity: parsed.quantity,
            customerEmail: parsed.customerEmail,
          };
        });
        break;

      default:
        // Generic passthrough for unknown actions
        handlers.set(action.name, async (input) => {
          action.inputSchema.parse(input);
          return { ok: true, action: action.name };
        });
    }
  }

  return handlers;
}

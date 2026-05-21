import type { PrismIR, PrismAction } from '@prism/core';

export interface CheckoutHandler {
  actionName: string;
  isTransactional: boolean;
  // TODO(phase-2): Stripe payment intent config
}

export interface MonetizationArtifacts {
  checkoutHandlers: CheckoutHandler[];
  /** Stub ARTF signal — real OpenRTB bidstream in Phase 3 */
  artfSignalStub: object;
}

/** Emits monetization handlers from the IR. */
export function emitMonetization(ir: PrismIR): MonetizationArtifacts {
  const transactableFields = ir.fields.filter((f) => f.annotations.transactable);

  const purchaseAction = ir.actions.find((a) => a.name === 'purchase');

  const checkoutHandlers: CheckoutHandler[] = ir.actions.map((action) => ({
    actionName: action.name,
    isTransactional: action.name === 'purchase',
  }));

  // TODO(phase-3): replace with real OpenRTB bidstream via ARTF container
  const artfSignalStub = {
    _stub: true,
    phase: 3,
    entity: ir.entity,
    transactableFields: transactableFields.map((f) => f.name),
    purchaseAction: purchaseAction?.name ?? null,
    signal: {
      type: 'purchase_intent',
      entity: ir.entity,
      timestamp: '__RUNTIME__',
    },
  };

  return { checkoutHandlers, artfSignalStub };
}

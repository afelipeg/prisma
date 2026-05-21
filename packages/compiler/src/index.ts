import type { PrismIR } from '@prism/core';

import { emitKnowledge } from './emitters/knowledge.js';
import { emitHumanUi } from './emitters/human-ui.js';
import { emitAgentApi } from './emitters/agent-api.js';
import { emitMonetization } from './emitters/monetization.js';

import type { HumanUiArtifacts } from './emitters/human-ui.js';
import type { McpToolDef } from './emitters/agent-api.js';

export { emitKnowledge } from './emitters/knowledge.js';
export type { KnowledgeArtifacts } from './emitters/knowledge.js';

export { emitAgentApi } from './emitters/agent-api.js';
export type { AgentApiArtifacts, McpToolDef } from './emitters/agent-api.js';

export { emitHumanUi } from './emitters/human-ui.js';
export type { HumanUiArtifacts } from './emitters/human-ui.js';

export { emitMonetization } from './emitters/monetization.js';
export type { MonetizationArtifacts } from './emitters/monetization.js';

/**
 * The unified surface bundle produced by compiling an IR.
 *
 *   const c = compile(ir);
 *   c.ui.title              → field name with display:'title'
 *   c.jsonLd("Product", p)  → Schema.org JSON-LD string
 *   c.llms(products)        → /llms.txt body
 */
export interface CompiledSurfaces {
  ir: PrismIR;
  ui: HumanUiArtifacts;
  jsonLd: (type: string, data: Record<string, unknown>) => string;
  llms: (products: Record<string, unknown>[]) => string;
  mcpTools: McpToolDef[];
  artfSignal: object;
}

/** Compile the IR into all four surfaces. Pure function — no I/O. */
export function compile(ir: PrismIR): CompiledSurfaces {
  const knowledge = emitKnowledge(ir);
  const ui = emitHumanUi(ir);
  const agentApi = emitAgentApi(ir);
  const monetization = emitMonetization(ir);

  return {
    ir,
    ui,
    jsonLd: knowledge.jsonLd,
    llms: knowledge.llms,
    mcpTools: agentApi.mcpTools,
    artfSignal: monetization.artfSignalStub,
  };
}

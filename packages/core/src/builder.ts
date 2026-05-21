import type { PrismIR, PrismMeta } from './types.js';
import type { BuiltField, BuiltAction } from './annotations.js';

type FieldMap = Record<string, BuiltField>;
type ActionMap = Record<string, BuiltAction>;

export interface PrismDefinition {
  entity: string;
  description: string;
  meta?: PrismMeta;
  fields: FieldMap;
  actions: ActionMap;
}

/**
 * Takes a developer-authored schema definition and produces the typed IR.
 * This is THE entry-point for every *.prism.ts file.
 */
export function definePrism(def: PrismDefinition): PrismIR {
  const fields = Object.entries(def.fields).map(([name, built]) => ({
    name,
    type: built.type,
    zodSchema: built.schema,
    annotations: built.annotations,
    ...(built.enumValues ? { enumValues: built.enumValues } : {}),
  }));

  const actions = Object.entries(def.actions).map(([name, built]) => ({
    name,
    description: built.definition.description,
    inputSchema: built.definition.input,
    outputSchema: built.definition.output,
  }));

  return {
    entity: def.entity,
    description: def.description,
    meta: def.meta ?? {},
    fields,
    actions,
  };
}

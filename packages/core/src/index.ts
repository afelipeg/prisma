export type {
  PrismIR,
  PrismField,
  PrismAction,
  PrismMeta,
  FieldAnnotations,
  DisplayRole,
  GenuiRole,
  LlmRole,
  SchemaOrgType,
  PrismFieldType,
} from './types.js';

export { definePrism } from './builder.js';
export type { PrismDefinition } from './builder.js';

export { field, action, FieldBuilder } from './annotations.js';
export type { BuiltField, BuiltAction, ActionDefinition } from './annotations.js';

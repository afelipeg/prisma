import { z } from 'zod';
import type {
  FieldAnnotations,
  PrismField,
  PrismFieldType,
} from './types.js';

// ─── Infer PrismFieldType from a Zod schema ──────────────────────────────────

function inferFieldType(schema: z.ZodTypeAny): PrismFieldType {
  const unwrapped = unwrapOptional(schema);
  if (unwrapped instanceof z.ZodString) return 'string';
  if (unwrapped instanceof z.ZodNumber) return 'number';
  if (unwrapped instanceof z.ZodBoolean) return 'boolean';
  if (unwrapped instanceof z.ZodEnum) return 'enum';
  if (unwrapped instanceof z.ZodArray) return 'array';
  if (unwrapped instanceof z.ZodObject) return 'object';
  return 'string'; // fallback
}

function unwrapOptional(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodOptional) return unwrapOptional(schema.unwrap());
  if (schema instanceof z.ZodDefault) return unwrapOptional(schema._def.innerType);
  return schema;
}

function getEnumValues(schema: z.ZodTypeAny): readonly string[] | undefined {
  const unwrapped = unwrapOptional(schema);
  if (unwrapped instanceof z.ZodEnum) return unwrapped.options as readonly string[];
  return undefined;
}

// ─── Fluent FieldBuilder ─────────────────────────────────────────────────────

export class FieldBuilder {
  private _annotations: FieldAnnotations = {};

  constructor(private readonly _schema: z.ZodTypeAny) {}

  display(role: FieldAnnotations['display']): this {
    this._annotations.display = role;
    return this;
  }

  genui(role: FieldAnnotations['genui']): this {
    this._annotations.genui = role;
    return this;
  }

  transactable(): this {
    this._annotations.transactable = true;
    return this;
  }

  live(): this {
    this._annotations.live = true;
    return this;
  }

  llm(role: FieldAnnotations['llm']): this {
    this._annotations.llm = role;
    return this;
  }

  facet(): this {
    this._annotations.facet = true;
    return this;
  }

  filter(): this {
    this._annotations.filter = true;
    return this;
  }

  rich_snippet(): this {
    this._annotations.rich_snippet = true;
    return this;
  }

  local_business(): this {
    this._annotations.local_business = true;
    return this;
  }

  /** Marks a numeric field as an aggregate rating (drives star UI + Schema.org aggregateRating). */
  rating(): this {
    this._annotations.rating = true;
    return this;
  }

  richSnippetType(type: FieldAnnotations['richSnippetType']): this {
    this._annotations.richSnippetType = type;
    return this;
  }

  /** Finalise and return the raw field descriptor (name filled by definePrism). */
  build(): BuiltField {
    return {
      __builtField: true,
      schema: this._schema,
      annotations: { ...this._annotations },
      type: inferFieldType(this._schema),
      enumValues: getEnumValues(this._schema),
    };
  }
}

/** Opaque tag so definePrism can distinguish BuiltFields from raw values. */
export interface BuiltField {
  __builtField: true;
  schema: z.ZodTypeAny;
  annotations: FieldAnnotations;
  type: PrismFieldType;
  enumValues?: readonly string[];
}

/** Convenience factory — start a field definition. */
export function field(schema: z.ZodTypeAny): FieldBuilder {
  return new FieldBuilder(schema);
}

// ─── Action builder ──────────────────────────────────────────────────────────

export interface ActionDefinition {
  description: string;
  input: z.ZodTypeAny;
  output: z.ZodTypeAny;
}

export interface BuiltAction {
  __builtAction: true;
  definition: ActionDefinition;
}

export function action(def: ActionDefinition): BuiltAction {
  return { __builtAction: true, definition: def };
}

import { z } from 'zod';

// ─── Annotation types ────────────────────────────────────────────────────────

export type DisplayRole = 'title' | 'subtitle' | 'body';
export type GenuiRole = 'hero' | 'card' | 'detail';
export type LlmRole = 'summary' | 'keywords';
export type SchemaOrgType =
  | 'Product'
  | 'Offer'
  | 'Organization'
  | 'LocalBusiness'
  | 'ItemList'
  | 'AggregateRating';

export interface FieldAnnotations {
  display?: DisplayRole;
  genui?: GenuiRole;
  transactable?: true;
  live?: true;
  llm?: LlmRole;
  facet?: true;
  filter?: true;
  rich_snippet?: true;
  local_business?: true;
  rating?: true;
  richSnippetType?: SchemaOrgType;
}

// ─── IR Field ────────────────────────────────────────────────────────────────

export type PrismFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'array'
  | 'object';

export interface PrismField {
  name: string;                  // filled in by definePrism from the key
  type: PrismFieldType;
  zodSchema: z.ZodTypeAny;
  annotations: FieldAnnotations;
  enumValues?: readonly string[];  // present when type === 'enum'
}

// ─── IR Action ───────────────────────────────────────────────────────────────

export interface PrismAction {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
}

// ─── IR Meta ─────────────────────────────────────────────────────────────────

export interface PrismMeta {
  businessName?: string;
  businessUrl?: string;
  schemaOrgType?: SchemaOrgType;
  locale?: string;
}

// ─── Top-level IR (the contract) ─────────────────────────────────────────────

export interface PrismIR {
  entity: string;
  description: string;
  meta: PrismMeta;
  fields: PrismField[];
  actions: PrismAction[];
}

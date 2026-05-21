import { z } from 'zod';

/** Minimal Zod → JSON Schema converter (covers the subset used in Prism). */
export function zodToJsonSchema(schema: z.ZodTypeAny): object {
  return convert(schema);
}

function convert(schema: z.ZodTypeAny): object {
  if (schema instanceof z.ZodString) return { type: 'string' };
  if (schema instanceof z.ZodNumber) return { type: 'number' };
  if (schema instanceof z.ZodBoolean) return { type: 'boolean' };
  if (schema instanceof z.ZodEnum) {
    return { type: 'string', enum: schema.options };
  }
  if (schema instanceof z.ZodOptional) {
    return convert(schema.unwrap());
  }
  if (schema instanceof z.ZodArray) {
    return { type: 'array', items: convert(schema.element) };
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    const properties: Record<string, object> = {};
    const required: string[] = [];
    for (const [key, val] of Object.entries(shape)) {
      properties[key] = convert(val);
      if (!(val instanceof z.ZodOptional)) required.push(key);
    }
    const result: Record<string, unknown> = { type: 'object', properties };
    if (required.length > 0) result['required'] = required;
    return result;
  }
  if (schema instanceof z.ZodUnion) {
    return { oneOf: (schema.options as z.ZodTypeAny[]).map(convert) };
  }
  // fallback
  return {};
}

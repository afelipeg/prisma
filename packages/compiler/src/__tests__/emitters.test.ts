import { describe, expect, test } from 'bun:test';
import { compile } from '../index.ts';
import { productSchema } from '../../../../apps/cafe-nube/prism/product.prism.ts';
import { seed } from '../../../../apps/cafe-nube/data/seed.ts';

const prism = compile(productSchema);

describe('compile(ir).jsonLd — Schema.org projection', () => {
  const oaxaca = seed[0]! as unknown as Record<string, unknown>;
  const doc = JSON.parse(prism.jsonLd('Product', oaxaca)) as Record<string, unknown>;

  test('has @context: https://schema.org', () => {
    expect(doc['@context']).toBe('https://schema.org');
  });

  test('has @type: Product', () => {
    expect(doc['@type']).toBe('Product');
  });

  test('offers.price reflects the source record', () => {
    const offers = doc['offers'] as Record<string, unknown>;
    expect(offers).toBeDefined();
    expect(offers['@type']).toBe('Offer');
    expect(offers['price']).toBe(oaxaca['price']);
    expect(offers['priceCurrency']).toBe('MXN');
  });

  test('aggregateRating uses the field annotated with .rating()', () => {
    const rating = doc['aggregateRating'] as Record<string, unknown>;
    expect(rating).toBeDefined();
    expect(rating['ratingValue']).toBe(oaxaca['rating']);
  });
});

describe('compile(ir).llms — /llms.txt body', () => {
  const body = prism.llms(seed as unknown as Record<string, unknown>[]);

  test('mentions the MCP endpoint', () => {
    expect(body).toContain('MCP endpoint');
  });

  test('lists all 4 products by name', () => {
    for (const product of seed) {
      expect(body).toContain(product.name);
    }
  });
});

describe('compile(ir).mcpTools — MCP tool definitions', () => {
  const tools = prism.mcpTools;

  test('returns exactly 4 tools', () => {
    expect(tools).toHaveLength(4);
  });

  test('covers the IR action set', () => {
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'check_availability',
      'get_product',
      'purchase',
      'search_products',
    ]);
  });

  test('every tool has a non-empty inputSchema object', () => {
    for (const tool of tools) {
      expect(tool.inputSchema).toBeDefined();
      const schema = tool.inputSchema as Record<string, unknown>;
      expect(schema['type']).toBe('object');
      expect(schema['properties']).toBeDefined();
    }
  });

  test('purchase tool requires id, quantity, customerEmail', () => {
    const purchase = tools.find((t) => t.name === 'purchase')!;
    const schema = purchase.inputSchema as Record<string, unknown>;
    const required = schema['required'] as string[];
    expect(required).toContain('id');
    expect(required).toContain('quantity');
    expect(required).toContain('customerEmail');
  });
});

describe('compile(ir).ui — human-UI field plan', () => {
  const ui = prism.ui;

  test('discovers title from display:"title" annotation', () => {
    expect(ui.title).toBe('name');
  });

  test('discovers price from transactable + non-live numeric field', () => {
    expect(ui.price).toBe('price');
  });

  test('discovers image from genui:"hero" non-title field', () => {
    expect(ui.image).toBe('imageUrl');
  });

  test('discovers subtitle, body, stock, rating from annotations', () => {
    expect(ui.subtitle).toBe('origin');
    expect(ui.body).toBe('description');
    expect(ui.stock).toBe('stock');
    expect(ui.rating).toBe('rating');
  });

  test('filterFields contains origin and roast', () => {
    const names = ui.filterFields.map((f) => f.name).sort();
    expect(names).toEqual(['origin', 'roast']);
  });
});

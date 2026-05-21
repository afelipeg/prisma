import { describe, expect, test } from 'bun:test';
import { productSchema } from '../../../../apps/cafe-nube/prism/product.prism.ts';

describe('Café Nube IR contract', () => {
  test('exactly 1 entity named "Product"', () => {
    expect(productSchema.entity).toBe('Product');
  });

  test('exactly 4 actions', () => {
    expect(productSchema.actions).toHaveLength(4);
  });

  test('stock field has annotations.live === true', () => {
    const stock = productSchema.fields.find((f) => f.name === 'stock');
    expect(stock).toBeDefined();
    expect(stock!.annotations.live).toBe(true);
  });

  test('price field has annotations.transactable === true', () => {
    const price = productSchema.fields.find((f) => f.name === 'price');
    expect(price).toBeDefined();
    expect(price!.annotations.transactable).toBe(true);
  });

  test('name field has annotations.display === "title"', () => {
    const name = productSchema.fields.find((f) => f.name === 'name');
    expect(name).toBeDefined();
    expect(name!.annotations.display).toBe('title');
  });
});

import type { PrismStore, SearchParams } from './store.js';

export class MemoryStore<T extends Record<string, unknown>>
  implements PrismStore<T>
{
  private items: Map<string, T>;

  constructor(seed: T[]) {
    this.items = new Map(seed.map((item) => [String(item['id']), item]));
  }

  findAll(): T[] {
    return Array.from(this.items.values());
  }

  findById(id: string): T | undefined {
    return this.items.get(id);
  }

  search({ query, filters, limit = 20 }: SearchParams): T[] {
    let results = this.findAll();

    if (query) {
      const q = query.toLowerCase();
      results = results.filter((item) =>
        Object.values(item).some((v) =>
          String(v).toLowerCase().includes(q)
        )
      );
    }

    if (filters) {
      for (const [key, val] of Object.entries(filters)) {
        results = results.filter((item) => item[key] === val);
      }
    }

    return results.slice(0, limit);
  }

  create(item: T): T {
    const id = String(item['id']);
    this.items.set(id, item);
    return item;
  }

  update(id: string, patch: Partial<T>): T | undefined {
    const existing = this.items.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.items.set(id, updated);
    return updated;
  }
}

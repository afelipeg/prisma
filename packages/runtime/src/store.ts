/** Generic store interface — swap in SQLite/Postgres behind this in Phase 2. */
export interface PrismStore<T extends Record<string, unknown>> {
  findAll(): T[];
  findById(id: string): T | undefined;
  search(params: SearchParams): T[];
  create(item: T): T;
  update(id: string, patch: Partial<T>): T | undefined;
}

export interface SearchParams {
  query?: string;
  filters?: Record<string, string | number | boolean>;
  limit?: number;
}

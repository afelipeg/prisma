#!/usr/bin/env bash
# ============================================================================
# Prism Framework — Day 1 Bootstrap
# Scaffolds the full monorepo skeleton. Run once, then `bun install`.
# Requires: bun (https://bun.sh). macOS / Apple Silicon ready.
# ============================================================================
set -euo pipefail

ROOT="${1:-prism}"
echo "▶ Scaffolding Prism monorepo into ./$ROOT"
mkdir -p "$ROOT" && cd "$ROOT"

# ---------------------------------------------------------------------------
# Root config
# ---------------------------------------------------------------------------
cat > package.json <<'JSON'
{
  "name": "prism",
  "private": true,
  "version": "0.0.1",
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "demo": "bun run packages/cli/src/index.ts demo apps/cafe-nube",
    "build": "turbo run build",
    "dev": "turbo run dev",
    "typecheck": "turbo run typecheck",
    "test": "bun test"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "typescript": "^5.6.0",
    "@types/bun": "latest"
  },
  "packageManager": "bun@1.2.0"
}
JSON

cat > turbo.json <<'JSON'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".prism/**", "dist/**", ".next/**"] },
    "dev": { "cache": false, "persistent": true },
    "typecheck": { "dependsOn": ["^build"] }
  }
}
JSON

cat > tsconfig.base.json <<'JSON'
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "types": ["bun"],
    "paths": {
      "@prism/core": ["./packages/core/src/index.ts"],
      "@prism/compiler": ["./packages/compiler/src/index.ts"],
      "@prism/runtime": ["./packages/runtime/src/index.ts"],
      "@prism/mcp": ["./packages/mcp-server/src/index.ts"]
    }
  }
}
JSON

cat > bunfig.toml <<'TOML'
[install]
exact = true
TOML

cat > .gitignore <<'GIT'
node_modules
.prism
dist
.next
.turbo
*.log
.DS_Store
GIT

# ---------------------------------------------------------------------------
# packages/core  —  definePrism() + IR + annotations
# ---------------------------------------------------------------------------
mkdir -p packages/core/src
cat > packages/core/package.json <<'JSON'
{
  "name": "@prism/core",
  "version": "0.0.1",
  "type": "module",
  "main": "src/index.ts",
  "dependencies": { "zod": "^3.23.0" }
}
JSON

cat > packages/core/src/annotations.ts <<'TS'
// Annotations decorate fields to tell each emitter what to do.
// They are pure data — no behavior — so the IR stays serializable.

export type DisplayRole = "title" | "subtitle" | "body" | "price" | "image";
export type GenUiSlot = "hero" | "card" | "detail" | "none";
export type LlmRole = "summary" | "keywords" | "ignore";
export type SchemaOrgType =
  | "Product" | "Offer" | "Service" | "Article"
  | "LocalBusiness" | "Review" | "AggregateRating";

export interface FieldAnnotations {
  display?: DisplayRole;
  genui?: GenUiSlot;
  transactable?: boolean;   // participates in a purchase (price / qty)
  live?: boolean;           // real-time; never cache (e.g. stock)
  llm?: LlmRole;            // how LLMs should treat it for citation
  facet?: boolean;          // groupable dimension
  filter?: boolean;         // queryable dimension
  richSnippet?: boolean;    // surface in Schema.org rich result
  richSnippetType?: SchemaOrgType;
  localBusiness?: boolean;  // geo entity
}

// Fluent helper so schemas read like a DSL:  f.string().display("title").genui("hero")
TS

cat > packages/core/src/ir.ts <<'TS'
import type { FieldAnnotations, SchemaOrgType } from "./annotations.js";

export type ScalarKind =
  | "string" | "text" | "int" | "float"
  | "money" | "image" | "geo" | "bool" | "ref";

export interface IRField {
  name: string;
  kind: ScalarKind;
  optional: boolean;
  ref?: string;                 // for kind === "ref": name of referenced entity
  annotations: FieldAnnotations;
}

export interface IRAction {
  name: string;                 // e.g. "search", "get", "check", "purchase"
  input: Record<string, ScalarKind>;
  returns: string;              // entity name or "Availability" | "Order"
  mutates: boolean;             // true → also a commerce/checkout flow
  description: string;
}

export interface IREntity {
  name: string;                 // e.g. "Product"
  schemaOrgType: SchemaOrgType;
  fields: IRField[];
}

export interface IR {
  app: { name: string; locale: string; baseUrl: string };
  entities: IREntity[];
  actions: IRAction[];
}
TS

cat > packages/core/src/define.ts <<'TS'
import { z } from "zod";
import type { FieldAnnotations, SchemaOrgType } from "./annotations.js";
import type { IR, IREntity, IRField, IRAction, ScalarKind } from "./ir.js";

// ---- Field builder: chainable, accumulates annotations into the IR ----
class Field {
  private a: FieldAnnotations = {};
  constructor(public kind: ScalarKind, public optional = false, public ref?: string) {}
  display(r: NonNullable<FieldAnnotations["display"]>) { this.a.display = r; return this; }
  genui(s: NonNullable<FieldAnnotations["genui"]>) { this.a.genui = s; return this; }
  llm(r: NonNullable<FieldAnnotations["llm"]>) { this.a.llm = r; return this; }
  transactable() { this.a.transactable = true; return this; }
  live() { this.a.live = true; return this; }
  facet() { this.a.facet = true; return this; }
  filter() { this.a.filter = true; return this; }
  richSnippet(t?: SchemaOrgType) { this.a.richSnippet = true; if (t) this.a.richSnippetType = t; return this; }
  localBusiness() { this.a.localBusiness = true; return this; }
  opt() { this.optional = true; return this; }
  _annotations() { return this.a; }
}

export const f = {
  string: () => new Field("string"),
  text: () => new Field("text"),
  int: () => new Field("int"),
  float: () => new Field("float"),
  money: () => new Field("money"),
  image: () => new Field("image"),
  geo: () => new Field("geo"),
  bool: () => new Field("bool"),
  ref: (entity: string) => new Field("ref", false, entity),
};

type FieldMap = Record<string, Field>;

interface EntityDef { schemaOrgType: SchemaOrgType; fields: FieldMap; }
interface ActionDef {
  input: Record<string, ScalarKind>;
  returns: string;
  mutates?: boolean;
  description: string;
}

export interface PrismConfig {
  app: { name: string; locale?: string; baseUrl: string };
  entities: Record<string, EntityDef>;
  actions: Record<string, ActionDef>;
}

// definePrism: the single source of truth. Returns the serializable IR.
export function definePrism(cfg: PrismConfig): IR {
  const entities: IREntity[] = Object.entries(cfg.entities).map(([name, def]) => ({
    name,
    schemaOrgType: def.schemaOrgType,
    fields: Object.entries(def.fields).map<IRField>(([fname, fld]) => ({
      name: fname,
      kind: fld.kind,
      optional: fld.optional,
      ref: fld.ref,
      annotations: fld._annotations(),
    })),
  }));

  const actions: IRAction[] = Object.entries(cfg.actions).map<IRAction>(([name, a]) => ({
    name,
    input: a.input,
    returns: a.returns,
    mutates: a.mutates ?? false,
    description: a.description,
  }));

  return {
    app: { name: cfg.app.name, locale: cfg.app.locale ?? "es-MX", baseUrl: cfg.app.baseUrl },
    entities,
    actions,
  };
}

// Derive a Zod schema for an entity from the IR (used by MCP + runtime).
export function zodForEntity(entity: IR["entities"][number]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const fld of entity.fields) {
    let zt: z.ZodTypeAny;
    switch (fld.kind) {
      case "int": case "float": case "money": zt = z.number(); break;
      case "bool": zt = z.boolean(); break;
      default: zt = z.string();
    }
    shape[fld.name] = fld.optional ? zt.optional() : zt;
  }
  return z.object(shape);
}
TS

cat > packages/core/src/index.ts <<'TS'
export * from "./annotations.js";
export * from "./ir.js";
export * from "./define.js";
TS

# ---------------------------------------------------------------------------
# packages/runtime  —  data store + search
# ---------------------------------------------------------------------------
mkdir -p packages/runtime/src
cat > packages/runtime/package.json <<'JSON'
{
  "name": "@prism/runtime",
  "version": "0.0.1",
  "type": "module",
  "main": "src/index.ts",
  "dependencies": { "@prism/core": "workspace:*" }
}
JSON

cat > packages/runtime/src/store.ts <<'TS'
// Demo data store: in-memory. Swap behind this interface for SQLite/Postgres later.
export interface Store<T extends { id: string }> {
  all(): T[];
  get(id: string): T | undefined;
  search(query: string, filters?: Partial<T>): T[];
  update(id: string, patch: Partial<T>): T | undefined;
}

export function memoryStore<T extends { id: string }>(seed: T[]): Store<T> {
  const data = new Map(seed.map((r) => [r.id, structuredClone(r)]));
  return {
    all: () => [...data.values()],
    get: (id) => data.get(id),
    search: (query, filters) => {
      const q = query.toLowerCase().trim();
      return [...data.values()].filter((r) => {
        const text = JSON.stringify(r).toLowerCase();
        const matchesQ = q === "" || text.includes(q);
        const matchesF = !filters || Object.entries(filters).every(([k, v]) =>
          (r as Record<string, unknown>)[k] === v);
        return matchesQ && matchesF;
      });
    },
    update: (id, patch) => {
      const cur = data.get(id);
      if (!cur) return undefined;
      const next = { ...cur, ...patch };
      data.set(id, next);
      return next;
    },
  };
}
TS

cat > packages/runtime/src/index.ts <<'TS'
export * from "./store.js";
TS

# ---------------------------------------------------------------------------
# packages/compiler  —  IR → 4 surfaces
# ---------------------------------------------------------------------------
mkdir -p packages/compiler/src/emitters
cat > packages/compiler/package.json <<'JSON'
{
  "name": "@prism/compiler",
  "version": "0.0.1",
  "type": "module",
  "main": "src/index.ts",
  "dependencies": { "@prism/core": "workspace:*" }
}
JSON

cat > packages/compiler/src/emitters/knowledge.ts <<'TS'
import type { IR } from "@prism/core";

// Emits JSON-LD per entity record + llms.txt + entity-graph.
export function jsonLdFor(ir: IR, entityName: string, record: Record<string, unknown>) {
  const entity = ir.entities.find((e) => e.name === entityName);
  if (!entity) return null;
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": entity.schemaOrgType,
  };
  for (const fld of entity.fields) {
    if (fld.annotations.llm === "ignore") continue;
    const v = record[fld.name];
    if (v == null) continue;
    // Map common fields to Schema.org property names
    const prop =
      fld.annotations.display === "title" ? "name" :
      fld.kind === "money" ? "offers" :
      fld.name;
    if (fld.kind === "money") {
      ld.offers = { "@type": "Offer", price: v, priceCurrency: "MXN", availability: "https://schema.org/InStock" };
    } else {
      ld[prop] = v;
    }
  }
  return ld;
}

export function llmsTxt(ir: IR, records: Record<string, unknown>[]): string {
  const lines = [
    `# ${ir.app.name}`,
    ``,
    `> ${ir.app.name} — agent-native commerce powered by Prism. ` +
    `Catalog of ${records.length} items, queryable via MCP at ${ir.app.baseUrl}/mcp.`,
    ``,
    `## Catalog`,
    ...records.map((r) => `- [${r.name ?? r.id}](${ir.app.baseUrl}/products/${r.id}): ${r.description ?? ""}`),
    ``,
    `## Agent API`,
    `- MCP endpoint: ${ir.app.baseUrl}/mcp`,
    `- Tools: ${ir.actions.map((a) => a.name + "_" + ir.entities[0]!.name.toLowerCase()).join(", ")}`,
  ];
  return lines.join("\n");
}
TS

cat > packages/compiler/src/emitters/agent-api.ts <<'TS'
import type { IR, IRAction } from "@prism/core";

// Describes each action as an MCP tool definition (name + json schema).
export function mcpToolDefs(ir: IR) {
  const entity = ir.entities[0]!.name.toLowerCase();
  return ir.actions.map((a: IRAction) => ({
    name: `${a.name}_${entity}`,
    description: a.description,
    inputSchema: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(a.input).map(([k, kind]) => [
          k, { type: kind === "int" || kind === "float" || kind === "money" ? "number" : "string" },
        ]),
      ),
      required: Object.keys(a.input),
    },
  }));
}

// Minimal OpenAPI emission (REST mirror of the same actions).
export function openApiSpec(ir: IR) {
  const entity = ir.entities[0]!.name.toLowerCase();
  const paths: Record<string, unknown> = {};
  for (const a of ir.actions) {
    paths[`/api/${a.name}_${entity}`] = {
      post: { summary: a.description, operationId: `${a.name}_${entity}` },
    };
  }
  return { openapi: "3.1.0", info: { title: ir.app.name, version: "0.0.1" }, paths };
}
TS

cat > packages/compiler/src/emitters/human-ui.ts <<'TS'
import type { IR } from "@prism/core";

// For the demo, the Next.js app reads the IR at runtime and renders.
// This emitter exposes helpers the app uses to pick which fields go where.
export function uiPlan(ir: IR) {
  const entity = ir.entities[0]!;
  const title = entity.fields.find((f) => f.annotations.display === "title")?.name;
  const price = entity.fields.find((f) => f.kind === "money")?.name;
  const image = entity.fields.find((f) => f.kind === "image")?.name;
  const body = entity.fields.find((f) => f.annotations.display === "body")?.name;
  const facets = entity.fields.filter((f) => f.annotations.facet).map((f) => f.name);
  return { entity: entity.name, title, price, image, body, facets };
}
TS

cat > packages/compiler/src/emitters/monetization.ts <<'TS'
import type { IR } from "@prism/core";

// STUB (phase 2 = Stripe, phase 3 = ARTF). Returns realistic mock data.
export function checkoutStub(orderId: string, total: number) {
  return { orderId, total, currency: "MXN", status: "confirmed", paymentRef: `stub_${Date.now()}` };
}

// TODO(phase-3): emit a real ARTF container manifest from live/facet signals.
export function artfSignalStub(ir: IR, record: Record<string, unknown>) {
  return {
    container: "prism-artf-stub",
    signals: { context: ir.entities[0]!.name, sku: record.id, category: record.category ?? null },
  };
}
TS

cat > packages/compiler/src/compile.ts <<'TS'
import type { IR } from "@prism/core";
import { jsonLdFor, llmsTxt } from "./emitters/knowledge.js";
import { mcpToolDefs, openApiSpec } from "./emitters/agent-api.js";
import { uiPlan } from "./emitters/human-ui.js";

export interface CompiledSurfaces {
  ui: ReturnType<typeof uiPlan>;
  tools: ReturnType<typeof mcpToolDefs>;
  openapi: ReturnType<typeof openApiSpec>;
  llms: (records: Record<string, unknown>[]) => string;
  jsonLd: (entity: string, record: Record<string, unknown>) => unknown;
}

export function compile(ir: IR): CompiledSurfaces {
  return {
    ui: uiPlan(ir),
    tools: mcpToolDefs(ir),
    openapi: openApiSpec(ir),
    llms: (records) => llmsTxt(ir, records),
    jsonLd: (entity, record) => jsonLdFor(ir, entity, record),
  };
}
TS

cat > packages/compiler/src/index.ts <<'TS'
export * from "./compile.js";
export * from "./emitters/knowledge.js";
export * from "./emitters/agent-api.js";
export * from "./emitters/human-ui.js";
export * from "./emitters/monetization.js";
TS

# ---------------------------------------------------------------------------
# packages/mcp-server  —  runtime MCP server
# ---------------------------------------------------------------------------
mkdir -p packages/mcp-server/src
cat > packages/mcp-server/package.json <<'JSON'
{
  "name": "@prism/mcp",
  "version": "0.0.1",
  "type": "module",
  "main": "src/index.ts",
  "dependencies": {
    "@prism/core": "workspace:*",
    "@prism/compiler": "workspace:*",
    "@prism/runtime": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0"
  }
}
JSON

cat > packages/mcp-server/src/server.ts <<'TS'
import type { IR } from "@prism/core";
import type { Store } from "@prism/runtime";
import { checkoutStub } from "@prism/compiler";

// Wires the IR's actions to real handlers over the data store.
// Transport-agnostic: returns a map of toolName -> handler.
export function buildHandlers<T extends { id: string; price?: number; stock?: number }>(
  ir: IR,
  store: Store<T>,
) {
  const entity = ir.entities[0]!.name.toLowerCase();
  return {
    [`search_${entity}`]: async (args: { query?: string }) =>
      store.search(args.query ?? ""),
    [`get_${entity}`]: async (args: { id: string }) =>
      store.get(args.id) ?? { error: "not_found" },
    [`check_${entity}`]: async (args: { id: string }) => {
      const r = store.get(args.id);
      return r ? { id: r.id, available: (r.stock ?? 0) > 0, stock: r.stock ?? 0 } : { error: "not_found" };
    },
    [`purchase_${entity}`]: async (args: { id: string; qty?: number }) => {
      const r = store.get(args.id);
      if (!r) return { error: "not_found" };
      const qty = args.qty ?? 1;
      if ((r.stock ?? 0) < qty) return { error: "insufficient_stock" };
      store.update(r.id, { stock: (r.stock ?? 0) - qty } as Partial<T>);
      return checkoutStub(`ord_${Date.now()}`, (r.price ?? 0) * qty);
    },
  } as Record<string, (args: any) => Promise<unknown>>;
}
TS

cat > packages/mcp-server/src/index.ts <<'TS'
export * from "./server.js";
// NOTE(claude-code): wire these handlers into an McpServer with
// StreamableHTTPServerTransport in the CLI `demo` command. See DAY1_DEMO.md.
TS

# ---------------------------------------------------------------------------
# packages/cli  —  create-prism-app + dev/build/demo
# ---------------------------------------------------------------------------
mkdir -p packages/cli/src/commands
cat > packages/cli/package.json <<'JSON'
{
  "name": "@prism/cli",
  "version": "0.0.1",
  "type": "module",
  "bin": { "prism": "src/index.ts" },
  "dependencies": {
    "@prism/core": "workspace:*",
    "@prism/compiler": "workspace:*",
    "@prism/runtime": "workspace:*",
    "@prism/mcp": "workspace:*"
  }
}
JSON

cat > packages/cli/src/index.ts <<'TS'
#!/usr/bin/env bun
const [cmd, appPath] = process.argv.slice(2);

if (cmd === "demo") {
  console.log("◆ Prism demo");
  console.log("  TODO(claude-code): import the app's IR, compile(), then:");
  console.log("   1) start Next.js dev server (apps/cafe-nube) on :3000");
  console.log("   2) start MCP server (StreamableHTTP) on :3001/mcp");
  console.log("   3) print MCP config block for Claude Desktop");
  console.log(`  app: ${appPath ?? "apps/cafe-nube"}`);
  console.log("  See DAY1_DEMO.md step 4 for the exact wiring prompt.");
} else {
  console.log("prism <demo|build|dev> [appPath]");
}
TS

# ---------------------------------------------------------------------------
# apps/cafe-nube  —  the fake store (single source of truth lives here)
# ---------------------------------------------------------------------------
mkdir -p apps/cafe-nube/prism apps/cafe-nube/data apps/cafe-nube/app/products/\[id\] apps/cafe-nube/public
cat > apps/cafe-nube/package.json <<'JSON'
{
  "name": "cafe-nube",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start" },
  "dependencies": {
    "@prism/core": "workspace:*",
    "@prism/compiler": "workspace:*",
    "@prism/runtime": "workspace:*",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
JSON

cat > apps/cafe-nube/prism/product.prism.ts <<'TS'
import { definePrism, f } from "@prism/core";

// ─────────────────────────────────────────────────────────────────────────
// THE SINGLE SOURCE OF TRUTH for Café Nube.
// Edit a value here → it flows to the page, the JSON-LD, the MCP tool, and
// the checkout. No fact lives twice.
// ─────────────────────────────────────────────────────────────────────────
export const ir = definePrism({
  app: { name: "Café Nube", locale: "es-MX", baseUrl: "http://localhost:3000" },

  entities: {
    Product: {
      schemaOrgType: "Product",
      fields: {
        id:          f.string(),
        name:        f.string().display("title").genui("hero").llm("summary"),
        roast:       f.string().facet().filter(),                 // light / medium / dark
        origin:      f.string().facet().filter().llm("keywords"), // Oaxaca, Chiapas...
        price:       f.money().transactable().richSnippet("Offer"),
        stock:       f.int().live(),                              // real-time, never cached
        weightGrams: f.int(),
        image:       f.image().genui("hero"),
        description: f.text().display("body").llm("summary"),
        rating:      f.float().richSnippet("AggregateRating"),
      },
    },
  },

  actions: {
    search:   { input: { query: "string" }, returns: "Product[]", description: "Buscar cafés por texto, origen o tueste." },
    get:      { input: { id: "string" },     returns: "Product",   description: "Ficha completa de un café." },
    check:    { input: { id: "string" },     returns: "Availability", description: "Disponibilidad y stock en tiempo real." },
    purchase: { input: { id: "string", qty: "int" }, returns: "Order", mutates: true, description: "Comprar uno o más bultos de café." },
  },
});
TS

cat > apps/cafe-nube/data/seed.ts <<'TS'
export interface Product {
  id: string; name: string; roast: string; origin: string;
  price: number; stock: number; weightGrams: number;
  image: string; description: string; rating: number;
}

export const products: Product[] = [
  { id: "oaxaca-altura", name: "Oaxaca Altura", roast: "medium", origin: "Oaxaca", price: 320, stock: 18, weightGrams: 340, image: "/coffee/oaxaca.jpg", description: "Notas de chocolate amargo y naranja. Cultivado a 1,600 msnm en la Sierra Mixe.", rating: 4.7 },
  { id: "chiapas-natural", name: "Chiapas Natural", roast: "light", origin: "Chiapas", price: 365, stock: 9, weightGrams: 340, image: "/coffee/chiapas.jpg", description: "Proceso natural, frutos rojos y panela. Lote de pequeños productores en Jaltenango.", rating: 4.9 },
  { id: "veracruz-oscuro", name: "Veracruz Oscuro", roast: "dark", origin: "Veracruz", price: 290, stock: 24, weightGrams: 340, image: "/coffee/veracruz.jpg", description: "Tueste oscuro intenso, cacao y caramelo. Ideal para espresso.", rating: 4.5 },
  { id: "nayarit-honey", name: "Nayarit Honey", roast: "medium", origin: "Nayarit", price: 410, stock: 0, weightGrams: 250, image: "/coffee/nayarit.jpg", description: "Proceso honey, miel de agave y durazno. Edición limitada.", rating: 5.0 },
];
TS

cat > apps/cafe-nube/public/llms.txt <<'TXT'
# Café Nube
> Generated by Prism at build time. Run `bun run build` to regenerate from product.prism.ts.
TXT

cat > apps/cafe-nube/next.config.ts <<'TS'
import type { NextConfig } from "next";
const config: NextConfig = { transpilePackages: ["@prism/core", "@prism/compiler", "@prism/runtime"] };
export default config;
TS

cat > apps/cafe-nube/app/page.tsx <<'TSX'
// TODO(claude-code): render the catalog FROM THE IR.
// import { ir } from "../prism/product.prism";
// import { products } from "../data/seed";
// import { compile } from "@prism/compiler";
// Use compile(ir).ui to know which field is title/price/image, then map products.
// Inject compile(ir).jsonLd("Product", p) as a <script type="application/ld+json"> per card.
export default function Home() {
  return <main style={{ padding: 40, fontFamily: "system-ui" }}>
    <h1>Café Nube</h1>
    <p>TODO: render from IR. See DAY1_DEMO.md step 2.</p>
  </main>;
}
TSX

# ---------------------------------------------------------------------------
# docs
# ---------------------------------------------------------------------------
mkdir -p docs
cat > docs/ARCHITECTURE.md <<'MD'
# Architecture
See root `CLAUDE.md` for the canonical description. Key invariant: schema → IR → emitters.
The IR (`packages/core/src/ir.ts`) is the contract. A future `.prism` DSL compiles down to it.
MD

echo "✔ Skeleton created. Next: cd $ROOT && bun install"

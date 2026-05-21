# CLAUDE.md — Prism Framework

> **You are building Prism**: the framework that turns a single business schema into four surfaces simultaneously — a human UI, an agent API (MCP), a knowledge layer (structured data), and a monetization layer (agent commerce + bidstream).
>
> **The thesis**: WordPress was for readers. Shopify was for buyers. Prism is for AI agents. In a world where 93% of searches are zero-click and agents transact on users' behalf, a website must be agent-native from line zero — not retrofitted.

---

## Prime directive

A developer defines their business **once** in a `*.prism.ts` file. The Prism compiler emits **all four surfaces** from that single source of truth. Never make the developer maintain the same fact in two places. If a product's price lives in the schema, it must flow automatically to: the rendered page, the JSON-LD, the MCP `get_product` tool, and the checkout — with zero duplication.

This is the **one-schema-every-surface** invariant. Every architectural decision must preserve it.

---

## Day-1 goal (what we are building first)

A working **end-to-end demo** with one fake store: **"Café Nube"** (a Mexican specialty coffee roaster).

`bun run demo` must, in one command:
1. Read `apps/cafe-nube/prism/product.prism.ts`
2. Compile it into the four surfaces
3. Serve the **human store** at `http://localhost:3000` (browse + buy coffee)
4. Serve the **MCP server** at `http://localhost:3001/mcp` (an agent can `search_products`, `get_product`, `check_availability`, `purchase`)
5. Expose **`/llms.txt`** and **JSON-LD** on every page
6. Print a **ready-to-paste MCP config** so the user can connect Claude Desktop and literally tell an agent "buy me a bag of the Oaxaca blend"

The demo is the proof. If an agent can complete a purchase end-to-end from natural language, the thesis is validated.

---

## Architecture (decided — do not re-litigate without flagging)

### Stack
- **Language**: TypeScript everywhere. No Go, no Python for now. (ARTF/Go arrives in Phase 3; not needed for the demo.)
- **Runtime / package manager**: **Bun** (fast, native TS, built-in test runner).
- **Monorepo**: **Turborepo** + Bun workspaces.
- **Human UI**: **Next.js 15** (App Router, RSC, ISR).
- **Agent API**: **`@modelcontextprotocol/sdk`** (official TS MCP SDK), Streamable HTTP transport.
- **Data layer (demo)**: in-memory store seeded from `data/seed.ts`. (SQLite/Postgres is a later swap behind the `runtime` interface.)
- **Validation**: **Zod** — it backs the schema annotations and gives runtime + compile-time safety.

### The schema model (THE core idea)
The developer writes a `*.prism.ts` using the `definePrism()` builder. Fields carry **annotations** that tell each emitter what to do:

| Annotation | Meaning | Affects surface |
|---|---|---|
| `display('title' \| 'subtitle' \| 'body')` | Role in human UI | Human UI |
| `genui('hero' \| 'card' \| 'detail')` | How GenUI/Google renders it | Human UI + Knowledge |
| `transactable` | Part of a purchase (price, qty) | Monetization |
| `live` | Real-time value (stock) — never cached | Agent API + Human UI |
| `llm('summary' \| 'keywords')` | Fed to LLMs for citation | Knowledge |
| `facet` / `filter` | Searchable/filterable dimension | Agent API + Human UI |
| `rich_snippet` | Maps to Schema.org rich result | Knowledge |
| `local_business` | Geo/location entity | Knowledge |
| `richSnippetType('Product' \| 'Offer' \| ...)` | Explicit Schema.org @type | Knowledge |

`definePrism()` produces a typed **IR (Intermediate Representation)** — a plain JSON object describing entities, fields, annotations, and actions. **The IR is the contract between the schema and every emitter.** A future custom `.prism` DSL will compile *down to this same IR*, so emitters never need to change.

### The compile pipeline
```
*.prism.ts  ──definePrism()──▶  IR (JSON)  ──emitters──▶  4 surfaces
                                              ├─ human-ui.ts     → Next.js routes + components + JSON-LD injection
                                              ├─ agent-api.ts    → MCP tool defs + OpenAPI spec
                                              ├─ knowledge.ts    → JSON-LD docs, llms.txt, entity-graph.json
                                              └─ monetization.ts → checkout handlers + ARTF signal stub
```

### Actions = the verbs agents can call
The schema declares `actions` (search, get, check, purchase). Each action becomes simultaneously: an MCP tool, a REST endpoint (OpenAPI), and — where it mutates — a checkout/commerce flow. **Define an action once; it shows up everywhere an agent can reach it.**

---

## Repository layout

```
prism/
├── CLAUDE.md                  ← you are here
├── package.json               ← bun workspaces root
├── turbo.json
├── tsconfig.base.json
├── bunfig.toml
│
├── packages/
│   ├── core/                  @prism/core      — definePrism() builder + IR types + annotations
│   ├── compiler/              @prism/compiler  — IR → 4 surfaces (emitters/)
│   ├── runtime/               @prism/runtime   — data store + search (swap-able backend)
│   ├── mcp-server/            @prism/mcp       — runtime MCP server that reads the IR
│   └── cli/                   @prism/cli       — create-prism-app, prism dev/build/demo
│
├── apps/
│   └── cafe-nube/             the fake demo store
│       ├── prism/product.prism.ts   ← SINGLE SOURCE OF TRUTH
│       ├── data/seed.ts             ← fake coffee catalog
│       ├── app/                     ← Next.js 15 (some generated, some custom)
│       └── public/llms.txt          ← generated artifact
│
└── docs/
    ├── ARCHITECTURE.md
    ├── PRISM_SCHEMA.md
    └── DAY1_DEMO.md           ← the runbook
```

---

## Working conventions for Claude Code

1. **IR is sacred.** Never let an emitter reach around the IR to read the `.prism.ts` directly. Schema → IR → emitter. Always.
2. **No fact lives twice.** If you find yourself hardcoding a price, a field name, or a Schema.org type in an emitter, stop — it belongs in the IR.
3. **Run, don't simulate.** After any change, run `bun run demo` (or the relevant `turbo` task) and verify the four surfaces actually work. Use the MCP Inspector (`bunx @modelcontextprotocol/inspector`) to test tools.
4. **Type-safe end to end.** The IR is typed. MCP tool inputs/outputs derive from Zod schemas in the IR. No `any` at surface boundaries.
5. **Demo-first.** When in doubt, prioritize making the Café Nube demo work over generality. Generalize only after the happy path is green.
6. **Small commits, named by surface.** e.g. `feat(human-ui): render product cards from IR`, `feat(agent-api): emit purchase MCP tool`.
7. **Stubs are explicit.** Anything not built for the demo (real Stripe, real ARTF container) must be a clearly-labeled stub returning realistic mock data, with a `// TODO(phase-N)` comment.

## Commands
| Command | Does |
|---|---|
| `bun install` | install workspace deps |
| `bun run demo` | compile + serve human UI (:3000) + MCP server (:3001) |
| `bun run build` | run all emitters, write artifacts to `.prism/` |
| `turbo run dev` | dev mode all packages |
| `bunx @modelcontextprotocol/inspector` | test the MCP server interactively |

## Definition of done for Day 1
- [ ] `bun run demo` boots both servers with no errors
- [ ] Visiting `:3000` shows the Café Nube catalog rendered **from the IR**
- [ ] Page source contains valid JSON-LD `Product` markup
- [ ] `:3000/llms.txt` returns a curated, valid llms.txt
- [ ] MCP Inspector connects to `:3001/mcp` and lists 4 tools
- [ ] An agent can call `search_products` → `get_product` → `purchase` and receive a confirmed order
- [ ] Changing the price in `product.prism.ts` updates the page, the JSON-LD, AND the MCP `get_product` output — with no other edits

---

## Out of scope for Day 1 (do not build yet)
- Real payment processing (stub Stripe)
- Real ARTF container / OpenRTB (stub signal emitter)
- The custom `.prism` DSL parser (we use `.prism.ts` builder; design the IR so the DSL can target it later)
- Multi-tenant hosting / schema registry / auth beyond a demo API key
- Crawler that ingests existing sites (Phase 0 of the product; the demo authors the schema by hand)

If a request pushes into out-of-scope territory, build a labeled stub and note the phase it truly belongs to.

# Prism

> **One schema. Every surface.**

Prism turns a single business schema into four surfaces simultaneously: a human UI, an agent API (MCP), a knowledge layer (JSON-LD + `llms.txt`), and a monetization flow. WordPress was for readers; Shopify was for buyers; **Prism is for AI agents** — agent-native from line zero.

## The four surfaces, from one file

```
                    ┌─────────────────────────────┐
                    │   product.prism.ts          │
                    │   (single source of truth)  │
                    └──────────────┬──────────────┘
                                   │
                            definePrism()
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │            IR               │
                    │   (intermediate JSON)       │
                    └──────────────┬──────────────┘
                                   │
                              compile(ir)
                                   │
            ┌──────────┬───────────┼───────────┬──────────┐
            ▼          ▼           ▼           ▼          ▼
       ┌─────────┐┌─────────┐┌──────────┐┌──────────┐
       │ Human   ││ Agent   ││Knowledge ││Monetiza- │
       │   UI    ││  API    ││          ││ tion     │
       │         ││         ││          ││          │
       │Next.js  ││ MCP     ││JSON-LD   ││Checkout  │
       │ + RSC   ││ tools + ││ llms.txt ││ ARTF     │
       │ + ISR   ││ OpenAPI ││ entity-  ││ signal   │
       │         ││         ││ graph    ││          │
       └─────────┘└─────────┘└──────────┘└──────────┘
         :3000      :3001     /llms.txt   stub
```

Change a price in the schema, and it propagates automatically to the rendered card, the JSON-LD `<script>`, the MCP `get_product` tool, and the checkout — with zero duplicated facts.

## Quickstart

```bash
git clone https://github.com/afelipeg/prisma.git
cd prisma
bun install
bun run demo
```

What you'll see:

```
🫧  Prism — starting demo

  ✓ ir-manifest.json generated
  ✓ MCP server started
  MCP server → http://localhost:3001/mcp
  Health     → http://localhost:3001/health
  Starting Next.js dev server on :3000 …

┌─────────────────────────────────────────────────┐
│  Prism demo is running                          │
│                                                 │
│  Human store  →  http://localhost:3000          │
│  MCP server   →  http://localhost:3001/mcp      │
│  llms.txt     →  http://localhost:3000/llms.txt │
└─────────────────────────────────────────────────┘
```

Open `http://localhost:3000` — Café Nube, a fictional Mexican specialty-coffee roaster, with four single-origin beans. View source on any product page: there's the JSON-LD `Product` markup. `curl http://localhost:3000/llms.txt` returns a curated, agent-readable catalog.

If you only need the MCP side (e.g. you're already running Next.js elsewhere): `bun run mcp`.

## Connect Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "cafe-nube": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3001/mcp", "--transport", "http-only"]
    }
  }
}
```

> On macOS Claude Desktop launches child processes with a minimal `PATH` and may not find `npx` from `nvm`. If the connector fails, swap `"npx"` for the absolute path: `/Users/you/.nvm/versions/node/<VER>/bin/npx`.

Restart Claude Desktop. You should see four tools under **cafe-nube**: `search_products`, `get_product`, `check_availability`, `purchase`.

## The money shot

Open a fresh Claude Desktop conversation and say:

> **"Busca en Café Nube los cafés de Oaxaca, dame los detalles del más oscuro, verifica disponibilidad de 1 bolsa, y cómprala a nombre de `agent@cafenube.test`."**

Claude will chain `search_products → get_product → check_availability → purchase` and return a confirmed order. The in-memory stock decrements in response. That's an AI agent transacting on behalf of a user, end-to-end, against a website that *does not have a checkout button* — only a schema.

## Architecture

A developer writes `apps/cafe-nube/prism/product.prism.ts` once. The `@prism/core` builder turns it into a typed IR. The `@prism/compiler` package walks the IR and produces all four surface artifacts; emitters read **only** the IR, never the source `.prism.ts`. The Next.js app and the MCP server both consume `compile(ir)` at module level — there is no codegen step to keep in sync.

A future custom `.prism` DSL parser will compile down to the same IR, so emitters never need to change.

For the full thesis, architectural decisions, and the schema-annotation reference, see [CLAUDE.md](./CLAUDE.md). For the original Day-1 runbook, see [DAY1_DEMO.md](./DAY1_DEMO.md).

## Repository layout

```
prism/
├── packages/
│   ├── core/         @prism/core      definePrism() + IR types + annotations
│   ├── compiler/     @prism/compiler  IR → 4 emitters
│   ├── runtime/      @prism/runtime   PrismStore (in-memory for Day 1)
│   ├── mcp-server/   @prism/mcp       Streamable HTTP MCP server
│   └── cli/          @prism/cli       prism demo, prism mcp
├── apps/
│   └── cafe-nube/    the demo store (Next.js 15)
└── docs/
    └── DAY1_DEMO.md  runbook
```

## Stack

TypeScript everywhere. **Bun** for runtime + workspaces + tests, **Turborepo** for task orchestration, **Next.js 15** App Router + RSC for the human UI, the **official `@modelcontextprotocol/sdk`** for the agent API, **Zod** for schemas and annotations.

## Tests

```bash
bun test
```

Two suites covering the contract the four emitters depend on:

- `packages/core/src/__tests__/ir.test.ts` — IR shape (entity, action count, annotations on `stock`/`price`/`name`).
- `packages/compiler/src/__tests__/emitters.test.ts` — emitter output (`jsonLd` Schema.org projection, `llms` catalog rendering, `mcpTools` count + shape, `ui` field-role discovery).

## License

MIT

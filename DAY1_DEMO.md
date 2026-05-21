# DAY 1 — Runbook for Claude Code

This is your hour-by-hour script for tomorrow. Each **PROMPT** block is meant to be
pasted into Claude Code (`claude` in your terminal) verbatim. They build on each other.
Total: ~4–6 focused hours to a working end-to-end demo.

---

## 0 · Setup (15 min, you do this manually)

```bash
# install bun if needed
curl -fsSL https://bun.sh/install | bash

# scaffold the repo
bash bootstrap.sh prism
cd prism

# the CLAUDE.md is already at the repo root — Claude Code reads it automatically
bun install        # links workspaces, pulls next/react/mcp-sdk/zod

# open Claude Code in the repo
claude
```

> ✅ `CLAUDE.md` at the root is your context anchor. Claude Code loads it on every session.
> Keep it open; refine it as the architecture evolves.

---

## 1 · Verify the IR compiles (10 min)

**PROMPT 1**
```
Read CLAUDE.md and docs/ARCHITECTURE.md. Then verify the @prism/core package
type-checks under strict mode (bun run typecheck or tsc --noEmit in packages/core).
Fix any type errors. Then write a quick bun test in packages/core that imports
`ir` from apps/cafe-nube/prism/product.prism.ts and asserts: 1 entity named
"Product", 4 actions, and that the `stock` field has annotations.live === true.
Run it and show me green.
```

---

## 2 · Human UI surface — render FROM the IR (90 min)

**PROMPT 2**
```
Build the Human UI surface for apps/cafe-nube. Requirements:
- app/page.tsx: import { ir } from ../prism/product.prism, { products } from ../data/seed,
  and compile() from @prism/compiler. Use compile(ir).ui to discover which field is
  title/price/image/body, then render a responsive product grid. Do NOT hardcode field names.
- For each product, inject <script type="application/ld+json"> using compile(ir).jsonLd("Product", p).
- app/products/[id]/page.tsx: detail view, also IR-driven, also with JSON-LD.
- Add a route handler app/llms.txt/route.ts that returns compile(ir).llms(products) as text/plain.
- Style it clean and warm (it's a coffee brand) — but keep it simple, no UI libs.
Run `next dev`, confirm :3000 renders the 4 coffees and view-source shows valid JSON-LD.
Prove the invariant: change Oaxaca's price in product.prism.ts and show the page updates.
```

---

## 3 · Agent API surface — the MCP server (90 min)

**PROMPT 3**
```
Stand up the MCP server using @modelcontextprotocol/sdk (Streamable HTTP transport).
- In packages/mcp-server, create a runnable server that:
  * imports `ir` from the cafe-nube schema and `products` from seed
  * builds a memoryStore(products) from @prism/runtime
  * gets handlers via buildHandlers(ir, store)
  * registers each handler as an MCP tool, deriving inputSchema from compile(ir).tools
  * serves on http://localhost:3001/mcp
- The four tools must be: search_product, get_product, check_product, purchase_product.
- purchase_product must decrement live stock and return the checkout stub.
Then run it and test with `bunx @modelcontextprotocol/inspector`. Walk me through
calling search_product("oaxaca") -> get_product -> purchase_product and show the
order confirmation + that stock decreased.
```

---

## 4 · Wire `bun run demo` — one command, both servers (45 min)

**PROMPT 4**
```
Implement the CLI `demo` command in packages/cli/src/index.ts so `bun run demo`:
1. boots the cafe-nube Next.js dev server on :3000 (spawn)
2. boots the MCP server on :3001/mcp (spawn)
3. waits for both to be healthy, then prints a copy-paste MCP config block for
   Claude Desktop pointing at http://localhost:3001/mcp, plus the URLs for the
   store and /llms.txt.
Handle Ctrl-C to kill both children. Run it and show me the full startup output.
```

---

## 5 · The money shot — agent buys coffee (30 min)

**PROMPT 5**
```
Help me connect Claude Desktop to the running MCP server using the config you printed.
Then I'll tell the agent: "compra una bolsa del Oaxaca Altura". Trace what happens:
which tools fire, in what order, and confirm an order is created and stock drops.
If anything fails, debug it. This is the Day-1 definition of done.
```

> 🎯 **When an agent completes that purchase from natural language, Day 1 is done and the thesis is proven.**

---

## 6 · Regenerate artifacts + commit (20 min)

**PROMPT 6**
```
Implement `bun run build` to run all emitters and write artifacts to .prism/ and
apps/cafe-nube/public/llms.txt (overwriting the placeholder). Then set up clean
git history: init, .gitignore is present, and make atomic commits grouped by surface
(core, compiler, human-ui, agent-api, cli). Show me the log.
```

---

## Definition of Done (paste into Claude Code to self-check)

**PROMPT — DoD check**
```
Verify every item in the CLAUDE.md "Definition of done for Day 1" checklist against
the actual running system. For each, show the concrete evidence (command output,
file contents, or screenshot description). List anything not yet satisfied.
```

---

## Tomorrow's stretch goals (Phase 0+ — only if Day 1 lands early)
- `create-prism-app` scaffolder so a new store starts from a template
- Swap memoryStore → SQLite behind the @prism/runtime interface (zero emitter changes)
- Begin the crawler (Phase 0): ingest a real Shopify URL → emit a draft product.prism.ts
- Design the `.prism` DSL grammar that compiles down to the existing IR

## If you get stuck
- The IR contract is in `packages/core/src/ir.ts` — when confused, anchor there.
- MCP SDK docs: search "modelcontextprotocol typescript sdk streamable http".
- Tell Claude Code: *"re-read CLAUDE.md, we may be violating one-schema-every-surface"* —
  that's the smell test for most architectural drift.

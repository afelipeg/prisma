import { resolve } from 'node:path';
import { compile } from '@prism/compiler';
import { MemoryStore } from '@prism/runtime';
import { startMcpServer } from '@prism/mcp';
import { writeFileSync } from 'node:fs';

const APP_DIR = resolve(import.meta.dir, '../../../apps/cafe-nube');

export async function runDemo(): Promise<void> {
  console.log('\n🫧  Prism — starting demo\n');

  // 1. Load the single source of truth
  const { productSchema } = await import(
    `${APP_DIR}/prism/product.prism.ts`
  );
  const ir = productSchema;

  // 2. Load seed data
  const { seed } = await import(`${APP_DIR}/data/seed.ts`);

  // 3. Compile all four surfaces from the IR
  const prism = compile(ir);

  // 4. Write IR manifest for tooling/inspection (Next.js consumes the IR directly).
  writeFileSync(
    `${APP_DIR}/public/ir-manifest.json`,
    JSON.stringify({ ui: prism.ui, mcpTools: prism.mcpTools }, null, 2),
    'utf8'
  );
  console.log('  ✓ ir-manifest.json generated');

  // 7. Start MCP server (port 3001)
  const store = new MemoryStore(seed);
  await startMcpServer({ ir, store, port: 3001 });
  console.log('  ✓ MCP server started');

  // 8. Start Next.js dev server (port 3000)
  console.log('  Starting Next.js dev server on :3000 …');
  const nextProcess = Bun.spawn(
    ['bunx', 'next', 'dev', '--port', '3000'],
    {
      cwd: APP_DIR,
      stdout: 'inherit',
      stderr: 'inherit',
    }
  );

  console.log(`
┌─────────────────────────────────────────────────┐
│  Prism demo is running                          │
│                                                 │
│  Human store  →  http://localhost:3000          │
│  MCP server   →  http://localhost:3001/mcp      │
│  llms.txt     →  http://localhost:3000/llms.txt │
│                                                 │
│  MCP Inspector:                                 │
│  bunx @modelcontextprotocol/inspector           │
│                                                 │
│  Claude Desktop config:                         │
│  {                                              │
│    "mcpServers": {                              │
│      "cafe-nube": {                             │
│        "url": "http://localhost:3001/mcp"       │
│      }                                          │
│    }                                            │
│  }                                              │
└─────────────────────────────────────────────────┘
`);

  // Keep alive
  await new Promise(() => {});
}

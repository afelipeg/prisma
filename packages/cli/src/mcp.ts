import { resolve } from 'node:path';
import { MemoryStore } from '@prism/runtime';
import { startMcpServer } from '@prism/mcp';

const APP_DIR = resolve(import.meta.dir, '../../../apps/cafe-nube');

export async function runMcp(port = 3001): Promise<void> {
  console.log('\n🫧  Prism — MCP server only\n');

  const { productSchema } = await import(`${APP_DIR}/prism/product.prism.ts`);
  const { seed } = await import(`${APP_DIR}/data/seed.ts`);

  const store = new MemoryStore(seed);
  await startMcpServer({ ir: productSchema, store, port });

  console.log(`
┌─────────────────────────────────────────────────┐
│  Prism MCP server is running                    │
│                                                 │
│  Endpoint   →  http://localhost:${port}/mcp        │
│  Health     →  http://localhost:${port}/health     │
│                                                 │
│  Inspect:                                       │
│  bunx @modelcontextprotocol/inspector           │
│                                                 │
│  Claude Desktop (stdio bridge):                 │
│  {                                              │
│    "mcpServers": {                              │
│      "cafe-nube": {                             │
│        "command": "npx",                        │
│        "args": [                                │
│          "-y", "mcp-remote",                    │
│          "http://localhost:${port}/mcp"            │
│        ]                                        │
│      }                                          │
│    }                                            │
│  }                                              │
└─────────────────────────────────────────────────┘
`);

  await new Promise(() => {});
}

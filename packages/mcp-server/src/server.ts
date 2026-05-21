import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { PrismIR } from '@prism/core';
import type { PrismStore } from '@prism/runtime';
import { buildHandlers } from './build-handlers.js';
import { z } from 'zod';

export interface McpServerOptions {
  ir: PrismIR;
  store: PrismStore<Record<string, unknown>>;
  port?: number;
}

export async function startMcpServer({
  ir,
  store,
  port = 3001,
}: McpServerOptions): Promise<void> {
  const handlers = buildHandlers(ir, store);

  // Stateless mode: each MCP request needs its own McpServer + transport.
  // (The Protocol class refuses to be reconnected, and the transport refuses
  // to be reused.) The IR + handlers (shared state) are captured in closure.
  const buildServer = (): McpServer => {
    const server = new McpServer({
      name: ir.meta.businessName ?? ir.entity,
      version: '1.0.0',
    });

    for (const action of ir.actions) {
      const handler = handlers.get(action.name);
      if (!handler) continue;

      const shape = (action.inputSchema as z.ZodObject<z.ZodRawShape>).shape ?? {};

      server.tool(
        action.name,
        action.description,
        shape,
        async (input: unknown) => {
          try {
            const result = await handler(input);
            return {
              content: [
                { type: 'text' as const, text: JSON.stringify(result, null, 2) },
              ],
            };
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
              content: [{ type: 'text' as const, text: `Error: ${message}` }],
              isError: true,
            };
          }
        }
      );
    }

    return server;
  };

  Bun.serve({
    port,
    async fetch(req: Request) {
      const url = new URL(req.url);
      if (url.pathname === '/mcp') {
        const server = buildServer();
        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
        await server.connect(transport);
        return transport.handleRequest(req);
      }
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ ok: true, entity: ir.entity }), {
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    },
  });

  console.log(`  MCP server → http://localhost:${port}/mcp`);
  console.log(`  Health     → http://localhost:${port}/health`);
}

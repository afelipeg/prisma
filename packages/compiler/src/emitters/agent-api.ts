import type { PrismIR, PrismAction } from '@prism/core';
import { zodToJsonSchema } from '../utils/zod-to-json-schema.js';

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: object;
}

export interface AgentApiArtifacts {
  mcpTools: McpToolDef[];
  openApiSpec: object;
}

/** Emits MCP tool definitions and an OpenAPI spec from the IR actions. */
export function emitAgentApi(ir: PrismIR): AgentApiArtifacts {
  const mcpTools: McpToolDef[] = ir.actions.map((action) => ({
    name: action.name,
    description: action.description,
    inputSchema: zodToJsonSchema(action.inputSchema),
  }));

  const paths: Record<string, unknown> = {};
  for (const action of ir.actions) {
    paths[`/actions/${action.name}`] = {
      post: {
        operationId: action.name,
        summary: action.description,
        requestBody: {
          content: {
            'application/json': {
              schema: zodToJsonSchema(action.inputSchema),
            },
          },
        },
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: zodToJsonSchema(action.outputSchema),
              },
            },
          },
        },
      },
    };
  }

  const openApiSpec = {
    openapi: '3.1.0',
    info: {
      title: `${ir.meta.businessName ?? ir.entity} Agent API`,
      version: '1.0.0',
      description: ir.description,
    },
    servers: [{ url: 'http://localhost:3001' }],
    paths,
  };

  return { mcpTools, openApiSpec };
}

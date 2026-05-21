import { definePrism, field, action } from '@prism/core';
import { z } from 'zod';

/**
 * SINGLE SOURCE OF TRUTH for Café Nube.
 * Changing a field here propagates automatically to:
 *   - the rendered Next.js page
 *   - the JSON-LD <script> on every product page
 *   - the MCP tools an agent calls
 *   - the llms.txt knowledge layer
 */
export const productSchema = definePrism({
  entity: 'Product',
  description:
    'Specialty coffee products from Café Nube — a Mexican single-origin roastery',
  meta: {
    businessName: 'Café Nube',
    businessUrl: 'http://localhost:3000',
    schemaOrgType: 'Product',
    locale: 'es-MX',
  },
  fields: {
    id: field(z.string()).build(),

    name: field(z.string())
      .display('title')
      .genui('hero')
      .llm('summary')
      .rich_snippet()
      .build(),

    origin: field(z.string())
      .display('subtitle')
      .facet()
      .filter()
      .rich_snippet()
      .build(),

    description: field(z.string())
      .display('body')
      .llm('summary')
      .genui('detail')
      .build(),

    price: field(z.number())
      .transactable()
      .rich_snippet()
      .build(),

    roast: field(z.enum(['light', 'medium', 'dark']))
      .genui('card')
      .facet()
      .filter()
      .build(),

    stock: field(z.number())
      .live()
      .transactable()
      .build(),

    tags: field(z.array(z.string()))
      .llm('keywords')
      .build(),

    imageUrl: field(z.string())
      .genui('hero')
      .build(),

    weightGrams: field(z.number())
      .genui('card')
      .build(),

    rating: field(z.number().min(0).max(5))
      .rating()
      .genui('card')
      .build(),
  },

  actions: {
    search_products: action({
      description:
        'Search Café Nube products by text query, origin region, or roast level',
      input: z.object({
        query: z.string().optional().describe('Free-text search'),
        origin: z.string().optional().describe('Mexican region, e.g. Oaxaca'),
        roast: z
          .enum(['light', 'medium', 'dark'])
          .optional()
          .describe('Roast level'),
      }),
      output: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          origin: z.string(),
          price: z.number(),
          roast: z.string(),
          stock: z.number(),
          rating: z.number(),
        })
      ),
    }),

    get_product: action({
      description: 'Get full details for a single Café Nube product by ID',
      input: z.object({ id: z.string() }),
      output: z.object({
        id: z.string(),
        name: z.string(),
        origin: z.string(),
        description: z.string(),
        price: z.number(),
        roast: z.string(),
        stock: z.number(),
        tags: z.array(z.string()),
        imageUrl: z.string(),
        weightGrams: z.number(),
        rating: z.number(),
      }),
    }),

    check_availability: action({
      description: 'Check whether a product has sufficient stock',
      input: z.object({
        id: z.string(),
        quantity: z.number().min(1).describe('Number of bags'),
      }),
      output: z.object({
        available: z.boolean(),
        stock: z.number(),
      }),
    }),

    purchase: action({
      description:
        'Purchase one or more bags of a Café Nube coffee. Returns a confirmed order.',
      input: z.object({
        id: z.string(),
        quantity: z.number().min(1),
        customerEmail: z.string().email(),
      }),
      output: z.object({
        orderId: z.string(),
        status: z.string(),
        total: z.number(),
        product: z.string(),
        quantity: z.number(),
        customerEmail: z.string(),
      }),
    }),
  },
});

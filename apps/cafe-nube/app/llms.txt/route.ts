import { compile } from '@prism/compiler';
import { productSchema } from '../../prism/product.prism';
import { seed } from '../../data/seed';

const prism = compile(productSchema);

export function GET() {
  const body = prism.llms(seed as unknown as Record<string, unknown>[]);
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=60',
    },
  });
}

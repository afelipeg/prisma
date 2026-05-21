import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(new URL('http://localhost:3001/mcp'));
const client = new Client({ name: 'inspector-test', version: '1.0.0' });
await client.connect(transport);

function banner(step: string, title: string) {
  console.log(`\n━━━━━ ${step}  ${title} ━━━━━`);
}

// 1) List tools
banner('1)', 'List tools');
const tools = await client.listTools();
console.log(JSON.stringify(tools.tools.map(t => ({ name: t.name, description: t.description })), null, 2));

// 2) search_products query=oaxaca
banner('2)', 'search_products { query: "oaxaca" }');
const search = await client.callTool({ name: 'search_products', arguments: { query: 'oaxaca' } });
console.log((search.content as Array<{ text: string }>)[0].text);
const searchResults = JSON.parse((search.content as Array<{ text: string }>)[0].text) as Array<{ id: string }>;
const firstId = searchResults[0]?.id;
if (!firstId) throw new Error('No product returned from search');
console.log(`→ picked id: ${firstId}`);

// 3) get_product
banner('3)', `get_product { id: "${firstId}" }`);
const got = await client.callTool({ name: 'get_product', arguments: { id: firstId } });
console.log((got.content as Array<{ text: string }>)[0].text);
const product = JSON.parse((got.content as Array<{ text: string }>)[0].text) as { stock: number };
const stockBefore = product.stock;

// 4) check_availability
banner('4)', `check_availability { id: "${firstId}", quantity: 1 }`);
const avail = await client.callTool({ name: 'check_availability', arguments: { id: firstId, quantity: 1 } });
console.log((avail.content as Array<{ text: string }>)[0].text);

// 5) purchase
banner('5)', `purchase { id: "${firstId}", quantity: 1, customerEmail: "agent@cafenube.test" }`);
const purchase = await client.callTool({
  name: 'purchase',
  arguments: { id: firstId, quantity: 1, customerEmail: 'agent@cafenube.test' },
});
console.log((purchase.content as Array<{ text: string }>)[0].text);

// 6) verify stock decremented
banner('6)', 'Verify: get_product again, stock should be N-1');
const after = await client.callTool({ name: 'get_product', arguments: { id: firstId } });
const productAfter = JSON.parse((after.content as Array<{ text: string }>)[0].text) as { stock: number };
console.log(`stock before purchase: ${stockBefore}`);
console.log(`stock after  purchase: ${productAfter.stock}`);
console.log(productAfter.stock === stockBefore - 1 ? '✅ stock decremented by 1' : '❌ stock did NOT decrement correctly');

await client.close();
process.exit(0);

import type { PrismIR, PrismField } from '@prism/core';

export interface KnowledgeArtifacts {
  /** Render Schema.org JSON-LD for a single record. */
  jsonLd: (type: string, data: Record<string, unknown>) => string;
  /** Render the full /llms.txt body given the live catalog. */
  llms: (products: Record<string, unknown>[]) => string;
  /** Static graph snapshot (entity + field + action shape only — no data). */
  entityGraph: object;
}

/** Emits the knowledge-layer artifacts from the IR. */
export function emitKnowledge(ir: PrismIR): KnowledgeArtifacts {
  const baseUrl = ir.meta.businessUrl ?? 'http://localhost:3000';
  const businessName = ir.meta.businessName ?? ir.entity;

  const titleField = ir.fields.find((f) => f.annotations.display === 'title');
  const bodyField = ir.fields.find((f) => f.annotations.display === 'body');
  const imageField = ir.fields.find(
    (f) => f.annotations.genui === 'hero' && f.name !== titleField?.name
  );
  const priceField = ir.fields.find(
    (f) => f.annotations.transactable && f.type === 'number'
  );
  const ratingField = ir.fields.find((f) => f.annotations.rating);
  const stockField = ir.fields.find(
    (f) => f.annotations.live && f.annotations.transactable
  );

  const richFields = ir.fields.filter((f) => f.annotations.rich_snippet);

  function jsonLd(type: string, data: Record<string, unknown>): string {
    const doc: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': type,
    };

    // Project rich_snippet fields into Schema.org keys
    for (const f of richFields) {
      const val = data[f.name];
      if (val === undefined || val === null) continue;
      const key = schemaOrgKey(f);
      if (key) doc[key] = val;
    }

    // Canonical projections — always emit when fields exist
    if (titleField) {
      const val = data[titleField.name];
      if (val !== undefined) doc['name'] = val;
    }
    if (bodyField) {
      const val = data[bodyField.name];
      if (val !== undefined) doc['description'] = val;
    }
    if (imageField) {
      const val = data[imageField.name];
      if (val !== undefined) doc['image'] = val;
    }
    if (priceField) {
      const val = data[priceField.name];
      if (val !== undefined) {
        const stock = stockField ? Number(data[stockField.name] ?? 0) : 1;
        doc['offers'] = {
          '@type': 'Offer',
          price: val,
          priceCurrency: 'MXN',
          availability:
            stock > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
        };
      }
    }
    if (ratingField) {
      const val = data[ratingField.name];
      if (val !== undefined) {
        doc['aggregateRating'] = {
          '@type': 'AggregateRating',
          ratingValue: val,
          bestRating: 5,
          worstRating: 0,
        };
      }
    }

    if (data['id']) {
      doc['url'] = `${baseUrl}/products/${data['id']}`;
    }

    return JSON.stringify(doc, null, 2);
  }

  function llms(products: Record<string, unknown>[]): string {
    const summaryFields = ir.fields.filter((f) => f.annotations.llm === 'summary');
    const keywordFields = ir.fields.filter((f) => f.annotations.llm === 'keywords');

    const lines: string[] = [];
    lines.push(`# ${businessName}`, '');
    lines.push(`> ${ir.description}`, '');
    lines.push('## Entity', '', `- type: ${ir.entity}`, `- url: ${baseUrl}`);
    lines.push('');

    lines.push('## Agent actions', '');
    for (const a of ir.actions) {
      lines.push(`- **${a.name}** — ${a.description}`);
    }
    lines.push('');

    lines.push('## MCP endpoint', '', '- url: http://localhost:3001/mcp', '');

    lines.push('## Catalog', '');
    for (const p of products) {
      const title = titleField ? p[titleField.name] : p['id'];
      const id = p['id'];
      lines.push(`### ${title}`);
      lines.push(`- id: ${id}`);
      lines.push(`- url: ${baseUrl}/products/${id}`);

      if (priceField) lines.push(`- ${priceField.name}: ${p[priceField.name]} MXN`);
      if (ratingField) lines.push(`- ${ratingField.name}: ${p[ratingField.name]} / 5`);
      if (stockField) lines.push(`- ${stockField.name}: ${p[stockField.name]}`);

      for (const f of summaryFields) {
        if (f.name === titleField?.name) continue;
        const val = p[f.name];
        if (val !== undefined) lines.push(`- ${f.name}: ${val}`);
      }
      for (const f of keywordFields) {
        const val = p[f.name];
        if (Array.isArray(val) && val.length > 0) {
          lines.push(`- ${f.name}: ${val.join(', ')}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  const entityGraph = {
    entity: ir.entity,
    description: ir.description,
    fields: ir.fields.map((f) => ({
      name: f.name,
      type: f.type,
      annotations: Object.keys(f.annotations),
    })),
    actions: ir.actions.map((a) => a.name),
    meta: ir.meta,
  };

  return { jsonLd, llms, entityGraph };
}

/** Maps a Prism field to its canonical Schema.org property name. */
function schemaOrgKey(field: PrismField): string | undefined {
  // Explicit override on the field
  if (field.annotations.richSnippetType === 'AggregateRating') return undefined; // handled separately
  if (field.annotations.rating) return undefined; // handled separately

  // Role-based projection
  if (field.annotations.display === 'title') return 'name';
  if (field.annotations.display === 'body') return 'description';
  if (field.annotations.genui === 'hero' && field.type === 'string') return 'image';
  if (field.annotations.transactable && field.type === 'number') return undefined; // handled in offers

  // Conventional field-name → Schema.org property
  const conventional: Record<string, string> = {
    sku: 'sku',
    brand: 'brand',
    origin: 'countryOfOrigin',
    weightGrams: 'weight',
  };
  return conventional[field.name] ?? field.name;
}

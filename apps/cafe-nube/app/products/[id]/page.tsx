import Link from 'next/link';
import { notFound } from 'next/navigation';
import { compile } from '@prism/compiler';
import { productSchema } from '../../../prism/product.prism';
import { seed } from '../../../data/seed';

const prism = compile(productSchema);

export async function generateStaticParams() {
  return seed.map((p) => ({ id: p.id }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = seed.find((p) => p.id === id);
  if (!product) notFound();

  const record = product as unknown as Record<string, unknown>;
  const { ui } = prism;
  const jsonLd = prism.jsonLd('Product', record);

  const titleVal = ui.title ? record[ui.title] : null;
  const subtitleVal = ui.subtitle ? record[ui.subtitle] : null;
  const bodyVal = ui.body ? record[ui.body] : null;
  const imageVal = ui.image ? record[ui.image] : null;
  const priceVal = ui.price ? record[ui.price] : null;
  const stockVal = ui.stock ? Number(record[ui.stock] ?? 0) : 0;
  const ratingVal = ui.rating ? Number(record[ui.rating] ?? 0) : 0;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      <Link href="/" className="back-link">
        ← Volver al catálogo
      </Link>

      <div className="detail-grid">
        <img
          className="detail-image"
          src={String(imageVal ?? '')}
          alt={String(titleVal ?? '')}
        />

        <div>
          {ui.subtitle ? <p className="detail-origin">{String(subtitleVal ?? '')}</p> : null}
          <h1 className="detail-title">{String(titleVal ?? '')}</h1>

          {ui.rating ? (
            <div style={{ marginBottom: '1.25rem' }}>
              <Stars value={ratingVal} />
              <span className="rating-num">
                {ratingVal.toFixed(1)} / 5
              </span>
            </div>
          ) : null}

          {ui.body ? <p className="detail-body">{String(bodyVal ?? '')}</p> : null}

          <div className="chips">
            <span className="chip">Tueste: {product.roast}</span>
            <span className="chip">{product.weightGrams}g</span>
            {product.tags.map((t) => (
              <span className="chip" key={t}>
                {t}
              </span>
            ))}
          </div>

          <div className="buy-card">
            <div className="buy-price">
              ${String(priceVal ?? '')}
              <span className="price-unit"> MXN</span>
            </div>
            <div
              className={
                stockVal === 0
                  ? 'stock-out buy-stock'
                  : stockVal < 20
                    ? 'stock-low buy-stock'
                    : 'stock-ok buy-stock'
              }
            >
              {stockVal > 0
                ? `${stockVal} bolsas disponibles`
                : 'Agotado'}
            </div>
            <button className="buy-button" disabled={stockVal === 0}>
              {stockVal > 0 ? 'Agregar al carrito' : 'Agotado'}
            </button>
          </div>
        </div>
      </div>

      <div className="agent-strip">
        <strong>Agent-ready:</strong> Un agente puede comprar este café por MCP →
        <code>{`purchase(${JSON.stringify({ id: product.id, quantity: 1, customerEmail: 'user@example.com' })})`}</code>
      </div>
    </>
  );
}

function Stars({ value, max = 5 }: { value: number; max?: number }) {
  const rounded = Math.round(value * 2) / 2;
  const full = Math.floor(rounded);
  const half = rounded - full === 0.5;
  const empty = max - full - (half ? 1 : 0);
  return (
    <span className="rating" aria-label={`${value.toFixed(1)} of ${max} stars`}>
      {'★'.repeat(full)}
      {half ? '⯨' : ''}
      {'☆'.repeat(empty)}
    </span>
  );
}

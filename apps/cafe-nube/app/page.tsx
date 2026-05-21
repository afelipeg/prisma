import Link from 'next/link';
import { compile } from '@prism/compiler';
import { productSchema } from '../prism/product.prism';
import { seed } from '../data/seed';

// Compile every surface once at module load — pure function, cheap.
const prism = compile(productSchema);

const ROAST_COLOR: Record<string, string> = {
  light: '#c8a96e',
  medium: '#8b5e3c',
  dark: '#3d1a00',
};

export default function HomePage() {
  const { ui } = prism;

  return (
    <>
      <section className="hero">
        <h1>Nuestros Cafés</h1>
        <p>
          Cada bolsa es de origen único, trazable al municipio. Cómprala tú o
          deja que un agente lo haga por ti vía MCP.
        </p>
      </section>

      <div className="grid">
        {seed.map((product) => {
          const record = product as unknown as Record<string, unknown>;

          // Field names discovered from the IR — never hardcoded.
          const titleVal = ui.title ? record[ui.title] : null;
          const subtitleVal = ui.subtitle ? record[ui.subtitle] : null;
          const imageVal = ui.image ? record[ui.image] : null;
          const priceVal = ui.price ? record[ui.price] : null;
          const stockVal = ui.stock ? Number(record[ui.stock] ?? 0) : 0;
          const ratingVal = ui.rating ? Number(record[ui.rating] ?? 0) : 0;

          // JSON-LD per card — comes from the compiled knowledge surface.
          const jsonLd = prism.jsonLd('Product', record);

          return (
            <Link key={product.id} href={`/products/${product.id}`} className="card">
              <article>
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{ __html: jsonLd }}
                />
                <div
                  className="card-image"
                  style={{ backgroundImage: `url(${String(imageVal ?? '')})` }}
                />
                <div className="card-body">
                  <span
                    className="card-pill"
                    style={{ color: ROAST_COLOR[product.roast] }}
                  >
                    {product.roast}
                  </span>
                  <h2 className="card-title">{String(titleVal ?? '')}</h2>
                  <p className="card-sub">{String(subtitleVal ?? '')}</p>

                  {ui.rating ? (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <Stars value={ratingVal} />
                      <span className="rating-num">{ratingVal.toFixed(1)}</span>
                    </div>
                  ) : null}

                  <div className="card-foot">
                    <span className="price">
                      ${String(priceVal ?? '')}
                      <span className="price-unit"> MXN</span>
                    </span>
                    <span
                      className={
                        stockVal === 0
                          ? 'stock-out'
                          : stockVal < 20
                            ? 'stock-low'
                            : 'stock-ok'
                      }
                    >
                      {stockVal > 0 ? `${stockVal} en stock` : 'Agotado'}
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
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

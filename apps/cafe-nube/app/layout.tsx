import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Café Nube — Specialty Coffee from Mexico',
  description:
    'Single-origin Mexican specialty coffee, roasted to order. Browse our catalog or let an AI agent buy for you.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <header className="site-header">
          <span className="mark" aria-hidden="true" />
          <span className="brand">Café Nube</span>
          <span className="tag">Specialty Coffee · México</span>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}

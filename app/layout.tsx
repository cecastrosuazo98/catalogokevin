import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UrbanCrown — Ropa Gucci Chile',
  description: 'Catálogo oficial UrbanCrown. Ropa, fragancias y accesorios Gucci originales con envío a todo Chile.',
  openGraph: {
    title: 'UrbanCrown — Ropa Gucci Chile',
    description: 'Productos originales Gucci · Envíos a todo Chile',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

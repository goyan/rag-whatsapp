import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RAG WhatsApp',
  description: 'Query your WhatsApp conversations with AI',
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌿</text></svg>',
        type: 'image/svg+xml',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <head>
        {/* Google Fonts - Fraunces for display, Atkinson Hyperlegible for body */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {/* Decorative gradient orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[var(--greenhouse-300)] opacity-40 blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full bg-[var(--earth-400)] opacity-30 blur-3xl" />
          <div className="absolute -bottom-40 right-1/3 w-72 h-72 rounded-full bg-[var(--greenhouse-200)] opacity-40 blur-3xl" />
        </div>
        {children}
      </body>
    </html>
  );
}

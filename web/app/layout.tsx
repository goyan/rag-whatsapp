import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RAG WhatsApp',
  description: 'Query your WhatsApp conversations with AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {children}
      </body>
    </html>
  );
}

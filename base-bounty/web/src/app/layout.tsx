import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cogito — Collective Intelligence',
  description: 'Global knowledge graph state of all ERC-8004 registered Cogito nodes',
};

const NAV_ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/graph', label: 'Knowledge Graph' },
  { href: '/frontier', label: 'Frontier Map' },
  { href: '/economics', label: 'Economics' },
  { href: '/transactions', label: 'Transactions' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <nav className="border-b border-gray-800 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-cogito-blue">
              Cogito
            </Link>
            <div className="flex gap-6">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}

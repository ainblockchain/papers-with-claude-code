import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cogito Node — Self-Sustaining Knowledge Agent on Base',
  description: 'Autonomous agent that reads research papers, builds a global knowledge graph, and earns USDC via x402 micropayments on Base',
};

const NAV_ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/graph', label: 'Knowledge Graph' },
  { href: '/frontier', label: 'Frontier' },
  { href: '/economics', label: 'Sustainability' },
  { href: '/transactions', label: 'Base Txs' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <nav className="border-b border-gray-800 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-cogito-blue">Cogito</span>
              <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">Base Bounty</span>
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
        <footer className="border-t border-gray-800 px-6 py-4 mt-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-500">
            <span>papers-with-claudecode / Cogito Node</span>
            <div className="flex gap-4">
              <a href="https://github.com/ainblockchain/papers-with-claudecode" target="_blank" rel="noopener noreferrer"
                className="hover:text-gray-300">GitHub</a>
              <a href="https://basescan.org/address/0xA7b9a0959451aeF731141a9e6FFcC619DeB563bF" target="_blank" rel="noopener noreferrer"
                className="hover:text-gray-300">BaseScan</a>
              <a href="https://devnet-api.ainetwork.ai" target="_blank" rel="noopener noreferrer"
                className="hover:text-gray-300">AIN Devnet</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

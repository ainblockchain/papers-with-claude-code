'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';

// Pages that should NOT show the global header (they manage their own layout)
const NO_HEADER_ROUTES = ['/', '/login', '/learn'];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showHeader = !NO_HEADER_ROUTES.some((route) => pathname?.startsWith(route));

  return (
    <>
      {showHeader && <Header />}
      {children}
    </>
  );
}

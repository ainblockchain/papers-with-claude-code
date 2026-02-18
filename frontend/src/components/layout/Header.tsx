'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Compass, LayoutDashboard, Map, Upload, Github, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/village', label: 'Village', icon: Map },
  { href: '/publish', label: 'Publish', icon: Upload },
];

export function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const { isMobileMenuOpen, setMobileMenuOpen } = useUIStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center px-4">
        {/* Logo */}
        <Link href="/explore" className="flex items-center gap-2 mr-8">
          <BookOpen className="h-6 w-6 text-[#FF9D00]" />
          <span className="font-bold text-lg hidden sm:inline">Papers LMS</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm rounded-md transition-colors',
                pathname === item.href || pathname?.startsWith(item.href + '/')
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Auth Area */}
        <div className="hidden md:flex items-center gap-2">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#FF9D00] flex items-center justify-center text-white text-sm font-medium">
                {user.username[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium">{user.username}</span>
            </div>
          ) : (
            <Link href="/login">
              <Button size="sm" className="bg-[#24292e] hover:bg-[#24292e]/90 text-white">
                <Github className="h-4 w-4 mr-1.5" />
                Sign in with GitHub
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-white px-4 py-3">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm rounded-md',
                  pathname === item.href
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          {!isAuthenticated && (
            <Link href="/login" className="block mt-2">
              <Button size="sm" className="w-full bg-[#24292e] text-white">
                <Github className="h-4 w-4 mr-1.5" />
                Sign in with GitHub
              </Button>
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

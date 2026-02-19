'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Upload, Settings, LogOut, Map, List } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'New Export', icon: Upload },
  { href: '/skus', label: 'SKU Review', icon: List },
  { href: '/admin/marketplaces', label: 'Marketplaces', icon: Settings },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="h-full w-56 bg-white border-r flex flex-col py-6 px-3 gap-1">
      <div className="px-3 mb-6">
        <div className="flex items-center gap-2">
          <Map className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">CatalogMapper</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <span
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </span>
          </Link>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-3 text-muted-foreground"
        onClick={handleSignOut}
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </nav>
  );
}

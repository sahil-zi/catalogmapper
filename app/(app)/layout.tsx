export const dynamic = 'force-dynamic';

import { Nav } from '@/components/nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Nav />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}

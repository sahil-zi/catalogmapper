'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Settings, FileSpreadsheet, Search } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface MarketplaceWithMeta {
  id: string;
  name: string;
  display_name: string;
  created_at: string;
  field_count: number;
  categories: string[];
}

export default function MarketplacesPage() {
  const [marketplaces, setMarketplaces] = useState<MarketplaceWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const [mpRes, fieldsRes] = await Promise.all([
        fetch('/api/admin/marketplaces'),
        fetch('/api/admin/marketplaces/fields-summary'),
      ]);
      const mpData = await mpRes.json();
      const allMps: any[] = mpData.marketplaces ?? [];

      // Try to get fields summary; if endpoint doesn't exist, fallback gracefully
      let fieldsSummary: Record<string, { count: number; categories: string[] }> = {};
      if (fieldsRes.ok) {
        const fd = await fieldsRes.json();
        fieldsSummary = fd.summary ?? {};
      }

      setMarketplaces(
        allMps.map((mp) => ({
          id: mp.id,
          name: mp.name,
          display_name: mp.display_name,
          created_at: mp.created_at,
          field_count: fieldsSummary[mp.id]?.count ?? mp.marketplace_fields?.[0]?.count ?? 0,
          categories: fieldsSummary[mp.id]?.categories ?? [],
        }))
      );
      setLoading(false);
    }
    load();
  }, []);

  const filtered = marketplaces.filter((mp) =>
    mp.display_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Marketplaces</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage marketplace templates and field definitions.
          </p>
        </div>
        <Link href="/admin/marketplaces/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Marketplace
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search marketplaces..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            {marketplaces.length === 0 ? (
              <>
                <h3 className="font-medium text-lg mb-2">No marketplaces yet</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Add a marketplace and upload its template file to get started.
                </p>
                <Link href="/admin/marketplaces/new">
                  <Button>Add first marketplace</Button>
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No marketplaces match your search.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((mp) => (
            <Card key={mp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{mp.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {mp.name} · {mp.field_count} fields · Added {formatDate(mp.created_at)}
                      </p>
                      {mp.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {mp.categories.map((cat) => (
                            <Badge key={cat} variant="secondary" className="text-xs">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Link href={`/admin/marketplaces/${mp.id}`}>
                    <Button variant="outline" size="sm">Manage Fields</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

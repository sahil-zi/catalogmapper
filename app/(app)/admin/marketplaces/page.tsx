export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Settings, FileSpreadsheet } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default async function MarketplacesPage() {
  const supabase = await createClient();

  const { data: marketplaces } = await supabase
    .from('marketplaces')
    .select('*, marketplace_fields(count)')
    .order('display_name');

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

      {!marketplaces || marketplaces.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">No marketplaces yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Add a marketplace and upload its template file to get started.
            </p>
            <Link href="/admin/marketplaces/new">
              <Button>Add first marketplace</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {marketplaces.map((mp: any) => (
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
                        {mp.name} ·{' '}
                        {mp.marketplace_fields?.[0]?.count ?? 0} fields ·{' '}
                        Added {formatDate(mp.created_at)}
                      </p>
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

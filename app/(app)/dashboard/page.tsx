export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileSpreadsheet, Clock, CheckCircle2, AlertCircle, Loader2, List } from 'lucide-react';
import { formatDate, getStatusColor } from '@/lib/utils';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from('upload_sessions')
    .select('*, marketplace:marketplaces(display_name, name), generated_files(*)')
    .order('created_at', { ascending: false })
    .limit(50);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'generating': return <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Your recent catalog exports</p>
        </div>
        <Link href="/upload">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Export
          </Button>
        </Link>
      </div>

      {!sessions || sessions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">No exports yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Upload a product file and map it to a marketplace format.
            </p>
            <Link href="/upload">
              <Button>Start your first export</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session: any) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {statusIcon(session.status)}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{session.original_filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.marketplace?.display_name ?? 'No marketplace'} ·{' '}
                        {session.row_count?.toLocaleString() ?? 0} rows ·{' '}
                        {formatDate(session.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={getStatusColor(session.status)}>
                      {session.status}
                    </Badge>

                    {session.status !== 'done' && (
                      <Link href={session.status === 'uploaded' || session.status === 'mapped'
                        ? `/sessions/${session.id}/map`
                        : `/sessions/${session.id}`}>
                        <Button variant="outline" size="sm">Continue</Button>
                      </Link>
                    )}

                    {session.status === 'done' && (
                      <>
                        <Link href={`/sessions/${session.id}/skus`}>
                          <Button variant="outline" size="sm">
                            <List className="h-3 w-3 mr-1" />
                            SKUs
                          </Button>
                        </Link>
                        <Link href={`/sessions/${session.id}`}>
                          <Button variant="outline" size="sm">Download</Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

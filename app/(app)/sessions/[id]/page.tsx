'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDate, formatFileSize, getStatusColor } from '@/lib/utils';
import type { UploadSession, GeneratedFile } from '@/lib/types';
import { ArrowLeft, Download, FileSpreadsheet, List, RefreshCw } from 'lucide-react';

export default function SessionPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const [session, setSession] = useState<UploadSession | null>(null);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [sessionRes, filesRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}/data`),
        fetch(`/api/sessions/${sessionId}/files`),
      ]);
      const sessionData = await sessionRes.json();
      const filesData = await filesRes.json();
      setSession(sessionData.session);
      setFiles(filesData.files ?? []);
    } catch {
      toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [sessionId]);

  async function handleDownload(fileId: string) {
    const res = await fetch(`/api/sessions/${sessionId}/download/${fileId}`);
    const data = await res.json();
    if (data.url) {
      window.open(data.url, '_blank');
    } else {
      toast.error('Could not get download link');
    }
  }

  async function handleRegenerate(format: 'csv' | 'xlsx') {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('File regenerated!');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-64" />
      <div className="h-48 bg-gray-200 rounded" />
    </div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Session Details</h1>
          <p className="text-muted-foreground text-sm">{session?.original_filename}</p>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge className={getStatusColor(session?.status ?? '')}>{session?.status}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Marketplace</span>
              <span className="font-medium">{session?.marketplace?.display_name ?? '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Rows</span>
              <span className="font-medium">{session?.row_count?.toLocaleString() ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">{session ? formatDate(session.created_at) : '—'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Link href={`/sessions/${sessionId}/map`} className="flex-1">
                <Button variant="outline" className="w-full">Edit Mapping</Button>
              </Link>
              <Link href={`/sessions/${sessionId}/skus`} className="flex-1">
                <Button variant="outline" className="w-full">
                  <List className="h-4 w-4 mr-2" />
                  View & Edit SKUs
                </Button>
              </Link>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => handleRegenerate('xlsx')}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-export XLSX
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => handleRegenerate('csv')}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {files.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Generated Files</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{file.output_format.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.row_count?.toLocaleString()} rows · {formatDate(file.created_at)}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleDownload(file.id)}>
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

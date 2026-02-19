'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SKUEditorDialog } from '@/components/sku-editor-dialog';
import { toast } from 'sonner';
import type { SessionRow, UploadSession } from '@/lib/types';
import { findImageColumns } from '@/lib/utils';
import {
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Pencil,
} from 'lucide-react';

const PAGE_SIZE = 50;

function ThumbnailImage({ src }: { src: string | undefined }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
        <ImageOff className="h-4 w-4 text-gray-300" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="Product thumbnail"
      className="w-10 h-10 rounded object-cover flex-shrink-0 border"
      onError={() => setError(true)}
    />
  );
}

export default function SKUsPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const [session, setSession] = useState<UploadSession | null>(null);
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState<SessionRow | null>(null);
  const [imageColumnName, setImageColumnName] = useState<string | null>(null);
  const [skuColumnName, setSkuColumnName] = useState<string | null>(null);
  const [titleColumnName, setTitleColumnName] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  async function loadRows(p: number) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (search) params.set('search', search);

      const [rowsRes, sessionRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}/rows?${params}`),
        !session ? fetch(`/api/sessions/${sessionId}/data`) : Promise.resolve(null),
      ]);

      const rowsData = await rowsRes.json();
      setRows(rowsData.rows ?? []);
      setTotal(rowsData.total ?? 0);

      if (sessionRes) {
        const sessionData = await sessionRes.json();
        const s = sessionData.session;
        setSession(s);

        // Detect useful columns from first row
        if (rowsData.rows?.length > 0) {
          const cols = Object.keys(rowsData.rows[0].data);
          const imgCols = findImageColumns(cols);
          setImageColumnName(imgCols[0] ?? null);

          // Detect SKU column
          const skuCol = cols.find((c) =>
            ['sku', 'seller_sku', 'item_sku', 'product_id', 'barcode', 'model'].some((k) =>
              c.toLowerCase().includes(k)
            )
          );
          setSkuColumnName(skuCol ?? cols[0] ?? null);

          // Detect title column
          const titleCol = cols.find((c) =>
            ['title', 'name', 'product_name', 'item_name', 'description'].some((k) =>
              c.toLowerCase().includes(k)
            )
          );
          setTitleColumnName(titleCol ?? null);
        }
      }
    } catch {
      toast.error('Failed to load SKUs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows(page);
  }, [page]);

  async function handleSaveRow(rowId: string, editedData: Record<string, string>) {
    const res = await fetch(`/api/sessions/${sessionId}/rows?rowId=${rowId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edited_data: editedData }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Save failed');
    }

    const data = await res.json();
    // Update local state
    setRows((prev) => prev.map((r) => (r.id === rowId ? data.row : r)));
    if (editingRow?.id === rowId) {
      setEditingRow(data.row);
    }
    toast.success('Changes saved');
  }

  function getRowPrimaryImage(row: SessionRow): string | undefined {
    if (!imageColumnName) return undefined;
    const data = { ...row.data, ...(row.edited_data ?? {}) };
    return data[imageColumnName];
  }

  function getRowSKU(row: SessionRow): string {
    const data = { ...row.data, ...(row.edited_data ?? {}) };
    return skuColumnName ? (data[skuColumnName] ?? `Row ${row.row_index + 1}`) : `Row ${row.row_index + 1}`;
  }

  function getRowTitle(row: SessionRow): string {
    const data = { ...row.data, ...(row.edited_data ?? {}) };
    return titleColumnName ? (data[titleColumnName] ?? '') : '';
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/sessions/${sessionId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">SKU List</h1>
          <p className="text-muted-foreground text-sm">
            {session?.original_filename} · {total.toLocaleString()} SKUs
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SKUs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                    loadRows(1);
                  }
                }}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => { setPage(1); loadRows(1); }}>
              Search
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading SKUs...</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No SKUs found.</div>
          ) : (
            <div className="divide-y">
              {rows.map((row) => {
                const imageUrl = getRowPrimaryImage(row);
                const sku = getRowSKU(row);
                const title = getRowTitle(row);
                const isModified = row.edited_data && Object.keys(row.edited_data).length > 0;

                return (
                  <div
                    key={row.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group cursor-pointer"
                    onClick={() => setEditingRow(row)}
                  >
                    <ThumbnailImage src={imageUrl} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{sku}</span>
                        {isModified && (
                          <Badge className="bg-amber-100 text-amber-700 text-xs flex-shrink-0">
                            Edited
                          </Badge>
                        )}
                      </div>
                      {title && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{title}</p>
                      )}
                    </div>

                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      #{row.row_index + 1}
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); setEditingRow(row); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of{' '}
                {total.toLocaleString()} SKUs
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SKUEditorDialog
        row={editingRow}
        open={!!editingRow}
        onClose={() => setEditingRow(null)}
        onSave={handleSaveRow}
      />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { findImageColumns } from '@/lib/utils';
import type { Marketplace } from '@/lib/types';

const PAGE_SIZE = 50;

interface SKURow {
  id: string;
  row_index: number;
  data: Record<string, string>;
  edited_data: Record<string, string> | null;
  session_id: string;
  original_filename: string;
  marketplace_id: string;
  category: string | null;
  mp_display_name: string;
}

interface SessionOption {
  id: string;
  original_filename: string;
  marketplace_id: string;
  category: string | null;
}

function ThumbnailImage({ src, onClick }: { src: string | undefined; onClick: () => void }) {
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
      className="w-10 h-10 rounded object-cover flex-shrink-0 border cursor-pointer hover:opacity-80 transition-opacity"
      onClick={onClick}
      onError={() => setError(true)}
    />
  );
}

export default function GlobalSKUReviewPage() {
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [selectedMarketplace, setSelectedMarketplace] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [rows, setRows] = useState<SKURow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [imageColumnName, setImageColumnName] = useState<string | null>(null);
  const [skuColumnName, setSkuColumnName] = useState<string | null>(null);
  const [titleColumnName, setTitleColumnName] = useState<string | null>(null);
  const [extraColumns, setExtraColumns] = useState<string[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Load marketplaces on mount
  useEffect(() => {
    fetch('/api/admin/marketplaces')
      .then((r) => r.json())
      .then((d) => setMarketplaces(d.marketplaces ?? []));
  }, []);

  // When marketplace changes, fetch available categories from fields-summary
  useEffect(() => {
    if (!selectedMarketplace) {
      setAvailableCategories([]);
      setSelectedCategory('');
      return;
    }
    fetch(`/api/admin/marketplaces/${selectedMarketplace}/fields`)
      .then((r) => r.json())
      .then((d) => {
        const cats = [
          ...new Set(
            (d.fields ?? [])
              .map((f: any) => f.category)
              .filter((c: any): c is string => Boolean(c))
          ),
        ] as string[];
        setAvailableCategories(cats);
        setSelectedCategory('');
      });
  }, [selectedMarketplace]);

  async function loadRows(p: number) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (selectedMarketplace) params.set('marketplace_id', selectedMarketplace);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedSession) params.set('session_id', selectedSession);

      const res = await fetch(`/api/skus?${params}`);
      const data = await res.json();

      const fetchedRows: SKURow[] = data.rows ?? [];
      setRows(fetchedRows);
      setTotal(data.total ?? 0);
      setSessions(data.sessions ?? []);

      // Auto-detect columns from first row
      if (fetchedRows.length > 0) {
        const cols = Object.keys(fetchedRows[0].data);
        const imgCols = findImageColumns(cols);
        const imgCol = imgCols[0] ?? null;
        setImageColumnName(imgCol);

        const skuCol = cols.find((c) =>
          ['sku', 'seller_sku', 'item_sku', 'product_id', 'barcode', 'model'].some((k) =>
            c.toLowerCase().includes(k)
          )
        ) ?? cols[0] ?? null;
        setSkuColumnName(skuCol);

        const titleCol = cols.find((c) =>
          ['title', 'name', 'product_name', 'item_name', 'description'].some((k) =>
            c.toLowerCase().includes(k)
          )
        ) ?? null;
        setTitleColumnName(titleCol);

        // Up to 3 extra columns (excluding image, sku, title)
        const reserved = new Set([imgCol, skuCol, titleCol].filter(Boolean) as string[]);
        setExtraColumns(cols.filter((c) => !reserved.has(c)).slice(0, 3));
      } else {
        setImageColumnName(null);
        setSkuColumnName(null);
        setTitleColumnName(null);
        setExtraColumns([]);
      }
    } finally {
      setLoading(false);
    }
  }

  // When filters change, reset to page 1 and reload
  useEffect(() => {
    setPage(1);
    loadRows(1);
  }, [selectedMarketplace, selectedCategory, selectedSession]);

  // When user navigates pages, reload
  useEffect(() => {
    loadRows(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function getRowData(row: SKURow): Record<string, string> {
    return { ...row.data, ...(row.edited_data ?? {}) };
  }

  function getRowImageSrc(row: SKURow): string | undefined {
    if (!imageColumnName) return undefined;
    return getRowData(row)[imageColumnName];
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">SKU Review</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Browse SKUs across all sessions and marketplaces.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[160px]">
          <Select
            value={selectedMarketplace}
            onValueChange={(v) => {
              setSelectedMarketplace(v === '_all' ? '' : v);
              setSelectedSession('');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All marketplaces" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All marketplaces</SelectItem>
              {marketplaces.map((mp) => (
                <SelectItem key={mp.id} value={mp.id}>
                  {mp.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {availableCategories.length > 0 && (
          <div className="flex-1 min-w-[140px]">
            <Select
              value={selectedCategory}
              onValueChange={(v) => {
                setSelectedCategory(v === '_all' ? '' : v);
                setSelectedSession('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All categories</SelectItem>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex-1 min-w-[200px]">
          <Select
            value={selectedSession}
            onValueChange={(v) => setSelectedSession(v === '_all' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All sessions / files" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All sessions / files</SelectItem>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.original_filename}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${total.toLocaleString()} SKUs`}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {/* Table header */}
          {rows.length > 0 && (
            <div
              className="grid gap-3 px-4 py-2 bg-muted/40 border-b text-xs font-medium text-muted-foreground"
              style={{ gridTemplateColumns: `40px 1fr 1fr 1fr ${extraColumns.map(() => '1fr').join(' ')}` }}
            >
              <div />
              <div>File · Marketplace · Category</div>
              <div>{skuColumnName ?? 'SKU'}</div>
              <div>{titleColumnName ?? 'Title'}</div>
              {extraColumns.map((col) => (
                <div key={col} className="truncate">{col}</div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading SKUs...</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No SKUs found.</div>
          ) : (
            <div className="divide-y">
              {rows.map((row) => {
                const d = getRowData(row);
                const imgSrc = getRowImageSrc(row);
                const sku = skuColumnName ? (d[skuColumnName] ?? `#${row.row_index + 1}`) : `#${row.row_index + 1}`;
                const title = titleColumnName ? (d[titleColumnName] ?? '') : '';

                return (
                  <div
                    key={row.id}
                    className="grid gap-3 px-4 py-2.5 items-center hover:bg-muted/20 transition-colors"
                    style={{ gridTemplateColumns: `40px 1fr 1fr 1fr ${extraColumns.map(() => '1fr').join(' ')}` }}
                  >
                    <ThumbnailImage
                      src={imgSrc}
                      onClick={() => imgSrc && setLightboxSrc(imgSrc)}
                    />
                    <div className="min-w-0">
                      <p className="text-xs truncate font-medium">{row.original_filename}</p>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">{row.mp_display_name}</Badge>
                        {row.category && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">{row.category}</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm truncate">{sku}</p>
                    <p className="text-sm truncate text-muted-foreground">{title}</p>
                    {extraColumns.map((col) => (
                      <p key={col} className="text-xs truncate text-muted-foreground">
                        {d[col] ?? ''}
                      </p>
                    ))}
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
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">{page} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image lightbox dialog */}
      <Dialog open={!!lightboxSrc} onOpenChange={(open) => !open && setLightboxSrc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Image</DialogTitle>
          </DialogHeader>
          {lightboxSrc && (
            <img
              src={lightboxSrc}
              alt="Product full size"
              className="w-full rounded-md object-contain max-h-[70vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

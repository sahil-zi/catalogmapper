'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { SessionRow } from '@/lib/types';
import { findImageColumns } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ImageOff, Save, X } from 'lucide-react';

interface SKUEditorDialogProps {
  row: SessionRow | null;
  open: boolean;
  onClose: () => void;
  onSave: (rowId: string, editedData: Record<string, string>) => Promise<void>;
}

function ImageCarousel({ imageUrls }: { imageUrls: string[] }) {
  const [current, setCurrent] = useState(0);
  const [errors, setErrors] = useState<Set<number>>(new Set());

  if (imageUrls.length === 0) {
    return (
      <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
        <ImageOff className="h-8 w-8 text-gray-300" />
        <span className="ml-2 text-sm text-gray-400">No images</span>
      </div>
    );
  }

  const validUrls = imageUrls.filter((_, i) => !errors.has(i));

  return (
    <div className="space-y-2">
      {/* Primary large image */}
      <div className="relative w-full h-52 bg-gray-100 rounded-lg overflow-hidden">
        {errors.has(current) ? (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="h-8 w-8 text-gray-300" />
          </div>
        ) : (
          <img
            src={imageUrls[current]}
            alt={`Product image ${current + 1}`}
            className="w-full h-full object-contain"
            onError={() => setErrors((prev) => new Set([...prev, current]))}
          />
        )}
        {imageUrls.length > 1 && (
          <>
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center shadow disabled:opacity-30 hover:bg-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrent((c) => Math.min(imageUrls.length - 1, c + 1))}
              disabled={current === imageUrls.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center shadow disabled:opacity-30 hover:bg-white transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="absolute bottom-2 right-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">
              {current + 1} / {imageUrls.length}
            </span>
            {current === 0 && (
              <Badge className="absolute top-2 left-2 bg-blue-500 text-white text-xs">Primary</Badge>
            )}
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {imageUrls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto py-1">
          {imageUrls.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-colors ${
                i === current ? 'border-primary' : 'border-transparent'
              }`}
            >
              {errors.has(i) ? (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <ImageOff className="h-4 w-4 text-gray-300" />
                </div>
              ) : (
                <img
                  src={url}
                  alt={`Thumb ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={() => setErrors((prev) => new Set([...prev, i]))}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SKUEditorDialog({ row, open, onClose, onSave }: SKUEditorDialogProps) {
  const [saving, setSaving] = useState(false);
  const [editedData, setEditedData] = useState<Record<string, string>>({});

  // Merge original + previously edited data, plus any current edits
  const effectiveData = { ...(row?.data ?? {}), ...(row?.edited_data ?? {}), ...editedData };

  // Reset local edits when row changes
  const prevRowId = useRef<string | null>(null);
  if (row && row.id !== prevRowId.current) {
    prevRowId.current = row.id;
    if (Object.keys(editedData).length > 0) {
      // Reset edits for new row
    }
  }

  if (!row) return null;

  const allColumns = Object.keys(row.data);
  const imageColumns = findImageColumns(allColumns);
  const imageUrls = imageColumns
    .map((col) => effectiveData[col])
    .filter((url): url is string => !!url && url.startsWith('http'));

  function handleFieldChange(key: string, value: string) {
    setEditedData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!row) return;
    setSaving(true);
    try {
      const mergedEdits = { ...(row.edited_data ?? {}), ...editedData };
      await onSave(row.id, mergedEdits);
      setEditedData({});
    } finally {
      setSaving(false);
    }
  }

  const hasEdits = Object.keys(editedData).length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setEditedData({}); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            Edit SKU
            {row.edited_data && Object.keys(row.edited_data).length > 0 && (
              <Badge className="ml-2 bg-amber-100 text-amber-700 text-xs">Modified</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Image carousel */}
          {imageUrls.length > 0 && <ImageCarousel imageUrls={imageUrls} />}

          {/* Fields */}
          <div className="grid grid-cols-2 gap-3">
            {allColumns.map((col) => {
              const isEdited = editedData[col] !== undefined;
              const isImageCol = imageColumns.includes(col);
              return (
                <div key={col} className={`space-y-1 ${isImageCol ? 'col-span-2' : ''}`}>
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    {col}
                    {isEdited && <span className="text-amber-500 text-xs">•</span>}
                  </Label>
                  <Input
                    value={effectiveData[col] ?? ''}
                    onChange={(e) => handleFieldChange(col, e.target.value)}
                    className={`h-8 text-sm ${isEdited ? 'border-amber-300 bg-amber-50' : ''}`}
                    placeholder="—"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="border-t pt-4 gap-2">
          <Button variant="outline" onClick={() => { setEditedData({}); onClose(); }}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasEdits}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

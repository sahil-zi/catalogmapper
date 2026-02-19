'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UploadZone } from '@/components/upload-zone';
import { toast } from 'sonner';
import type { Marketplace, MarketplaceField } from '@/lib/types';
import { ArrowLeft, Save, Trash2, Upload } from 'lucide-react';

interface CategoryEntry {
  category: string; // 'Default' for null
  count: number;
}

export default function MarketplaceDetailPage() {
  const { id: marketplaceId } = useParams<{ id: string }>();
  const router = useRouter();

  const [marketplace, setMarketplace] = useState<Marketplace | null>(null);
  const [fields, setFields] = useState<MarketplaceField[]>([]);
  const [categories, setCategories] = useState<CategoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateCategory, setTemplateCategory] = useState('');
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  async function loadData() {
    const [mpRes, fieldsRes] = await Promise.all([
      fetch('/api/admin/marketplaces'),
      fetch(`/api/admin/marketplaces/${marketplaceId}/fields`),
    ]);
    const mpData = await mpRes.json();
    const fieldsData = await fieldsRes.json();

    const mp = (mpData.marketplaces ?? []).find((m: Marketplace) => m.id === marketplaceId);
    setMarketplace(mp ?? null);

    const allFields: MarketplaceField[] = fieldsData.fields ?? [];
    setFields(allFields);

    // Derive distinct categories from fields
    const catMap = new Map<string, number>();
    for (const f of allFields) {
      const key = f.category ?? 'Default';
      catMap.set(key, (catMap.get(key) ?? 0) + 1);
    }
    const catEntries: CategoryEntry[] = Array.from(catMap.entries()).map(([category, count]) => ({
      category,
      count,
    }));
    setCategories(catEntries);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [marketplaceId]);

  function toggleRequired(fieldId: string) {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, is_required: !f.is_required } : f))
    );
  }

  function updateDescription(fieldId: string, desc: string) {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, description: desc } : f))
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/marketplaces/${marketplaceId}/fields`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Fields updated!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTemplateUpload() {
    if (!templateFile) return;
    setUploadingTemplate(true);
    try {
      const formData = new FormData();
      formData.append('file', templateFile);
      if (templateCategory.trim()) formData.append('category', templateCategory.trim());
      const res = await fetch(`/api/admin/marketplaces/${marketplaceId}/template`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Template uploaded: ${data.columnCount} fields extracted`);
      setTemplateFile(null);
      setTemplateCategory('');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingTemplate(false);
    }
  }

  async function handleDeleteMarketplace() {
    if (!confirm(`Delete ${marketplace?.display_name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/marketplaces/${marketplaceId}/fields`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Marketplace deleted');
      router.push('/admin/marketplaces');
    } else {
      toast.error('Delete failed');
    }
  }

  async function handleDeleteCategory(category: string) {
    if (!confirm(`Delete all fields in category "${category}"? This cannot be undone.`)) return;
    setDeletingCategory(category);
    try {
      const url = `/api/admin/marketplaces/${marketplaceId}/fields?category=${encodeURIComponent(category)}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success(`Category "${category}" deleted`);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingCategory(null);
    }
  }

  const requiredCount = fields.filter((f) => f.is_required).length;

  if (loading) return <div className="max-w-3xl mx-auto animate-pulse space-y-4">
    <div className="h-8 bg-gray-200 rounded w-64" />
    <div className="h-64 bg-gray-200 rounded" />
  </div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/marketplaces">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{marketplace?.display_name}</h1>
          <p className="text-muted-foreground text-sm">
            {fields.length} fields · {requiredCount} required
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteMarketplace}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete Marketplace
        </Button>
      </div>

      {/* Section 1: Uploaded Templates */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Uploaded Templates</CardTitle></CardHeader>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No templates uploaded yet.
            </div>
          ) : (
            <div className="divide-y">
              {categories.map(({ category, count }) => (
                <div key={category} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{category}</Badge>
                    <span className="text-sm text-muted-foreground">{count} fields</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteCategory(category)}
                    disabled={deletingCategory === category}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {deletingCategory === category ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Upload New Template */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Upload New Template</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <UploadZone
            onFileSelect={setTemplateFile}
            selectedFile={templateFile}
            onClear={() => setTemplateFile(null)}
            disabled={uploadingTemplate}
          />
          {templateFile && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category Name (optional)</label>
              <input
                type="text"
                placeholder="e.g. Electronics, Clothing"
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                disabled={uploadingTemplate}
                className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                If set, only fields with this category are replaced. Leave blank to replace all fields.
              </p>
            </div>
          )}
          <Button
            onClick={handleTemplateUpload}
            disabled={!templateFile || uploadingTemplate}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploadingTemplate ? 'Uploading...' : 'Upload & Replace Fields'}
          </Button>
        </CardContent>
      </Card>

      {/* Section 3: Fields */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Fields</CardTitle>
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {fields.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No fields. Upload a template file above to extract fields.
            </div>
          ) : (
            <div className="divide-y">
              {fields.map((field) => (
                <div key={field.id} className="flex items-start gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{field.field_name}</span>
                      {field.category && (
                        <Badge variant="secondary" className="text-xs">{field.category}</Badge>
                      )}
                      {field.sample_values && field.sample_values.length > 0 && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          e.g. {field.sample_values.slice(0, 2).join(', ')}
                        </span>
                      )}
                    </div>
                    <Input
                      placeholder="Add description..."
                      value={field.description ?? ''}
                      onChange={(e) => updateDescription(field.id, e.target.value)}
                      className="h-7 text-xs mt-1.5 max-w-xs"
                    />
                  </div>
                  <button
                    onClick={() => toggleRequired(field.id)}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      field.is_required
                        ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {field.is_required ? 'Required *' : 'Optional'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

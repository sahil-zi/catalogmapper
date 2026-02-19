'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadZone } from '@/components/upload-zone';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function NewMarketplacePage() {
  const [displayName, setDisplayName] = useState('');
  const [name, setName] = useState('');
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function handleDisplayNameChange(val: string) {
    setDisplayName(val);
    setName(val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return toast.error('Display name is required');
    setLoading(true);

    try {
      // Create marketplace
      const res = await fetch('/api/admin/marketplaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, display_name: displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create marketplace');

      const marketplaceId = data.marketplace.id;

      // Upload template if provided
      if (templateFile) {
        const formData = new FormData();
        formData.append('file', templateFile);
        if (categoryName.trim()) formData.append('category', categoryName.trim());
        const tRes = await fetch(`/api/admin/marketplaces/${marketplaceId}/template`, {
          method: 'POST',
          body: formData,
        });
        const tData = await tRes.json();
        if (!tRes.ok) throw new Error(tData.error || 'Failed to upload template');
        toast.success(`Marketplace created with ${tData.columnCount} fields!`);
      } else {
        toast.success('Marketplace created!');
      }

      router.push(`/admin/marketplaces/${marketplaceId}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/marketplaces">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Marketplace</h1>
          <p className="text-muted-foreground text-sm">Add a marketplace and upload its template.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                placeholder="e.g. Noon, Amazon, Trendyol"
                value={displayName}
                onChange={(e) => handleDisplayNameChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Internal Name (auto-generated)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. noon"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Used as identifier in exports.</p>
            </div>

            <div className="space-y-2">
              <Label>Template File (optional)</Label>
              <UploadZone
                onFileSelect={setTemplateFile}
                selectedFile={templateFile}
                onClear={() => setTemplateFile(null)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Upload the marketplace's official template (.csv, .xlsx, .xlsm). Headers will be
                extracted as fields.
              </p>
            </div>

            {templateFile && (
              <div className="space-y-2">
                <Label htmlFor="categoryName">Category Name (optional)</Label>
                <Input
                  id="categoryName"
                  placeholder="e.g. Electronics, Clothing, Home & Garden"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Tag this template with a category. Upload multiple templates with different
                  categories to support different product types.
                </p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating...' : 'Create Marketplace'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FieldMapper, type MappingRow } from '@/components/field-mapper';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { UploadSession, MarketplaceField, FieldMapping } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';

export default function MapPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<UploadSession | null>(null);
  const [fields, setFields] = useState<MarketplaceField[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pendingMappings, setPendingMappings] = useState<MappingRow[] | null>(null);

  useEffect(() => {
    loadData();
  }, [sessionId]);

  async function loadData() {
    try {
      const [sessionRes, mappingsRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}/data`),
        fetch(`/api/sessions/${sessionId}/mappings`),
      ]);

      const sessionData = await sessionRes.json();
      const mappingsData = await mappingsRes.json();

      if (!sessionRes.ok) throw new Error(sessionData.error);

      setSession(sessionData.session);
      setMappings(mappingsData.mappings ?? []);

      if (sessionData.session?.marketplace_id) {
        const fieldsRes = await fetch(
          `/api/admin/marketplaces/${sessionData.session.marketplace_id}/fields`
        );
        const fieldsData = await fieldsRes.json();
        setFields(fieldsData.fields ?? []);
      }
    } catch (err: any) {
      toast.error('Failed to load session: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(rows: MappingRow[]) {
    setPendingMappings(rows);
    setGenerateOpen(true);
  }

  async function handleGenerate(format: 'csv' | 'xlsx') {
    if (!pendingMappings) return;
    setSaving(true);
    setGenerating(true);

    try {
      // Save mappings
      const saveRes = await fetch(`/api/sessions/${sessionId}/mappings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mappings: pendingMappings.map((m) => ({
            user_column: m.userColumn.name,
            marketplace_field_id: m.selectedFieldId,
            marketplace_field_name: m.selectedFieldName,
            is_manual_override: m.isManualOverride,
          })),
        }),
      });

      if (!saveRes.ok) throw new Error('Failed to save mappings');

      // Generate file
      const genRes = await fetch(`/api/sessions/${sessionId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      const genData = await genRes.json();

      if (!genRes.ok) throw new Error(genData.error || 'Generation failed');

      toast.success('File generated!');
      setGenerateOpen(false);
      router.push(`/sessions/${sessionId}`);
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setSaving(false);
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Field Mapping</h1>
          <p className="text-muted-foreground text-sm">
            {session?.original_filename} → {session?.marketplace?.display_name}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Map Your Columns</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{session?.user_columns?.length ?? 0} source columns</span>
              <span>→</span>
              <span>{fields.length} marketplace fields</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {session?.user_columns && fields.length > 0 ? (
            <FieldMapper
              userColumns={session.user_columns}
              marketplaceFields={fields}
              existingMappings={mappings}
              onSave={handleSave}
              saving={saving}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              {fields.length === 0
                ? 'No marketplace fields found. Configure them in Admin.'
                : 'No columns found in the uploaded file.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Generate dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Output Format</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Select the format for your exported catalog file.
          </p>
          <DialogFooter className="flex gap-3 sm:justify-start">
            <Button
              onClick={() => handleGenerate('xlsx')}
              disabled={generating}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Export as XLSX
            </Button>
            <Button
              variant="outline"
              onClick={() => handleGenerate('csv')}
              disabled={generating}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Export as CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UploadZone } from '@/components/upload-zone';
import { MarketplaceSelector } from '@/components/marketplace-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import type { Marketplace } from '@/lib/types';
import { ArrowRight } from 'lucide-react';

type Step = 'select' | 'uploading' | 'mapping';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [marketplaceId, setMarketplaceId] = useState('');
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [step, setStep] = useState<Step>('select');
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/marketplaces')
      .then((r) => r.json())
      .then((d) => setMarketplaces(d.marketplaces ?? []));
  }, []);

  async function handleSubmit() {
    if (!file) return toast.error('Please select a file');
    if (!marketplaceId) return toast.error('Please select a marketplace');

    setStep('uploading');
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('marketplace_id', marketplaceId);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');

      setProgress(50);
      const sessionId = uploadData.session_id;

      // Trigger AI mapping
      const mapRes = await fetch(`/api/sessions/${sessionId}/marketplace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplace_id: marketplaceId }),
      });

      if (!mapRes.ok) {
        const mapData = await mapRes.json();
        throw new Error(mapData.error || 'AI mapping failed');
      }

      setProgress(100);
      setStep('mapping');

      setTimeout(() => {
        router.push(`/sessions/${sessionId}/map`);
      }, 500);
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
      setStep('select');
      setProgress(0);
    }
  }

  const isUploading = step === 'uploading';

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">New Export</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload your product file and select the target marketplace.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 1: Upload & Select</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Product file</Label>
            <UploadZone
              onFileSelect={setFile}
              selectedFile={file}
              onClear={() => setFile(null)}
              disabled={isUploading}
            />
          </div>

          <div className="space-y-2">
            <Label>Target marketplace</Label>
            {marketplaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No marketplaces configured.{' '}
                <a href="/admin/marketplaces" className="text-primary underline">
                  Add one in Admin.
                </a>
              </p>
            ) : (
              <MarketplaceSelector
                marketplaces={marketplaces}
                value={marketplaceId}
                onChange={setMarketplaceId}
                disabled={isUploading}
              />
            )}
          </div>

          {isUploading && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {progress < 50 ? 'Uploading and parsing file...' : 'Getting AI field suggestions...'}
              </p>
              <Progress value={progress} />
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!file || !marketplaceId || isUploading}
            className="w-full"
          >
            {isUploading ? 'Processing...' : 'Continue to Field Mapping'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

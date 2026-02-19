import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id: sessionId, fileId } = await params;
    const supabase = createServiceClient();

    const { data: file, error } = await supabase
      .from('generated_files')
      .select('*')
      .eq('id', fileId)
      .eq('session_id', sessionId)
      .single();

    if (error || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('generated')
      .createSignedUrl(file.file_path, 3600); // 1 hour

    if (urlError || !signedUrl) {
      return NextResponse.json({ error: 'Could not generate download URL' }, { status: 500 });
    }

    return NextResponse.json({ url: signedUrl.signedUrl });
  } catch (err) {
    console.error('Download URL error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { parseFileBuffer } from '@/lib/parsers';
import { z } from 'zod';

const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xlsm'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const marketplaceId = formData.get('marketplace_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }

    // Parse file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = parseFileBuffer(buffer, file.name);

    if (parsed.columns.length === 0) {
      return NextResponse.json({ error: 'Could not extract columns from file' }, { status: 400 });
    }

    // Upload raw file to Supabase Storage
    const storagePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storagePath, buffer, { contentType: file.type || 'application/octet-stream' });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 });
    }

    // Create upload_session
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .insert({
        original_filename: file.name,
        file_path: storagePath,
        marketplace_id: marketplaceId || null,
        status: 'uploaded',
        row_count: parsed.rowCount,
        user_columns: parsed.columns,
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    // Store rows in session_rows table (batch insert in chunks of 500)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < parsed.rows.length; i += CHUNK_SIZE) {
      const chunk = parsed.rows.slice(i, i + CHUNK_SIZE).map((row, j) => ({
        session_id: session.id,
        row_index: i + j,
        data: row,
      }));
      const { error: rowsError } = await supabase.from('session_rows').insert(chunk);
      if (rowsError) {
        console.error('Row insert error:', rowsError);
        // Non-fatal: session still created
      }
    }

    return NextResponse.json({ session_id: session.id, session });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

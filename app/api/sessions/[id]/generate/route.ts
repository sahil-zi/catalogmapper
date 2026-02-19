import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateOutputBuffer, type OutputFormat } from '@/lib/generators';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = createServiceClient();
    const { format } = (await request.json()) as { format: OutputFormat };

    if (!['csv', 'xlsx'].includes(format)) {
      return NextResponse.json({ error: 'format must be csv or xlsx' }, { status: 400 });
    }

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .select('*, marketplace:marketplaces(*)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Fetch mappings
    const { data: mappings } = await supabase
      .from('field_mappings')
      .select('*')
      .eq('session_id', sessionId);

    // Fetch marketplace fields
    const { data: fields } = await supabase
      .from('marketplace_fields')
      .select('*')
      .eq('marketplace_id', session.marketplace_id)
      .order('field_order');

    if (!fields || !mappings) {
      return NextResponse.json({ error: 'Missing mappings or fields' }, { status: 400 });
    }

    // Fetch session rows (all)
    const { data: rows } = await supabase
      .from('session_rows')
      .select('*')
      .eq('session_id', sessionId)
      .order('row_index');

    if (!rows) {
      return NextResponse.json({ error: 'No rows found for session' }, { status: 400 });
    }

    // Mark as generating
    await supabase
      .from('upload_sessions')
      .update({ status: 'generating' })
      .eq('id', sessionId);

    // Generate output
    const buffer = generateOutputBuffer({ rows, mappings, marketplaceFields: fields, format });

    const originalName = session.original_filename.replace(/\.[^.]+$/, '');
    const outputFilename = `${originalName}_${session.marketplace?.name ?? 'output'}_${Date.now()}.${format}`;
    const outputPath = `${sessionId}/${outputFilename}`;

    const contentType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const { error: storageError } = await supabase.storage
      .from('generated')
      .upload(outputPath, buffer, { contentType, upsert: true });

    if (storageError) {
      console.error('Storage write error:', storageError);
      await supabase.from('upload_sessions').update({ status: 'error' }).eq('id', sessionId);
      return NextResponse.json({ error: 'Failed to write output file' }, { status: 500 });
    }

    // Save generated_files record
    const { data: generatedFile } = await supabase
      .from('generated_files')
      .insert({
        session_id: sessionId,
        file_path: outputPath,
        output_format: format,
        row_count: rows.length,
      })
      .select()
      .single();

    // Mark session done
    await supabase
      .from('upload_sessions')
      .update({ status: 'done' })
      .eq('id', sessionId);

    return NextResponse.json({ file: generatedFile });
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

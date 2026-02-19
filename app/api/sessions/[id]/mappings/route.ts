import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const MappingUpdateSchema = z.array(
  z.object({
    user_column: z.string(),
    marketplace_field_id: z.string().nullable(),
    marketplace_field_name: z.string().nullable(),
    is_manual_override: z.boolean().optional(),
  })
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('field_mappings')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mappings: data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = createServiceClient();
    const body = await request.json();
    const mappings = MappingUpdateSchema.parse(body.mappings);

    // Delete all existing mappings
    await supabase.from('field_mappings').delete().eq('session_id', sessionId);

    // Insert updated mappings
    const rows = mappings
      .filter((m) => m.marketplace_field_name)
      .map((m) => ({
        session_id: sessionId,
        user_column: m.user_column,
        marketplace_field_id: m.marketplace_field_id,
        marketplace_field_name: m.marketplace_field_name,
        ai_suggested: false,
        is_manual_override: m.is_manual_override ?? true,
      }));

    if (rows.length > 0) {
      const { error } = await supabase.from('field_mappings').insert(rows);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Update session status
    await supabase
      .from('upload_sessions')
      .update({ status: 'mapped' })
      .eq('id', sessionId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Mapping save error:', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

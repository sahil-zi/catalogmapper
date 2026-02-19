import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { suggestMappings } from '@/lib/ai/mapping';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = createServiceClient();
    const { marketplace_id } = await request.json();

    if (!marketplace_id) {
      return NextResponse.json({ error: 'marketplace_id required' }, { status: 400 });
    }

    // Update session with marketplace
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .update({ marketplace_id, status: 'mapped' })
      .eq('id', sessionId)
      .select()
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Fetch marketplace fields
    const { data: marketplace } = await supabase
      .from('marketplaces')
      .select('*')
      .eq('id', marketplace_id)
      .single();

    const { data: fields } = await supabase
      .from('marketplace_fields')
      .select('*')
      .eq('marketplace_id', marketplace_id)
      .order('field_order');

    if (!fields || !marketplace) {
      return NextResponse.json({ error: 'Marketplace not found' }, { status: 404 });
    }

    // Get AI suggestions
    const userColumns = session.user_columns as { name: string; sample_values: string[] }[] ?? [];
    const suggestions = await suggestMappings(userColumns, fields, marketplace.display_name);

    // Delete existing mappings for this session
    await supabase.from('field_mappings').delete().eq('session_id', sessionId);

    // Build field lookup
    const fieldByName = new Map((fields as { id: string; field_name: string }[]).map((f) => [f.field_name, f]));

    // Insert new mappings
    const mappingRows = suggestions
      .filter((s) => s.marketplace_field)
      .map((s) => {
        const field = fieldByName.get(s.marketplace_field!);
        return {
          session_id: sessionId,
          user_column: s.user_column,
          marketplace_field_id: field?.id ?? null,
          marketplace_field_name: s.marketplace_field,
          ai_suggested: true,
          ai_confidence: s.confidence,
          is_manual_override: false,
        };
      });

    if (mappingRows.length > 0) {
      await supabase.from('field_mappings').insert(mappingRows);
    }

    return NextResponse.json({ session, suggestions });
  } catch (err) {
    console.error('Marketplace assignment error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

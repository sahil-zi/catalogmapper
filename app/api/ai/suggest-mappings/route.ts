import { NextRequest, NextResponse } from 'next/server';
import { suggestMappings } from '@/lib/ai/mapping';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const RequestSchema = z.object({
  session_id: z.string(),
  marketplace_id: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = RequestSchema.parse(await request.json());
    const supabase = createServiceClient();

    const { data: session } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('id', body.session_id)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data: marketplace } = await supabase
      .from('marketplaces')
      .select('*')
      .eq('id', body.marketplace_id)
      .single();

    const { data: fields } = await supabase
      .from('marketplace_fields')
      .select('*')
      .eq('marketplace_id', body.marketplace_id)
      .order('field_order');

    if (!marketplace || !fields) {
      return NextResponse.json({ error: 'Marketplace not found' }, { status: 404 });
    }

    const suggestions = await suggestMappings(
      session.user_columns ?? [],
      fields,
      marketplace.display_name
    );

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error('AI suggest error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

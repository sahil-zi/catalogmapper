import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const PAGE_SIZE = 50;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const search = searchParams.get('search') ?? '';

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('session_rows')
    .select('*', { count: 'exact' })
    .eq('session_id', sessionId)
    .order('row_index')
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data, total: count, page, pageSize: PAGE_SIZE });
}

const RowUpdateSchema = z.object({
  edited_data: z.record(z.string(), z.string()),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const rowId = searchParams.get('rowId');

    if (!rowId) {
      return NextResponse.json({ error: 'rowId query param required' }, { status: 400 });
    }

    const body = RowUpdateSchema.parse(await request.json());

    const { data, error } = await supabase
      .from('session_rows')
      .update({ edited_data: body.edited_data })
      .eq('id', rowId)
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ row: data });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

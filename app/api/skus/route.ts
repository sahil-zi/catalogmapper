import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;

  const marketplaceId = searchParams.get('marketplace_id');
  const category = searchParams.get('category');
  const sessionId = searchParams.get('session_id');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  // Build query for rows
  let rowQuery = supabase
    .from('session_rows')
    .select(
      `id, row_index, data, edited_data,
       upload_sessions!inner (
         id,
         original_filename,
         marketplace_id,
         category,
         created_at,
         marketplaces!inner ( display_name )
       )`,
      { count: 'exact' }
    )
    .order('created_at', { referencedTable: 'upload_sessions', ascending: false })
    .order('row_index', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  if (marketplaceId) {
    rowQuery = rowQuery.eq('upload_sessions.marketplace_id', marketplaceId);
  }
  if (category) {
    rowQuery = rowQuery.eq('upload_sessions.category', category);
  }
  if (sessionId) {
    rowQuery = rowQuery.eq('session_id', sessionId);
  }

  const { data: rows, count, error } = await rowQuery;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch distinct sessions for filter dropdown
  let sessionsQuery = supabase
    .from('upload_sessions')
    .select('id, original_filename, marketplace_id, category, created_at')
    .order('created_at', { ascending: false });

  if (marketplaceId) sessionsQuery = sessionsQuery.eq('marketplace_id', marketplaceId);
  if (category) sessionsQuery = sessionsQuery.eq('category', category);

  const { data: sessions } = await sessionsQuery;

  // Flatten the joined data
  const flatRows = (rows ?? []).map((r: any) => {
    const session = r.upload_sessions;
    return {
      id: r.id,
      row_index: r.row_index,
      data: r.data,
      edited_data: r.edited_data,
      session_id: session?.id,
      original_filename: session?.original_filename,
      marketplace_id: session?.marketplace_id,
      category: session?.category,
      mp_display_name: session?.marketplaces?.display_name,
    };
  });

  return NextResponse.json({
    rows: flatRows,
    total: count ?? 0,
    sessions: sessions ?? [],
    page,
    page_size: PAGE_SIZE,
  });
}

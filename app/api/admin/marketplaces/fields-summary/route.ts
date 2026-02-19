import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// Returns per-marketplace field count and distinct categories
export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('marketplace_fields')
    .select('marketplace_id, category');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const summary: Record<string, { count: number; categories: string[] }> = {};

  for (const row of data ?? []) {
    const mpId: string = row.marketplace_id;
    if (!summary[mpId]) summary[mpId] = { count: 0, categories: [] };
    summary[mpId].count += 1;
    if (row.category && !summary[mpId].categories.includes(row.category)) {
      summary[mpId].categories.push(row.category);
    }
  }

  return NextResponse.json({ summary });
}

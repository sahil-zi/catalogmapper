import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const CreateSchema = z.object({
  name: z.string().min(1).max(50),
  display_name: z.string().min(1).max(100),
});

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('marketplaces')
    .select('*')
    .order('display_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ marketplaces: data });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = CreateSchema.parse(await request.json());

    const { data, error } = await supabase
      .from('marketplaces')
      .insert({ name: body.name.toLowerCase().replace(/\s+/g, '_'), display_name: body.display_name })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ marketplace: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

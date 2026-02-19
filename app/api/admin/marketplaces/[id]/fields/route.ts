import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const FieldUpdateSchema = z.array(
  z.object({
    id: z.string(),
    is_required: z.boolean(),
    description: z.string().nullable().optional(),
    display_name: z.string().optional(),
    field_order: z.number().optional(),
  })
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: marketplaceId } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('marketplace_fields')
    .select('*')
    .eq('marketplace_id', marketplaceId)
    .order('field_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fields: data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketplaceId } = await params;
    const supabase = createServiceClient();
    const body = await request.json();
    const fields = FieldUpdateSchema.parse(body.fields);

    // Update each field
    const updates = fields.map((f) =>
      supabase
        .from('marketplace_fields')
        .update({
          is_required: f.is_required,
          description: f.description,
          display_name: f.display_name,
          field_order: f.field_order,
        })
        .eq('id', f.id)
        .eq('marketplace_id', marketplaceId)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Field update error:', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: marketplaceId } = await params;
  const supabase = createServiceClient();
  const category = request.nextUrl.searchParams.get('category');

  if (category) {
    // Delete only fields belonging to the specified category
    const query = supabase
      .from('marketplace_fields')
      .delete()
      .eq('marketplace_id', marketplaceId);

    const { error } = category === 'Default'
      ? await query.is('category', null)
      : await query.eq('category', category);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // No category → delete the entire marketplace record
  const { error } = await supabase
    .from('marketplaces')
    .delete()
    .eq('id', marketplaceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

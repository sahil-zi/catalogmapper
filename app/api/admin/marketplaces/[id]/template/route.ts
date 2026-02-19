import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { parseFileBuffer } from '@/lib/parsers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketplaceId } = await params;
    const supabase = createServiceClient();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string | null) || null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = parseFileBuffer(buffer, file.name);

    if (parsed.columns.length === 0) {
      return NextResponse.json({ error: 'No columns found in template file' }, { status: 400 });
    }

    // Upload template to storage
    const storagePath = `${marketplaceId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error: uploadError } = await supabase.storage
      .from('marketplace-templates')
      .upload(storagePath, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error('Template upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload template' }, { status: 500 });
    }

    // Update marketplace
    await supabase
      .from('marketplaces')
      .update({ template_file_path: storagePath })
      .eq('id', marketplaceId);

    // Delete existing fields scoped to category (or all if no category)
    const deleteQuery = supabase
      .from('marketplace_fields')
      .delete()
      .eq('marketplace_id', marketplaceId);
    if (category) {
      await deleteQuery.eq('category', category);
    } else {
      await deleteQuery;
    }

    // Insert extracted fields
    const fieldRows = parsed.columns.map((col, idx) => ({
      marketplace_id: marketplaceId,
      field_name: col.name,
      display_name: col.name,
      is_required: false,
      sample_values: col.sample_values,
      field_order: idx,
      category,
    }));

    const { data: fields, error: fieldsError } = await supabase
      .from('marketplace_fields')
      .insert(fieldRows)
      .select();

    if (fieldsError) {
      console.error('Fields insert error:', fieldsError);
      return NextResponse.json({ error: 'Failed to save fields' }, { status: 500 });
    }

    return NextResponse.json({ fields, columnCount: parsed.columns.length });
  } catch (err) {
    console.error('Template upload error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

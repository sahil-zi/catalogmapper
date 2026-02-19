import * as XLSX from 'xlsx';
import type { FieldMapping, MarketplaceField, SessionRow } from '@/lib/types';

export type OutputFormat = 'csv' | 'xlsx';

interface GenerateOptions {
  rows: SessionRow[];
  mappings: FieldMapping[];
  marketplaceFields: MarketplaceField[];
  format: OutputFormat;
}

/**
 * Apply field mappings to session rows and produce a file buffer.
 *
 * - Columns in `mappings` with a marketplace_field_name are included.
 * - marketplace_fields with no mapping produce empty columns (required fields only).
 * - edited_data overrides data for a row.
 */
export function generateOutputBuffer(options: GenerateOptions): Buffer {
  const { rows, mappings, marketplaceFields, format } = options;

  // Build the output column order from marketplace fields (by field_order)
  const orderedFields = [...marketplaceFields].sort(
    (a, b) => (a.field_order ?? 999) - (b.field_order ?? 999)
  );

  // Map: marketplace_field_name → user_column (or null = no source)
  const fieldToUserCol = new Map<string, string | null>();
  for (const field of orderedFields) {
    fieldToUserCol.set(field.field_name, null);
  }
  for (const mapping of mappings) {
    if (mapping.marketplace_field_name) {
      fieldToUserCol.set(mapping.marketplace_field_name, mapping.user_column);
    }
  }

  const headers = orderedFields.map((f) => f.field_name);

  const outputRows: string[][] = rows.map((sessionRow) => {
    const effectiveData = { ...sessionRow.data, ...(sessionRow.edited_data ?? {}) };
    return headers.map((fieldName) => {
      const userCol = fieldToUserCol.get(fieldName) ?? null;
      return userCol ? (effectiveData[userCol] ?? '') : '';
    });
  });

  const wsData = [headers, ...outputRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws);
    return Buffer.from(csv, 'utf-8');
  } else {
    const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return Buffer.from(arrayBuffer);
  }
}

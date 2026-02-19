// ─────────────────────────────────────────────
// Shared TypeScript types for CatalogMapper
// ─────────────────────────────────────────────

export interface Marketplace {
  id: string;
  name: string;
  display_name: string;
  template_file_path: string | null;
  created_at: string;
}

export interface MarketplaceField {
  id: string;
  marketplace_id: string;
  field_name: string;
  display_name: string | null;
  is_required: boolean;
  description: string | null;
  sample_values: string[] | null;
  field_order: number | null;
  category: string | null;
  created_at: string;
}

export interface UploadSession {
  id: string;
  original_filename: string;
  file_path: string;
  marketplace_id: string | null;
  status: SessionStatus;
  row_count: number | null;
  user_columns: UserColumn[] | null;
  category: string | null;
  created_at: string;
  updated_at: string;
  // joined
  marketplace?: Marketplace;
}

export type SessionStatus = 'uploaded' | 'mapped' | 'generating' | 'done' | 'error';

export interface UserColumn {
  name: string;
  sample_values: string[];
}

export interface FieldMapping {
  id: string;
  session_id: string;
  user_column: string;
  marketplace_field_id: string | null;
  marketplace_field_name: string | null;
  ai_suggested: boolean;
  ai_confidence: number | null;
  is_manual_override: boolean;
  created_at: string;
}

export interface GeneratedFile {
  id: string;
  session_id: string;
  file_path: string;
  output_format: 'csv' | 'xlsx';
  row_count: number | null;
  created_at: string;
}

export interface SessionRow {
  id: string;
  session_id: string;
  row_index: number;
  data: Record<string, string>;
  edited_data: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// AI Mapping types
// ─────────────────────────────────────────────

export interface AIMappingSuggestion {
  user_column: string;
  marketplace_field: string | null;
  confidence: number;
}

export interface AIMappingResponse {
  mappings: AIMappingSuggestion[];
}

// ─────────────────────────────────────────────
// Parser types
// ─────────────────────────────────────────────

export interface ParsedFile {
  columns: UserColumn[];
  rows: Record<string, string>[];
  rowCount: number;
}

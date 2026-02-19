-- CatalogMapper Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS marketplaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  template_file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketplace_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_id UUID REFERENCES marketplaces(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  display_name TEXT,
  is_required BOOLEAN DEFAULT false,
  description TEXT,
  sample_values TEXT[],
  field_order INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  marketplace_id UUID REFERENCES marketplaces(id),
  status TEXT DEFAULT 'uploaded',
  row_count INT,
  user_columns JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES upload_sessions(id) ON DELETE CASCADE,
  user_column TEXT NOT NULL,
  marketplace_field_id UUID REFERENCES marketplace_fields(id),
  marketplace_field_name TEXT,
  ai_suggested BOOLEAN DEFAULT false,
  ai_confidence FLOAT,
  is_manual_override BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generated_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES upload_sessions(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  output_format TEXT NOT NULL,
  row_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SKU rows extracted from uploaded files (for the SKU editor)
CREATE TABLE IF NOT EXISTS session_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES upload_sessions(id) ON DELETE CASCADE,
  row_index INT NOT NULL,
  data JSONB NOT NULL,         -- {column_name: value, ...} from original file
  edited_data JSONB,           -- user-edited overrides
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_marketplace_fields_marketplace_id ON marketplace_fields(marketplace_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_marketplace_id ON upload_sessions(marketplace_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_session_id ON field_mappings(session_id);
CREATE INDEX IF NOT EXISTS idx_generated_files_session_id ON generated_files(session_id);
CREATE INDEX IF NOT EXISTS idx_session_rows_session_id ON session_rows(session_id);
CREATE INDEX IF NOT EXISTS idx_session_rows_session_row ON session_rows(session_id, row_index);

-- ─────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_upload_sessions_updated_at
  BEFORE UPDATE ON upload_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_session_rows_updated_at
  BEFORE UPDATE ON session_rows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (service role bypasses all)
-- ─────────────────────────────────────────────

ALTER TABLE marketplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_rows ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write (internal tool — all auth'd users are staff)
CREATE POLICY "auth_read_marketplaces" ON marketplaces FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_marketplaces" ON marketplaces FOR ALL TO authenticated USING (true);

CREATE POLICY "auth_read_marketplace_fields" ON marketplace_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_marketplace_fields" ON marketplace_fields FOR ALL TO authenticated USING (true);

CREATE POLICY "auth_read_upload_sessions" ON upload_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_upload_sessions" ON upload_sessions FOR ALL TO authenticated USING (true);

CREATE POLICY "auth_read_field_mappings" ON field_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_field_mappings" ON field_mappings FOR ALL TO authenticated USING (true);

CREATE POLICY "auth_read_generated_files" ON generated_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_generated_files" ON generated_files FOR ALL TO authenticated USING (true);

CREATE POLICY "auth_read_session_rows" ON session_rows FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_session_rows" ON session_rows FOR ALL TO authenticated USING (true);

-- ─────────────────────────────────────────────
-- STORAGE BUCKETS
-- (Run these as Supabase admin or via Dashboard)
-- ─────────────────────────────────────────────

-- INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('marketplace-templates', 'marketplace-templates', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('generated', 'generated', false);

-- ─────────────────────────────────────────────
-- MIGRATIONS
-- ─────────────────────────────────────────────

-- Add category support (run once)
ALTER TABLE marketplace_fields ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE upload_sessions ADD COLUMN IF NOT EXISTS category TEXT;

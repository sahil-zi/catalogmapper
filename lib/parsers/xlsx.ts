import * as XLSX from 'xlsx';
import type { ParsedFile, UserColumn } from '@/lib/types';

const SAMPLE_ROW_COUNT = 3;
const MAX_ROWS_STORED = 5000;

// Sheet names that are almost certainly instruction/meta sheets, not data sheets
const INSTRUCTION_PATTERNS = [
  /^instructions?$/i,
  /^how[\s_-]?to/i,
  /^read[\s_-]?me$/i,
  /^overview$/i,
  /^guide$/i,
  /^notes?$/i,
  /^help$/i,
  /^info(rmation)?$/i,
  /^about$/i,
  /^cover[\s_-]?(page|sheet)?$/i,
  /^(template[\s_-]?)?guide$/i,
  /^contents?$/i,
  /^index$/i,
  /^introduction$/i,
];

/**
 * Pick the sheet most likely to contain tabular data with column headers.
 * Prefers sheets whose first row has many non-empty cells, and penalises
 * sheets whose name matches common instruction/guide patterns.
 */
function selectDataSheet(workbook: XLSX.WorkBook): string {
  if (workbook.SheetNames.length === 1) return workbook.SheetNames[0];

  let bestSheet = workbook.SheetNames[0];
  let bestScore = -Infinity;

  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: '',
      raw: false,
    });

    // Count non-empty cells in the first row (header row)
    const firstRow: unknown[] = raw[0] ?? [];
    const headerCount = firstRow.filter((h) => String(h ?? '').trim() !== '').length;

    // Penalise instruction-like sheet names heavily
    const isInstruction = INSTRUCTION_PATTERNS.some((p) => p.test(name.trim()));
    const score = headerCount - (isInstruction ? 10000 : 0);

    if (score > bestScore) {
      bestScore = score;
      bestSheet = name;
    }
  }

  return bestSheet;
}

/**
 * Parse a Buffer from a .csv, .xlsx, or .xlsm file.
 * For multi-sheet workbooks, automatically selects the sheet that looks most
 * like a data template (most header columns, not named like an instruction sheet).
 * Returns columns with sample values and all data rows.
 */
export function parseFileBuffer(buffer: Buffer, filename: string): ParsedFile {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = selectDataSheet(workbook);
  const worksheet = workbook.Sheets[sheetName];

  // Convert to array-of-arrays to handle header extraction
  const raw: (string | number | boolean | Date | null)[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (raw.length < 1) {
    return { columns: [], rows: [], rowCount: 0 };
  }

  const headers = raw[0].map((h) => String(h ?? '').trim()).filter(Boolean);
  const dataRows = raw.slice(1).filter((row) =>
    row.some((cell) => cell !== '' && cell !== null && cell !== undefined)
  );

  // Build columns with sample values
  const columns: UserColumn[] = headers.map((header, colIdx) => {
    const samples: string[] = [];
    for (let r = 0; r < Math.min(SAMPLE_ROW_COUNT, dataRows.length); r++) {
      const val = dataRows[r][colIdx];
      if (val !== '' && val !== null && val !== undefined) {
        samples.push(String(val));
      }
    }
    return { name: header, sample_values: samples };
  });

  // Build row objects (capped to MAX_ROWS_STORED)
  const rows: Record<string, string>[] = dataRows
    .slice(0, MAX_ROWS_STORED)
    .map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, i) => {
        obj[header] = String(row[i] ?? '');
      });
      return obj;
    });

  return { columns, rows, rowCount: dataRows.length };
}

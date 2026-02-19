import * as XLSX from 'xlsx';
import type { ParsedFile, UserColumn } from '@/lib/types';

const SAMPLE_ROW_COUNT = 3;
const MAX_ROWS_STORED = 5000;

/**
 * Parse a Buffer from a .csv, .xlsx, or .xlsm file.
 * Returns columns with sample values and all data rows.
 */
export function parseFileBuffer(buffer: Buffer, filename: string): ParsedFile {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
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

import XLSX from "xlsx";

export type SpreadsheetFormat = "csv" | "xlsx";

export type ParsedSpreadsheetRow = {
  rowIndex: number;
  raw: Record<string, unknown>;
  normalized: Record<string, unknown>;
};

function normalizeHeader(value: string) {
  return String(value ?? "")
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeRow(row: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[normalizeHeader(key)] = value;
  });
  return normalized;
}

export function detectFormat(fileName?: string): SpreadsheetFormat {
  const lower = String(fileName ?? "")
    .toLocaleLowerCase("en")
    .trim();
  if (lower.endsWith(".csv")) return "csv";
  return "xlsx";
}

export function parseSpreadsheetFromBase64(contentBase64: string): ParsedSpreadsheetRow[] {
  const buffer = Buffer.from(contentBase64, "base64");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: ""
  });

  return rows.map((row, index) => ({
    rowIndex: index + 2,
    raw: row,
    normalized: normalizeRow(row)
  }));
}

export function pickString(
  row: Record<string, unknown>,
  aliases: string[],
  fallback = ""
) {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];
    if (value === undefined || value === null) continue;
    const str = String(value).trim();
    if (str.length) return str;
  }
  return fallback;
}

export function pickNumber(
  row: Record<string, unknown>,
  aliases: string[],
  fallback = NaN
) {
  const raw = pickString(row, aliases, "");
  if (!raw) return fallback;
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : fallback;
}

export function pickBoolean(
  row: Record<string, unknown>,
  aliases: string[],
  fallback = false
) {
  const raw = pickString(row, aliases, "").toLocaleLowerCase("tr");
  if (!raw) return fallback;
  if (["1", "true", "evet", "aktif", "yes"].includes(raw)) return true;
  if (["0", "false", "hayir", "pasif", "no"].includes(raw)) return false;
  return fallback;
}

function escapeCsvCell(value: unknown) {
  const text = value === undefined || value === null ? "" : String(value);
  if (/[",;\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildCsv(headers: string[], rows: Array<Array<unknown>>) {
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(row.map((cell) => escapeCsvCell(cell)).join(","));
  });
  return `\uFEFF${lines.join("\n")}`;
}

export function buildXlsxBuffer(
  headers: string[],
  rows: Array<Array<unknown>>,
  sheetName = "Sheet1"
) {
  const aoa = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const array = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx"
  });
  return Buffer.from(array);
}

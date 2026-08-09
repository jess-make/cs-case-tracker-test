"use client";

import { useMemo, useState, useTransition } from "react";
import { readSheet, type CellValue } from "read-excel-file/browser";
import {
  CheckCircle2,
  Download,
  FileUp,
  Loader2,
  UploadCloud,
} from "lucide-react";
import {
  importReturnExchangeCasesAction,
  type ImportReturnExchangeCasesResult,
  validateReturnExchangeCasesAction,
  type ValidateReturnExchangeCasesResult,
} from "@/app/actions/return-exchange-upload";
import {
  RETURN_EXCHANGE_UPLOAD_FIELD_KEYS,
  RETURN_EXCHANGE_UPLOAD_HEADERS,
  type ReturnExchangeUploadRow,
} from "@/lib/return-exchange-upload";

type PreviewState = {
  fileName: string;
  rows: ReturnExchangeUploadRow[];
};

type SpreadsheetCell = CellValue<number> | null;

const SAMPLE_ROWS: ReturnExchangeUploadRow[] = [
  {
    ecommerce_order_no: "SP202608090001",
    shipping_tracking_no: "D1234567890",
    batch_no: "BATCH-202608-001",
    customer_name: "王小明",
    source_detail: "蝦皮商城",
    complaint_type: "退貨",
    complaint_subtype: "商品功能異常",
    description: "客戶申請退貨，待品檢確認。",
  },
];

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildSampleCsv(): string {
  const rows = [
    RETURN_EXCHANGE_UPLOAD_HEADERS,
    ...SAMPLE_ROWS.map((sample) =>
      RETURN_EXCHANGE_UPLOAD_FIELD_KEYS.map((key) => sample[key])
    ),
  ];
  return `\uFEFF${rows
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n")}\r\n`;
}

function downloadSample() {
  const blob = new Blob([buildSampleCsv()], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "退換貨案件上傳範例.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function assertExpectedHeaders(headers: string[]) {
  const normalized = headers.map((header) => header.trim());
  const matches =
    normalized.length === RETURN_EXCHANGE_UPLOAD_HEADERS.length &&
    RETURN_EXCHANGE_UPLOAD_HEADERS.every(
      (expected, index) => normalized[index] === expected
    );

  if (!matches) {
    throw new Error(
      `欄位順序需為：${RETURN_EXCHANGE_UPLOAD_HEADERS.join(" / ")}`
    );
  }
}

function cellsToRow(cells: string[]): ReturnExchangeUploadRow {
  return RETURN_EXCHANGE_UPLOAD_FIELD_KEYS.reduce((row, key, index) => {
    row[key] = cells[index]?.trim() ?? "";
    return row;
  }, {} as ReturnExchangeUploadRow);
}

function parseRows(headers: string[], rawRows: string[][], fileName: string): PreviewState {
  assertExpectedHeaders(headers);

  const rows = rawRows
    .map(cellsToRow)
    .filter((row) =>
      RETURN_EXCHANGE_UPLOAD_FIELD_KEYS.some((key) => row[key].trim() !== "")
    );

  if (rows.length === 0) {
    throw new Error("檔案沒有可匯入的資料列");
  }

  return { fileName, rows };
}

function parseDelimitedPreview(text: string, fileName: string): PreviewState {
  const normalized = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("檔案沒有可預覽的資料");
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = parseDelimitedLine(lines[0], delimiter);
  const rawRows = lines
    .slice(1)
    .map((line) => parseDelimitedLine(line, delimiter));

  return parseRows(headers, rawRows, fileName);
}

function spreadsheetCellToString(value: SpreadsheetCell): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function parseSpreadsheetRows(
  spreadsheetRows: SpreadsheetCell[][],
  fileName: string
): PreviewState {
  const rows = spreadsheetRows
    .map((row) => row.map(spreadsheetCellToString))
    .filter((row) => row.some((cell) => cell.trim() !== ""));

  if (rows.length === 0) {
    throw new Error("檔案沒有可預覽的資料");
  }

  return parseRows(rows[0], rows.slice(1), fileName);
}

function isXlsxFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".xlsx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

function isCsvFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".csv") ||
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel"
  );
}

async function parseFilePreview(file: File): Promise<PreviewState> {
  if (isXlsxFile(file)) {
    const rows = await readSheet<number>(file);
    return parseSpreadsheetRows(rows, file.name);
  }

  if (isCsvFile(file)) {
    return parseDelimitedPreview(await file.text(), file.name);
  }

  throw new Error("僅支援 CSV 或 XLSX 檔案");
}

export function ReturnExchangeUploadPanel() {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] =
    useState<ImportReturnExchangeCasesResult | null>(null);
  const [validationResult, setValidationResult] =
    useState<ValidateReturnExchangeCasesResult | null>(null);
  const [pendingPreview, setPendingPreview] = useState(false);
  const [pendingImport, startImportTransition] = useTransition();

  const previewRows = useMemo(() => preview?.rows.slice(0, 30) ?? [], [preview]);
  const canImport = Boolean(preview && validationResult?.ok);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    setResult(null);
    setValidationResult(null);
    setPreview(null);
    if (!file) return;

    setPendingPreview(true);
    try {
      const nextPreview = await parseFilePreview(file);
      setPreview(nextPreview);
      const nextValidation = await validateReturnExchangeCasesAction(
        nextPreview.rows
      );
      setValidationResult(nextValidation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "檔案預覽失敗");
    } finally {
      setPendingPreview(false);
      e.target.value = "";
    }
  }

  function handleImport() {
    if (!preview || !canImport || pendingImport) return;
    setError(null);
    setResult(null);
    startImportTransition(async () => {
      const importResult = await importReturnExchangeCasesAction(preview.rows);
      setResult(importResult);
      if (importResult.ok) {
        setPreview(null);
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">上傳報表</h2>
            <p className="mt-1 text-sm text-slate-500">CSV / XLSX</p>
          </div>
          <button
            type="button"
            onClick={downloadSample}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            <Download className="h-4 w-4" />
            下載範例
          </button>
        </div>

        <div className="mt-5">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            報表檔案
          </label>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            {pendingPreview ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            選擇檔案
            <input
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={handleFileChange}
              disabled={pendingPreview || pendingImport}
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {result && !result.ok && (
          <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <p>{result.error}</p>
            {result.rowErrors && result.rowErrors.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {result.rowErrors.map((rowError) => (
                  <li key={rowError}>{rowError}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {result?.ok && (
          <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              已匯入 {result.importedCount} 筆
            </div>
            <p className="mt-1 break-all text-emerald-800">
              {result.caseNumbers.join("、")}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">預覽</h2>
            {preview && (
              <p className="mt-1 text-sm text-slate-500">
                {preview.fileName} · 共 {preview.rows.length} 筆
              </p>
            )}
          </div>
          {preview && (
            <button
              type="button"
              onClick={handleImport}
              disabled={pendingImport || pendingPreview || !canImport}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto"
            >
              {pendingImport ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              確認匯入
            </button>
          )}
        </div>

        {!preview ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            尚未選擇檔案
          </div>
        ) : (
          <div className="space-y-4">
            {pendingPreview && (
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                檢查欄位規則中
              </div>
            )}

            {validationResult && !validationResult.ok && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <p>{validationResult.error}</p>
                {validationResult.rowErrors &&
                  validationResult.rowErrors.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {validationResult.rowErrors.map((rowError) => (
                        <li key={rowError}>{rowError}</li>
                      ))}
                    </ul>
                  )}
              </div>
            )}

            {validationResult?.ok && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                檢查通過，共 {validationResult.validCount} 筆可匯入
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {RETURN_EXCHANGE_UPLOAD_HEADERS.map((header) => (
                      <th
                        key={header}
                        className="px-3 py-2 font-medium text-slate-600"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-slate-50">
                      {RETURN_EXCHANGE_UPLOAD_FIELD_KEYS.map((key) => (
                        <td key={key} className="px-3 py-2 text-slate-700">
                          {row[key] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

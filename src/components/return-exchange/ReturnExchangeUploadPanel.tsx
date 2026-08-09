"use client";

import { useMemo, useState } from "react";
import { Download, FileUp, Loader2 } from "lucide-react";

type PreviewState = {
  fileName: string;
  headers: string[];
  rows: string[][];
};

const SAMPLE_HEADERS = [
  "批號",
  "客戶姓名",
  "客戶聯繫方式",
  "案件類別",
  "子分類",
  "服務管道",
  "電商訂單編號",
  "問題描述",
];

const SAMPLE_ROWS = [
  [
    "BATCH-202608-001",
    "王小明",
    "0912345678",
    "退貨",
    "商品功能異常",
    "蝦皮商城",
    "SP202608090001",
    "客戶申請退貨，待品檢確認。",
  ],
];

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildSampleCsv(): string {
  const rows = [SAMPLE_HEADERS, ...SAMPLE_ROWS];
  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}\r\n`;
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

function parsePreview(text: string, fileName: string): PreviewState {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    throw new Error("檔案沒有可預覽的資料");
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = parseDelimitedLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line) => parseDelimitedLine(line, delimiter));

  return { fileName, headers, rows };
}

export function ReturnExchangeUploadPanel() {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const previewRows = useMemo(() => preview?.rows.slice(0, 30) ?? [], [preview]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    setPreview(null);
    if (!file) return;

    setPending(true);
    try {
      const text = await file.text();
      setPreview(parsePreview(text, file.name));
    } catch (err) {
      setError(err instanceof Error ? err.message : "檔案預覽失敗");
    } finally {
      setPending(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">上傳報表</h2>
            <p className="mt-1 text-sm text-slate-500">CSV / TSV</p>
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
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            選擇檔案
            <input
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
              className="hidden"
              onChange={handleFileChange}
              disabled={pending}
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-900">預覽</h2>
          {preview && (
            <p className="text-sm text-slate-500">
              {preview.fileName} · 共 {preview.rows.length} 筆
            </p>
          )}
        </div>

        {!preview ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            尚未選擇檔案
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {preview.headers.map((header, index) => (
                    <th
                      key={`${header}-${index}`}
                      className="px-3 py-2 font-medium text-slate-600"
                    >
                      {header || `欄位 ${index + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-slate-50">
                    {preview.headers.map((_, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-2 text-slate-700">
                        {row[cellIndex] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

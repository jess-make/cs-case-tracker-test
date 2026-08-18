import { strToU8, zipSync } from "fflate";

export type SpreadsheetCell = string | number | null | undefined;
export type SpreadsheetRow = SpreadsheetCell[];
export type SpreadsheetSheet = {
  name: string;
  rows: SpreadsheetRow[];
};

function escapeXml(value: SpreadsheetCell): string {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeXmlAttribute(value: string): string {
  return escapeXml(value).replace(/"/g, "&quot;");
}

function columnName(index: number): string {
  let value = index + 1;
  let name = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

function normalizeSheetName(sheetName: string): string {
  const trimmed = sheetName.trim() || "報表";
  return trimmed.replace(/[\[\]:*?/\\]/g, "").slice(0, 31) || "報表";
}

function uniqueSheetNames(sheets: SpreadsheetSheet[]): SpreadsheetSheet[] {
  const seen = new Map<string, number>();
  return sheets.map((sheet, index) => {
    const baseName = normalizeSheetName(sheet.name || `Sheet${index + 1}`);
    const count = seen.get(baseName) ?? 0;
    seen.set(baseName, count + 1);
    const name =
      count === 0
        ? baseName
        : `${baseName.slice(0, Math.max(0, 28 - String(count + 1).length))} (${count + 1})`;

    return { ...sheet, name };
  });
}

function buildWorksheetXml(rows: SpreadsheetRow[]): string {
  const rowsXml = rows
    .map((spreadsheetRow, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cellsXml = spreadsheetRow
        .map((cell, columnIndex) => {
          const ref = `${columnName(columnIndex)}${rowNumber}`;
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell)}</t></is></c>`;
        })
        .join("");

      return `<row r="${rowNumber}">${cellsXml}</row>`;
    })
    .join("");

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetData>${rowsXml}</sheetData>` +
    `</worksheet>`
  );
}

export function parseCsvRows(csv: string): string[][] {
  const text = csv.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\r" || char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
    } else {
      cell += char;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

export function buildXlsxWorkbook(
  rows: SpreadsheetRow[],
  sheetName: string
): Uint8Array {
  return buildXlsxWorkbookWithSheets([{ name: sheetName, rows }]);
}

export function buildXlsxWorkbookWithSheets(
  inputSheets: SpreadsheetSheet[]
): Uint8Array {
  const sheets =
    inputSheets.length > 0
      ? uniqueSheetNames(inputSheets)
      : [{ name: "報表", rows: [] }];

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        sheets
          .map(
            (_, index) =>
              `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
          )
          .join("") +
        `</Types>`
    ),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets>` +
        sheets
          .map(
            (sheet, index) =>
              `<sheet name="${escapeXmlAttribute(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
          )
          .join("") +
        `</sheets>` +
        `</workbook>`
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        sheets
          .map(
            (_, index) =>
              `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
          )
          .join("") +
        `</Relationships>`
    ),
  };

  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(
      buildWorksheetXml(sheet.rows)
    );
  });

  return zipSync(files, { level: 6 });
}

export function buildXlsxWorkbookFromCsv(
  csv: string,
  sheetName: string
): Uint8Array {
  return buildXlsxWorkbook(parseCsvRows(csv), sheetName);
}

export const RETURN_EXCHANGE_UPLOAD_HEADERS = [
  "電商訂單編號",
  "寄件編號",
  "批號",
  "客戶姓名",
  "服務管道",
  "案件類別",
  "子分類",
  "問題描述",
] as const;

export const RETURN_EXCHANGE_ALLOWED_CATEGORIES = ["退貨", "換貨"] as const;

export type ReturnExchangeUploadHeader =
  (typeof RETURN_EXCHANGE_UPLOAD_HEADERS)[number];

export type ReturnExchangeUploadRow = {
  ecommerce_order_no: string;
  shipping_tracking_no: string;
  batch_no: string;
  customer_name: string;
  source_detail: string;
  complaint_type: string;
  complaint_subtype: string;
  description: string;
};

export const RETURN_EXCHANGE_UPLOAD_FIELD_KEYS = [
  "ecommerce_order_no",
  "shipping_tracking_no",
  "batch_no",
  "customer_name",
  "source_detail",
  "complaint_type",
  "complaint_subtype",
  "description",
] as const satisfies readonly (keyof ReturnExchangeUploadRow)[];

export const RETURN_EXCHANGE_UPLOAD_FIELD_LABELS: Record<
  keyof ReturnExchangeUploadRow,
  ReturnExchangeUploadHeader
> = {
  ecommerce_order_no: "電商訂單編號",
  shipping_tracking_no: "寄件編號",
  batch_no: "批號",
  customer_name: "客戶姓名",
  source_detail: "服務管道",
  complaint_type: "案件類別",
  complaint_subtype: "子分類",
  description: "問題描述",
};

export function normalizeUploadCell(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function isEmptyUploadRow(row: ReturnExchangeUploadRow): boolean {
  return RETURN_EXCHANGE_UPLOAD_FIELD_KEYS.every(
    (key) => normalizeUploadCell(row[key]) === ""
  );
}

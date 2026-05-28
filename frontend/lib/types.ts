// 백엔드 API 응답 타입. backend/prisma/schema.prisma 와 일치시킨다.

export type ReceiptStatus =
  | "PENDING"
  | "PROCESSING"
  | "PARSED"
  | "CONFIRMED"
  | "FAILED";

export interface ReceiptItem {
  id: string;
  receiptId: string;
  name: string;
  quantity: number;
  unitPrice: number | null;
  amount: number;
}

export interface Receipt {
  id: string;
  imageUrl: string;
  imageKey: string | null;
  status: ReceiptStatus;
  vendor: string | null;
  totalAmount: number | null;
  currency: string;
  purchasedAt: string | null; // ISO string
  ocrError: string | null;
  createdAt: string;
  updatedAt: string;
  items?: ReceiptItem[];
}

export interface ReceiptListResponse {
  receipts: Receipt[];
}

export interface ReceiptOneResponse {
  receipt: Receipt;
  ocrFailed?: boolean;
}

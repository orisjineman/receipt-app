import axios from "axios";
import { env } from "../config/env";

/**
 * Upstage Universal Information Extraction API.
 * https://console.upstage.ai/docs/capabilities/information-extraction/universal-information-extraction
 *
 * 영수증 이미지를 보내면 JSON Schema 에 맞춰 구조화된 결과를 직접 반환한다.
 * 별도 OCR + 휴리스틱 파싱 단계가 필요 없다.
 */

const ENDPOINT = "https://api.upstage.ai/v1/information-extraction";

const RECEIPT_SCHEMA = {
  type: "object",
  properties: {
    vendor: {
      type: "string",
      description:
        "영수증 발행 가맹점 이름. 한글 매장명이 있으면 한글을 우선 사용 (예: '뚜레쥬르 강남역점').",
    },
    total_amount: {
      type: "integer",
      description:
        "최종 결제 금액. 원 단위 정수, 콤마 없이 (예: 15900). '합계' 또는 '결제 금액'에 해당하는 값.",
    },
    purchased_at: {
      type: "string",
      description: "구매 일자. ISO 8601 형식 YYYY-MM-DD (예: '2026-05-21').",
    },
    items: {
      type: "array",
      description: "구매 품목 목록.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "상품명" },
          quantity: { type: "integer", description: "수량" },
          unit_price: { type: "integer", description: "단가 (원, 콤마 없이)" },
          amount: {
            type: "integer",
            description: "라인 합계 금액 (원, 콤마 없이)",
          },
        },
      },
    },
  },
  required: ["vendor", "total_amount"],
} as const;

export interface ExtractedReceiptItem {
  name: string | null;
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
}

export interface ExtractedReceipt {
  vendor: string | null;
  totalAmount: number | null;
  purchasedAt: Date | null;
  items: ExtractedReceiptItem[];
  raw: unknown;
}

export async function extractReceiptInfo(file: {
  buffer: Buffer;
  mimetype: string;
}): Promise<ExtractedReceipt> {
  const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

  const { data } = await axios.post(
    ENDPOINT,
    {
      model: "information-extract",
      messages: [
        {
          role: "user",
          content: [{ type: "image_url", image_url: { url: dataUrl } }],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "receipt_schema",
          schema: RECEIPT_SCHEMA,
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${env.UPSTAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      maxBodyLength: 30 * 1024 * 1024,
      timeout: 90_000,
    },
  );

  return parseExtractionResponse(data);
}

export function parseExtractionResponse(data: unknown): ExtractedReceipt {
  const content = (data as any)?.choices?.[0]?.message?.content;
  let extracted: Record<string, any> = {};
  if (typeof content === "string") {
    try {
      extracted = JSON.parse(content);
    } catch {
      // 빈 객체로 폴백
    }
  } else if (content && typeof content === "object") {
    extracted = content as Record<string, any>;
  }

  const items: ExtractedReceiptItem[] = Array.isArray(extracted.items)
    ? extracted.items.map((it: any) => ({
        name: typeof it?.name === "string" ? it.name : null,
        quantity: Number.isFinite(it?.quantity) ? Number(it.quantity) : null,
        unitPrice: Number.isFinite(it?.unit_price)
          ? Number(it.unit_price)
          : null,
        amount: Number.isFinite(it?.amount) ? Number(it.amount) : null,
      }))
    : [];

  return {
    vendor: typeof extracted.vendor === "string" ? extracted.vendor : null,
    totalAmount: Number.isFinite(extracted.total_amount)
      ? Number(extracted.total_amount)
      : null,
    purchasedAt:
      typeof extracted.purchased_at === "string"
        ? parseDateLoose(extracted.purchased_at)
        : null,
    items,
    raw: data,
  };
}

function parseDateLoose(s: string): Date | null {
  // YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD
  const m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

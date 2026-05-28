/**
 * Upstage Information Extraction API 단독 테스트.
 *
 * 실행:
 *   cd backend && npx tsx scripts/test-ie.ts
 *   TEST_IMAGES=receipt5.png npx tsx scripts/test-ie.ts
 *
 * src/services/upstage.ts 의 extractReceiptInfo 와 동일한 스키마를 사용한다.
 * (env 검증을 우회하려고 service 함수 대신 axios로 직접 호출)
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const API_KEY = process.env.UPSTAGE_API_KEY;
if (!API_KEY || API_KEY.includes("xxxxx")) {
  console.error("❌ UPSTAGE_API_KEY 가 backend/.env 에 설정되어 있지 않습니다.");
  process.exit(1);
}

const ENDPOINT = "https://api.upstage.ai/v1/information-extraction";

const TEST_IMAGES = (process.env.TEST_IMAGES?.split(",").map((s) => s.trim()) ?? [
  "receipt2.png",
  "receipt3.png",
]).filter(Boolean);

const DELAY_MS = Number(process.env.OCR_DELAY_MS ?? 65_000);

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
};

const IMAGES_DIR = path.resolve(__dirname, "../../test_images");

async function runOne(filename: string) {
  console.log(`\n========== ${filename} ==========`);
  const full = path.join(IMAGES_DIR, filename);
  const buf = fs.readFileSync(full);
  const ext = (filename.split(".").pop() ?? "png").toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  console.log(`파일 크기: ${(buf.length / 1024).toFixed(1)} KB / mime: ${mime}`);

  const t0 = Date.now();
  let data: any;
  try {
    const res = await axios.post(
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
          json_schema: { name: "receipt_schema", schema: RECEIPT_SCHEMA },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        maxBodyLength: 30 * 1024 * 1024,
        timeout: 90_000,
      },
    );
    data = res.data;
  } catch (e: any) {
    console.error(
      `❌ Upstage IE 호출 실패: ${e?.response?.status} ${e?.response?.statusText}`,
    );
    console.error("응답:", JSON.stringify(e?.response?.data, null, 2));
    return;
  }
  console.log(`✅ IE 응답 ${Date.now() - t0}ms`);

  // OpenAI 호환 응답
  const content = data?.choices?.[0]?.message?.content;
  let extracted: any = {};
  if (typeof content === "string") {
    try {
      extracted = JSON.parse(content);
    } catch {
      console.error("⚠️ content JSON 파싱 실패:", content);
    }
  } else if (content && typeof content === "object") {
    extracted = content;
  }

  console.log("\n--- 추출 결과 ---");
  console.log(JSON.stringify(extracted, null, 2));

  console.log("\n--- 토큰 사용량 ---");
  console.log(data?.usage);
}

(async () => {
  for (let i = 0; i < TEST_IMAGES.length; i++) {
    try {
      await runOne(TEST_IMAGES[i]);
    } catch (e) {
      console.error(`예외 (${TEST_IMAGES[i]}):`, e);
    }
    if (i < TEST_IMAGES.length - 1) {
      console.log(`\n⏳ ${DELAY_MS / 1000}초 대기 (Rate Limit 회피)...`);
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
})();

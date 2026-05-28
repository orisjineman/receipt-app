/**
 * Upstage Document OCR 단독 테스트 스크립트.
 *
 * 실행: cd backend && npx tsx scripts/test-ocr.ts
 *
 * .env 의 UPSTAGE_API_KEY 만 있으면 동작한다.
 * (DB, Blob 등은 사용하지 않음)
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import FormData from "form-data";

const API_KEY = process.env.UPSTAGE_API_KEY;
const URL =
  process.env.UPSTAGE_OCR_URL ??
  "https://api.upstage.ai/v1/document-ai/ocr";

if (!API_KEY || API_KEY.includes("xxxxx")) {
  console.error("❌ UPSTAGE_API_KEY 가 backend/.env 에 설정되어 있지 않습니다.");
  process.exit(1);
}

const TEST_IMAGES = (process.env.TEST_IMAGES?.split(",").map((s) => s.trim()) ?? [
  "receipt2.png",
  "receipt3.png",
]).filter(Boolean);
const IMAGES_DIR = path.resolve(__dirname, "../../test_images");

async function runOne(filename: string) {
  console.log(`\n========== ${filename} ==========`);
  const full = path.join(IMAGES_DIR, filename);
  const buf = fs.readFileSync(full);
  console.log(`파일 크기: ${(buf.length / 1024).toFixed(1)} KB`);

  const form = new FormData();
  form.append("document", buf, {
    filename,
    contentType: "image/png",
  });

  const t0 = Date.now();
  let data: any;
  try {
    const res = await axios.post(URL, form, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        ...form.getHeaders(),
      },
      maxBodyLength: 20 * 1024 * 1024,
      timeout: 60_000,
    });
    data = res.data;
  } catch (e: any) {
    console.error(
      `❌ Upstage 호출 실패: ${e?.response?.status} ${e?.response?.statusText}`,
    );
    console.error("응답:", JSON.stringify(e?.response?.data, null, 2));
    return;
  }
  console.log(`✅ OCR 응답 ${Date.now() - t0}ms`);

  // 응답에서 text 추출 (upstage는 응답 구조가 다양함)
  const text =
    typeof data?.text === "string"
      ? data.text
      : Array.isArray(data?.pages)
        ? data.pages.map((p: any) => p?.text ?? "").join("\n")
        : "";

  console.log("\n--- 추출 텍스트 ---");
  console.log(text || "(텍스트 없음)");

  console.log("\n--- 휴리스틱 파싱 ---");
  const parsed = parseReceiptText(text);
  console.log(parsed);

  console.log("\n--- 응답 최상위 키들 ---");
  console.log(Object.keys(data ?? {}));
}

// upstage.ts 의 파싱 로직 인라인 복사 (단독 실행 위해)
function parseReceiptText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const totalLine = lines.find((l) =>
    /(합\s*계|총\s*액|결제\s*금액|승인\s*금액|total)/i.test(l),
  );
  const totalAmount = totalLine ? extractAmount(totalLine) : null;

  const dateMatch = text.match(/(20\d{2})[./-](\d{1,2})[./-](\d{1,2})/);
  const purchasedAt = dateMatch
    ? new Date(
        Number(dateMatch[1]),
        Number(dateMatch[2]) - 1,
        Number(dateMatch[3]),
      ).toISOString()
    : null;

  return {
    vendor: lines[0] ?? null,
    totalAmount,
    purchasedAt,
    totalLineFound: totalLine ?? null,
  };
}

function extractAmount(line: string): number | null {
  const m = line.match(/([\d,]+)\s*(원|won)?/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

const DELAY_BETWEEN_MS = Number(process.env.OCR_DELAY_MS ?? 65_000);

(async () => {
  for (let i = 0; i < TEST_IMAGES.length; i++) {
    const f = TEST_IMAGES[i];
    try {
      await runOne(f);
    } catch (e) {
      console.error(`예외 (${f}):`, e);
    }
    if (i < TEST_IMAGES.length - 1) {
      console.log(`\n⏳ ${DELAY_BETWEEN_MS / 1000}초 대기 (Rate Limit 회피)...`);
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_MS));
    }
  }
})();

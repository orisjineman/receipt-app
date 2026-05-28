import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1),
  // Vercel-Neon 자동 연동 변수명. 마이그레이션 시 prisma가 사용.
  DATABASE_URL_UNPOOLED: z.string().optional(),

  BASIC_AUTH_USER: z.string().min(1),
  BASIC_AUTH_PASSWORD: z.string().min(8),

  BLOB_READ_WRITE_TOKEN: z.string().min(1),

  UPSTAGE_API_KEY: z.string().min(1),
  UPSTAGE_OCR_URL: z
    .string()
    .url()
    .default("https://api.upstage.ai/v1/document-ai/ocr"),

  CORS_ORIGINS: z.string().default("http://localhost:3000"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(",").map((s) => s.trim());

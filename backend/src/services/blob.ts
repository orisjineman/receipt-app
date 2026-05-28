import {
  put,
  del,
  issueSignedToken,
  presignUrl,
  type PutBlobResult,
} from "@vercel/blob";
import { env } from "../config/env";

export interface UploadedBlob {
  url: string;
  pathname: string;
}

export async function uploadReceiptImage(file: {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
}): Promise<UploadedBlob> {
  const ext = file.originalname.includes(".")
    ? file.originalname.split(".").pop()
    : (file.mimetype.split("/")[1] ?? "bin");
  const pathname = `receipts/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const result: PutBlobResult = await put(pathname, file.buffer, {
    access: "private",
    contentType: file.mimetype,
    token: env.BLOB_READ_WRITE_TOKEN,
  });

  return { url: result.url, pathname: result.pathname };
}

export async function deleteReceiptImage(urlOrPathname: string): Promise<void> {
  await del(urlOrPathname, { token: env.BLOB_READ_WRITE_TOKEN });
}

/**
 * Private blob 에 대한 1시간 짜리 signed GET URL 생성.
 * GET /api/receipts/:id/image 라우트에서 302 redirect 용도로 사용.
 */
export async function getReceiptImageSignedUrl(
  pathname: string,
): Promise<string> {
  const validUntil = Date.now() + 60 * 60 * 1000;

  const issued = await issueSignedToken({
    pathname,
    operations: ["get"],
    validUntil,
    token: env.BLOB_READ_WRITE_TOKEN,
  });

  const { presignedUrl } = await presignUrl(issued, {
    operation: "get",
    pathname,
    access: "private",
  });

  return presignedUrl;
}

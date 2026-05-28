import { put, del, type PutBlobResult } from "@vercel/blob";
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
    access: "public",
    contentType: file.mimetype,
    token: env.BLOB_READ_WRITE_TOKEN,
  });

  return { url: result.url, pathname: result.pathname };
}

export async function deleteReceiptImage(urlOrPathname: string): Promise<void> {
  await del(urlOrPathname, { token: env.BLOB_READ_WRITE_TOKEN });
}

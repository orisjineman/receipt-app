import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { basicAuth } from "../middleware/basicAuth";
import {
  uploadReceiptImage,
  deleteReceiptImage,
  getReceiptImageSignedUrl,
} from "../services/blob";
import { extractReceiptInfo } from "../services/upstage";
import { HttpError } from "../middleware/error";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.use(basicAuth);

// GET /receipts
router.get("/", async (_req, res, next) => {
  try {
    const receipts = await prisma.receipt.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
    res.json({ receipts });
  } catch (e) {
    next(e);
  }
});

// GET /receipts/:id/image - private blob signed URL 로 302 redirect
router.get("/:id/image", async (req, res, next) => {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: req.params.id },
      select: { imageKey: true, imageUrl: true },
    });
    if (!receipt) throw new HttpError(404, "RECEIPT_NOT_FOUND");

    const pathname = receipt.imageKey;
    if (!pathname) throw new HttpError(404, "IMAGE_NOT_AVAILABLE");

    const signed = await getReceiptImageSignedUrl(pathname);
    res.redirect(302, signed);
  } catch (e) {
    next(e);
  }
});

// GET /receipts/:id
router.get("/:id", async (req, res, next) => {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: req.params.id },
      include: { items: true, expense: true },
    });
    if (!receipt) throw new HttpError(404, "RECEIPT_NOT_FOUND");
    res.json({ receipt });
  } catch (e) {
    next(e);
  }
});

// POST /receipts - 영수증 이미지 업로드 + OCR 실행
router.post("/", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, "FILE_REQUIRED");

    // 1) Vercel Blob 업로드
    const blob = await uploadReceiptImage(req.file);

    // 2) Receipt PROCESSING 상태로 생성
    const created = await prisma.receipt.create({
      data: {
        imageUrl: blob.url,
        imageKey: blob.pathname,
        status: "PROCESSING",
      },
    });

    // 3) Upstage Information Extraction (JSON Schema 기반 구조화 추출)
    try {
      const extracted = await extractReceiptInfo(req.file);

      const updated = await prisma.receipt.update({
        where: { id: created.id },
        data: {
          status: "PARSED",
          vendor: extracted.vendor,
          totalAmount: extracted.totalAmount,
          purchasedAt: extracted.purchasedAt,
          ocrRaw: extracted.raw as object,
          items: {
            create: extracted.items
              .filter((it) => it.name)
              .map((it) => ({
                name: it.name!,
                quantity: it.quantity ?? 1,
                unitPrice: it.unitPrice,
                amount: it.amount ?? 0,
              })),
          },
        },
        include: { items: true },
      });
      res.status(201).json({ receipt: updated });
    } catch (ocrErr) {
      const updated = await prisma.receipt.update({
        where: { id: created.id },
        data: {
          status: "FAILED",
          ocrError: ocrErr instanceof Error ? ocrErr.message : String(ocrErr),
        },
      });
      res.status(201).json({ receipt: updated, ocrFailed: true });
    }
  } catch (e) {
    next(e);
  }
});

// PATCH /receipts/:id
const patchSchema = z.object({
  vendor: z.string().optional(),
  totalAmount: z.number().int().nonnegative().optional(),
  purchasedAt: z.coerce.date().optional(),
});

router.patch("/:id", async (req, res, next) => {
  try {
    const data = patchSchema.parse(req.body);
    const existing = await prisma.receipt.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw new HttpError(404, "RECEIPT_NOT_FOUND");

    const updated = await prisma.receipt.update({
      where: { id: existing.id },
      data,
    });
    res.json({ receipt: updated });
  } catch (e) {
    next(e);
  }
});

// DELETE /receipts/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.receipt.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw new HttpError(404, "RECEIPT_NOT_FOUND");

    if (existing.imageKey) {
      await deleteReceiptImage(existing.imageUrl).catch(() => null);
    }
    await prisma.receipt.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;

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
      include: { items: true, category: true },
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
      include: { items: true, expense: true, category: true },
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
    //    사용자 카테고리 목록을 함께 보내서 LLM 이 그 중 하나를 제안하게 함
    try {
      const categories = await prisma.category.findMany({
        select: { id: true, name: true },
      });
      const extracted = await extractReceiptInfo(
        req.file,
        categories.map((c) => c.name),
      );

      // suggestedCategory 가 기존 카테고리명과 정확히 일치하면 자동 할당
      const matched = extracted.suggestedCategory
        ? categories.find(
            (c) =>
              c.name.toLowerCase() ===
              extracted.suggestedCategory!.toLowerCase(),
          )
        : null;

      const updated = await prisma.receipt.update({
        where: { id: created.id },
        data: {
          status: "PARSED",
          vendor: extracted.vendor,
          totalAmount: extracted.totalAmount,
          purchasedAt: extracted.purchasedAt,
          suggestedCategory: extracted.suggestedCategory,
          categoryId: matched?.id,
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
        include: { items: true, category: true },
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
  // null 을 명시적으로 보내면 카테고리 해제
  categoryId: z.string().nullable().optional(),
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
      include: { items: true, category: true },
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

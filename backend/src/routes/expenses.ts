import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { basicAuth } from "../middleware/basicAuth";
import { HttpError } from "../middleware/error";

const router = Router();
router.use(basicAuth);

const createSchema = z.object({
  receiptId: z.string().optional(),
  categoryId: z.string().optional(),
  amount: z.number().int().nonnegative(),
  vendor: z.string().optional(),
  memo: z.string().optional(),
  spentAt: z.coerce.date(),
});

// GET /expenses?from=YYYY-MM-DD&to=YYYY-MM-DD&categoryId=...
router.get("/", async (req, res, next) => {
  try {
    const { from, to, categoryId } = req.query as Record<string, string | undefined>;
    const expenses = await prisma.expense.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(from || to
          ? {
              spentAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { spentAt: "desc" },
      include: { category: true, receipt: true },
    });
    res.json({ expenses });
  } catch (e) {
    next(e);
  }
});

// GET /expenses/summary?from=YYYY-MM-DD&to=YYYY-MM-DD - 카테고리별 합계
router.get("/summary", async (req, res, next) => {
  try {
    const { from, to } = req.query as Record<string, string | undefined>;
    const grouped = await prisma.expense.groupBy({
      by: ["categoryId"],
      where:
        from || to
          ? {
              spentAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : undefined,
      _sum: { amount: true },
    });
    res.json({ summary: grouped });
  } catch (e) {
    next(e);
  }
});

// POST /expenses
router.post("/", async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);

    if (data.receiptId) {
      const receipt = await prisma.receipt.findUnique({
        where: { id: data.receiptId },
      });
      if (!receipt) throw new HttpError(404, "RECEIPT_NOT_FOUND");
    }

    const expense = await prisma.expense.create({ data });

    if (data.receiptId) {
      await prisma.receipt.update({
        where: { id: data.receiptId },
        data: { status: "CONFIRMED" },
      });
    }

    res.status(201).json({ expense });
  } catch (e) {
    next(e);
  }
});

// PATCH /expenses/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const data = createSchema.partial().parse(req.body);
    const existing = await prisma.expense.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw new HttpError(404, "EXPENSE_NOT_FOUND");

    const updated = await prisma.expense.update({
      where: { id: existing.id },
      data,
    });
    res.json({ expense: updated });
  } catch (e) {
    next(e);
  }
});

// DELETE /expenses/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.expense.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw new HttpError(404, "EXPENSE_NOT_FOUND");
    await prisma.expense.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;

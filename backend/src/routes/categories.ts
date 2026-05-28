import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { basicAuth } from "../middleware/basicAuth";
import { HttpError } from "../middleware/error";

const router = Router();
router.use(basicAuth);

const upsertSchema = z.object({
  name: z.string().min(1).max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  icon: z.string().optional(),
});

router.get("/", async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    res.json({ categories });
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = upsertSchema.parse(req.body);
    const created = await prisma.category.create({ data });
    res.status(201).json({ category: created });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const data = upsertSchema.partial().parse(req.body);
    const existing = await prisma.category.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw new HttpError(404, "CATEGORY_NOT_FOUND");
    const updated = await prisma.category.update({
      where: { id: existing.id },
      data,
    });
    res.json({ category: updated });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.category.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw new HttpError(404, "CATEGORY_NOT_FOUND");
    await prisma.category.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;

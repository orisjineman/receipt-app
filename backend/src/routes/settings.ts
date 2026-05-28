import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { basicAuth } from "../middleware/basicAuth";

const router = Router();
router.use(basicAuth);

const patchSchema = z.object({
  monthlyBudget: z.number().int().nonnegative().nullable().optional(),
});

// GET /settings - 항상 id=1 row 를 보장하여 반환
router.get("/", async (_req, res, next) => {
  try {
    const setting = await prisma.setting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
    res.json({ setting });
  } catch (e) {
    next(e);
  }
});

// PATCH /settings - 월 예산 등 갱신. null 명시 시 해제.
router.patch("/", async (req, res, next) => {
  try {
    const data = patchSchema.parse(req.body);
    const setting = await prisma.setting.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
    res.json({ setting });
  } catch (e) {
    next(e);
  }
});

export default router;

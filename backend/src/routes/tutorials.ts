import { Router, Request, Response } from "express";
import { db } from "../../../lib/db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const row = await db.tutorials.findUnique({ where: { id: 1 } });
  res.json((row?.data as Record<string, unknown>) ?? { videos: [], faq: [] });
});

router.put("/", async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  await db.tutorials.upsert({
    where: { id: 1 },
    update: { data: body as any },
    create: { id: 1, data: body as any },
  });
  res.json(body);
});

export default router;

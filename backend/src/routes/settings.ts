import { Router, Request, Response } from "express";
import { db } from "../../../lib/db";

const router = Router();

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      result[key] = deepMerge(
        (target[key] as Record<string, unknown>) || {},
        source[key] as Record<string, unknown>
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

router.get("/", async (_req: Request, res: Response) => {
  const row = await db.settings.findUnique({ where: { id: 1 } });
  res.json((row?.data as Record<string, unknown>) ?? {});
});

router.put("/", async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const row = await db.settings.findUnique({ where: { id: 1 } });
  const current = (row?.data as Record<string, unknown>) ?? {};
  const updated = deepMerge(current, body);
  await db.settings.upsert({
    where: { id: 1 },
    update: { data: updated as any },
    create: { id: 1, data: updated as any },
  });
  res.json(updated);
});

export default router;

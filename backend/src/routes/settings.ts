import { Router, Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "../../../lib/generated/prisma/client";
import { db } from "../../../lib/db";
import { sendError } from "../lib/errors";
import { logAdminAction } from "../lib/audit";
import { requireRole } from "../middleware/auth";

const router = Router();

const settingsSchema = z.record(z.unknown());

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

router.put("/", requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, {
      code: "VALIDATION_ERROR",
      message: "Payload inválido",
      details: parsed.error.flatten(),
    });
    return;
  }
  const body = parsed.data;
  const row = await db.settings.findUnique({ where: { id: 1 } });
  const current = (row?.data as Record<string, unknown>) ?? {};
  const updated = deepMerge(current, body) as Prisma.JsonObject;
  await db.settings.upsert({
    where: { id: 1 },
    update: { data: updated },
    create: { id: 1, data: updated },
  });
  await logAdminAction(req, {
    action: "settings.update",
    entity: "settings",
    entityId: "1",
    details: { keys: Object.keys(body) },
  });
  res.json(updated);
});

export default router;

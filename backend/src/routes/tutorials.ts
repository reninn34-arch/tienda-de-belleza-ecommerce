import { Router, Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "../../../lib/generated/prisma/client";
import { db } from "../../../lib/db";
import { sendError } from "../lib/errors";
import { logAdminAction } from "../lib/audit";

const router = Router();

const tutorialsSchema = z.object({
  videos: z.array(z.unknown()).optional().default([]),
  faq: z.array(z.unknown()).optional().default([]),
}).passthrough();

router.get("/", async (_req: Request, res: Response) => {
  const row = await db.tutorials.findUnique({ where: { id: 1 } });
  res.json((row?.data as Record<string, unknown>) ?? { videos: [], faq: [] });
});

router.put("/", async (req: Request, res: Response) => {
  const parsed = tutorialsSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, {
      code: "VALIDATION_ERROR",
      message: "Payload inválido",
      details: parsed.error.flatten(),
    });
    return;
  }
  const body = parsed.data as Prisma.JsonObject;
  await db.tutorials.upsert({
    where: { id: 1 },
    update: { data: body },
    create: { id: 1, data: body },
  });
  await logAdminAction(req, {
    action: "tutorials.update",
    entity: "tutorials",
    entityId: "1",
    details: { keys: Object.keys(body) },
  });
  res.json(body);
});

export default router;

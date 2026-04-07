import { Router, Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "../../../lib/generated/prisma/client";
import { db } from "../../../lib/db";
import { sendError } from "../lib/errors";
import { logAdminAction } from "../lib/audit";

const router = Router();

const pageBaseSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  blocks: z.array(z.unknown()).optional().default([]),
  published: z.boolean().optional().default(false),
});

const pageCreateSchema = pageBaseSchema;
const pageUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  blocks: z.array(z.unknown()).optional(),
  published: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "Se requiere al menos un campo" }
);

router.get("/", async (_req: Request, res: Response) => {
  const pages = await db.page.findMany({ orderBy: { createdAt: "asc" } });
  res.json(pages);
});

router.post("/", async (req: Request, res: Response) => {
  const parsed = pageCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, {
      code: "VALIDATION_ERROR",
      message: "Payload inválido",
      details: parsed.error.flatten(),
    });
    return;
  }
  const body = parsed.data;
  const page = await db.page.create({
    data: {
      title: body.title,
      slug: body.slug,
      blocks: (body.blocks ?? []) as Prisma.JsonArray,
      published: body.published ?? false,
    },
  });
  await logAdminAction(req, {
    action: "page.create",
    entity: "page",
    entityId: page.id,
    details: { title: page.title, slug: page.slug, published: page.published },
  });
  res.status(201).json(page);
});

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const page = await db.page.findUnique({ where: { id } });
  if (!page) {
    sendError(res, 404, { code: "NOT_FOUND", message: "Not found" });
    return;
  }
  res.json(page);
});

router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = pageUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, {
      code: "VALIDATION_ERROR",
      message: "Payload inválido",
      details: parsed.error.flatten(),
    });
    return;
  }
  const body = parsed.data;
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.slug !== undefined) data.slug = body.slug;
  if (body.blocks !== undefined) data.blocks = body.blocks as Prisma.JsonArray;
  if (body.published !== undefined) data.published = body.published;

  const page = await db.page.update({
    where: { id },
    data,
  });
  await logAdminAction(req, {
    action: "page.update",
    entity: "page",
    entityId: id,
    details: { fields: Object.keys(data) },
  });
  res.json(page);
});

router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.page.delete({ where: { id } });
  await logAdminAction(req, {
    action: "page.delete",
    entity: "page",
    entityId: id,
  });
  res.json({ success: true });
});

export default router;

import { Router, Request, Response } from "express";
import { db } from "../../../lib/db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const pages = await db.page.findMany({ orderBy: { createdAt: "asc" } });
  res.json(pages);
});

router.post("/", async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const page = await db.page.create({
    data: {
      title: (body.title as string) ?? "Sin título",
      slug: (body.slug as string) ?? "",
      blocks: (body.blocks as any[]) ?? [],
      published: (body.published as boolean) ?? false,
    },
  });
  res.status(201).json(page);
});

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const page = await db.page.findUnique({ where: { id } });
  if (!page) { res.status(404).json({ error: "Not found" }); return; }
  res.json(page);
});

router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;
  const page = await db.page.update({
    where: { id },
    data: {
      title: body.title as string,
      slug: body.slug as string,
      blocks: (body.blocks as any[]) ?? [],
      published: (body.published as boolean) ?? false,
    },
  });
  res.json(page);
});

router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.page.delete({ where: { id } });
  res.json({ success: true });
});

export default router;

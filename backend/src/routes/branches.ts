import { Router, Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "../../../lib/generated/prisma/client";
import { db } from "../../../lib/db";
import { sendError } from "../lib/errors";
import { logAdminAction } from "../lib/audit";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

/** Nombre de la sucursal online — no puede eliminarse */
const PROTECTED_BRANCH_NAME = "tienda-online";

const branchSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  address: z.string().optional(),
});

// ─── GET all branches ────────────────────────────────────────────────────────

router.get("/", async (_req: Request, res: Response) => {
  try {
    const branches = await db.branch.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { inventories: true } },
      },
    });
    res.json(branches);
  } catch (error) {
    sendError(res, 500, {
      code: "INTERNAL_ERROR",
      message: "Error interno",
      details: error instanceof Error ? error.message : error,
    });
  }
});

// ─── GET branch by ID (with inventory summary) ───────────────────────────────

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const branch = await db.branch.findUnique({
      where: { id },
      include: {
        inventories: {
          include: { product: { select: { id: true, name: true, image: true } } },
          orderBy: { product: { name: "asc" } },
        },
      },
    });
    if (!branch) {
      sendError(res, 404, { code: "NOT_FOUND", message: "Sucursal no encontrada" });
      return;
    }
    res.json(branch);
  } catch (error) {
    sendError(res, 500, {
      code: "INTERNAL_ERROR",
      message: "Error interno",
      details: error instanceof Error ? error.message : error,
    });
  }
});

// ─── POST create branch ──────────────────────────────────────────────────────

router.post("/", requireAuth, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const parsed = branchSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, {
        code: "VALIDATION_ERROR",
        message: "Payload inválido",
        details: parsed.error.flatten(),
      });
      return;
    }
    const { name, address } = parsed.data;
    const branch = await db.branch.create({
      data: { name, address: address ?? null },
    });
    await logAdminAction(req, {
      action: "branch.create",
      entity: "branch",
      entityId: branch.id,
      details: { name: branch.name },
    });
    res.status(201).json(branch);
  } catch (error) {
    // FIX 1: Manejar violación de unicidad (nombre duplicado) → 400 en vez de 500
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      sendError(res, 400, {
        code: "VALIDATION_ERROR",
        message: "Ya existe una sucursal con ese nombre",
      });
      return;
    }
    sendError(res, 500, {
      code: "INTERNAL_ERROR",
      message: "Error interno",
      details: error instanceof Error ? error.message : error,
    });
  }
});

// ─── PUT update branch ───────────────────────────────────────────────────────

router.put("/:id", requireAuth, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = branchSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, {
        code: "VALIDATION_ERROR",
        message: "Payload inválido",
        details: parsed.error.flatten(),
      });
      return;
    }

    // FIX 2: Verificar que la sucursal existe antes de intentar actualizar
    const existing = await db.branch.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 404, { code: "NOT_FOUND", message: "Sucursal no encontrada" });
      return;
    }

    const branch = await db.branch.update({
      where: { id },
      data: {
        name:    parsed.data.name    ?? existing.name,
        address: parsed.data.address ?? existing.address,
      },
    });
    await logAdminAction(req, {
      action: "branch.update",
      entity: "branch",
      entityId: id,
      details: { name: branch.name, address: branch.address ?? undefined },
    });
    res.json(branch);
  } catch (error) {
    // Manejar violación de unicidad si se cambia a un nombre que ya existe
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      sendError(res, 400, {
        code: "VALIDATION_ERROR",
        message: "Ya existe una sucursal con ese nombre",
      });
      return;
    }
    sendError(res, 500, {
      code: "INTERNAL_ERROR",
      message: "Error interno",
      details: error instanceof Error ? error.message : error,
    });
  }
});

// ─── DELETE branch ───────────────────────────────────────────────────────────

router.delete("/:id", requireAuth, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // FIX 3: Verificar existencia y proteger la sucursal online
    const existing = await db.branch.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 404, { code: "NOT_FOUND", message: "Sucursal no encontrada" });
      return;
    }
    if (existing.name === PROTECTED_BRANCH_NAME) {
      sendError(res, 400, {
        code: "BAD_REQUEST",
        message: `La sucursal "${PROTECTED_BRANCH_NAME}" es requerida por el sistema y no puede eliminarse`,
      });
      return;
    }

    // onDelete: Cascade en Inventory eliminará los registros de inventario automáticamente
    await db.branch.delete({ where: { id } });
    await logAdminAction(req, {
      action: "branch.delete",
      entity: "branch",
      entityId: id,
      details: { name: existing.name },
    });
    res.json({ success: true });
  } catch (error) {
    sendError(res, 500, {
      code: "INTERNAL_ERROR",
      message: "Error interno",
      details: error instanceof Error ? error.message : error,
    });
  }
});

export default router;

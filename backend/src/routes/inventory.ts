import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../../../lib/db";
import { sendError } from "../lib/errors";
import { logAdminAction } from "../lib/audit";

const router = Router();

// Zod schema for bulk inventory updates
const bulkUpdateSchema = z.object({
  updates: z.array(
    z.object({
      productId: z.string().min(1),
      branchId: z.string().min(1),
      stock: z.coerce.number().int().nonnegative(),
    })
  ).min(1, "Debe enviar al menos una actualización"),
});

// ─── POST /api/inventory/bulk ────────────────────────────────────────────────
// Permite actualizar el stock de múltiples productos en múltiples sucursales a la vez.
// Utiliza db.$transaction para asegurar atomicity.
// Este endpoint es perfecto para el Módulo de Inventario.

router.post("/bulk", async (req: Request, res: Response) => {
  try {
    const parsed = bulkUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, {
        code: "VALIDATION_ERROR",
        message: "Payload inválido",
        details: parsed.error.flatten(),
      });
      return;
    }

    const { updates } = parsed.data;

    // Ejecutar todas las actualizaciones en una transacción
    await db.$transaction(
      updates.map(({ productId, branchId, stock }) =>
        db.inventory.upsert({
          where: {
            productId_branchId: { productId, branchId },
          },
          update: { stock },
          create: { productId, branchId, stock },
        })
      )
    );

    // Logging the bulk action
    await logAdminAction(req, {
      action: "inventory.bulk_update",
      entity: "inventory",
      details: { updatedCount: updates.length, updates },
    });

    res.json({ success: true, updatedCount: updates.length });
  } catch (error) {
    sendError(res, 500, {
      code: "INTERNAL_ERROR",
      message: "Error al actualizar inventario",
      details: error instanceof Error ? error.message : error,
    });
  }
});

export default router;

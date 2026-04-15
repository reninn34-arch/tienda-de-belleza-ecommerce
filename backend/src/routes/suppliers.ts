
import { Router, Request, Response } from "express";
import { db } from "../../../lib/db";
import { z } from "zod";
import { sendError } from "../lib/errors";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const SupplierSchema = z.object({
  name: z.string().min(2),
  taxId: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/admin/suppliers — Lista de proveedores (ADMIN y VENDEDOR)
router.get("/", requireAuth, requireRole(["ADMIN", "VENDEDOR"]), async (req: Request, res: Response) => {
  const { q } = req.query;
  const where = q ? {
    OR: [
      { name: { contains: String(q), mode: 'insensitive' as const } },
      { taxId: { contains: String(q), mode: 'insensitive' as const } },
    ]
  } : {};

  const suppliers = await db.supplier.findMany({
    where,
    orderBy: { name: "asc" },
  });
  res.json(suppliers);
});

// GET /api/admin/suppliers/:id — Detalle de proveedor (ADMIN y VENDEDOR)
router.get("/:id", requireAuth, requireRole(["ADMIN", "VENDEDOR"]), async (req: Request, res: Response) => {
  const { id } = req.params;
  const supplier = await db.supplier.findUnique({
    where: { id },
    include: {
      _count: { select: { purchases: true } },
      purchases: {
        orderBy: { createdAt: "desc" },
        take: 10
      }
    }
  });
  if (!supplier) return sendError(res, 404, { code: "NOT_FOUND", message: "Proveedor no encontrado" });
  res.json(supplier);
});

// POST /api/admin/suppliers — Crear proveedor (Solo ADMIN)
router.post("/", requireAuth, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const parsed = SupplierSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, { code: "VALIDATION_ERROR", message: "Datos inválidos", details: parsed.error });

  try {
    const supplier = await db.supplier.create({
      data: parsed.data
    });
    res.status(201).json(supplier);
  } catch (err: any) {
    if (err.code === "P2002") {
      return sendError(res, 400, { code: "ALREADY_EXISTS", message: "Ya existe un proveedor con ese nombre o RUC" });
    }
    throw err;
  }
});

// PUT /api/admin/suppliers/:id — Actualizar proveedor (Solo ADMIN)
router.put("/:id", requireAuth, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = SupplierSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, { code: "VALIDATION_ERROR", message: "Datos inválidos", details: parsed.error });

  const updated = await db.supplier.update({
    where: { id },
    data: parsed.data
  });
  res.json(updated);
});

// DELETE /api/admin/suppliers/:id — Eliminar proveedor (Solo ADMIN)
router.delete("/:id", requireAuth, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Verificar si tiene compras antes de eliminar
  const count = await db.purchaseOrder.count({ where: { supplierId: id } });
  if (count > 0) {
    return sendError(res, 400, { code: "BAD_REQUEST", message: "No se puede eliminar un proveedor con historial de compras" });
  }

  await db.supplier.delete({ where: { id } });
  res.json({ success: true });
});

export default router;

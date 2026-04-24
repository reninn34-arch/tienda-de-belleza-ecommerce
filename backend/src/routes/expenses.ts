
import { Router, Request, Response } from "express";
import { db } from "../../../lib/db";
import { z } from "zod";
import { sendError } from "../lib/errors";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const ExpenseSchema = z.object({
  description: z.string().min(3),
  amount: z.number().positive(),
  category: z.string(),
  date: z.string().transform(v => new Date(v)).optional(),
  branchId: z.string().optional().nullable(),
});

// GET /api/admin/expenses — Listar gastos (ADMIN y VENDEDOR)
router.get("/", requireAuth, requireRole(["ADMIN", "VENDEDOR"]), async (req: Request, res: Response) => {
  const { branchId, category } = req.query;
  const where: any = {};
  if (branchId) where.branchId = branchId;
  if (category) where.category = category;

  const expenses = await db.expense.findMany({
    where,
    include: {
      branch: { select: { name: true } }
    },
    orderBy: { date: "desc" }
  });
  res.json(expenses);
});

// POST /api/admin/expenses — Registrar gasto (Solo ADMIN)
router.post("/", requireAuth, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const parsed = ExpenseSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, { code: "VALIDATION_ERROR", message: "Datos inválidos", details: parsed.error });

  const expense = await db.expense.create({
    data: parsed.data
  });
  res.status(201).json(expense);
});

// DELETE /api/admin/expenses/:id — Eliminar gasto (Solo ADMIN)
router.delete("/:id", requireAuth, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.expense.delete({ where: { id } });
  res.json({ success: true });
});

export default router;

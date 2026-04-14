import { Router } from "express";
import { db } from "../../../lib/db";
import { sendError } from "../lib/errors";
import { logAdminAction } from "../lib/audit";
import { requireAuth } from "../middleware/auth";
import { posEventEmitter } from "../lib/events";

// Cash Management Routes — v1.0
const router = Router();

/** GET /api/admin/cash/active/:branchId — Obtener caja abierta actual */
router.get("/active/:branchId", requireAuth, async (req, res) => {
  const { branchId } = req.params;
  
  const activeSession = await db.cashSession.findFirst({
    where: { 
      branchId,
      status: "OPEN"
    },
    include: {
      admin: { select: { name: true } },
      movements: true
    }
  });
  
  res.json(activeSession || null);
});

/** POST /api/admin/cash/open — Abrir una nueva caja */
router.post("/open", requireAuth, async (req, res) => {
  const { branchId, openingBalance, notes } = req.body;
  const authReq = req as any;
  const adminId = authReq.user.userId;

  if (!branchId || openingBalance === undefined) {
    return sendError(res, 400, { code: "BAD_REQUEST", message: "Sucursal y monto inicial son requeridos" });
  }

  // Verificar si ya hay una abierta
  const existing = await db.cashSession.findFirst({
    where: { branchId, status: "OPEN" }
  });

  if (existing) {
    return sendError(res, 400, { code: "ALREADY_OPEN", message: "Ya existe una caja abierta en esta sucursal" });
  }

  const session = await db.cashSession.create({
    data: {
      branchId,
      adminId,
      openingBalance: parseFloat(openingBalance),
      expectedClosingBalance: parseFloat(openingBalance),
      status: "OPEN",
      notes
    },
    include: {
      admin: { select: { name: true } }
    }
  });

  await logAdminAction(req, {
    action: "cash.open",
    entity: "cashSession",
    entityId: session.id,
    details: { branchId, openingBalance }
  });

  posEventEmitter.emit("pos_update");
  res.status(201).json(session);
});

/** POST /api/admin/cash/movement — Registrar movimiento manual (Entrada/Salida) */
router.post("/movement", requireAuth, async (req, res) => {
  const { sessionId, type, amount, reason } = req.body;

  if (!sessionId || !type || !amount || !reason) {
    return sendError(res, 400, { code: "BAD_REQUEST", message: "Datos incompletos" });
  }

  const session = await db.cashSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status !== "OPEN") {
    return sendError(res, 400, { code: "INVALID_SESSION", message: "La caja no existe o ya está cerrada" });
  }

  const amt = parseFloat(amount);
  const movement = await db.cashMovement.create({
    data: {
      sessionId,
      type, // IN / OUT
      amount: amt,
      reason
    }
  });

  // Actualizar el balance esperado en la sesión
  const balanceChange = type === "IN" ? amt : -amt;
  await db.cashSession.update({
    where: { id: sessionId },
    data: {
      expectedClosingBalance: { increment: balanceChange }
    }
  });

  posEventEmitter.emit("pos_update");
  res.status(201).json(movement);
});

/** POST /api/admin/cash/close — Cerrar caja */
router.post("/close", requireAuth, async (req, res) => {
  const { sessionId, actualClosingBalance, notes } = req.body;

  if (!sessionId || actualClosingBalance === undefined) {
    return sendError(res, 400, { code: "BAD_REQUEST", message: "ID de sesión y monto final son requeridos" });
  }

  const session = await db.cashSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status !== "OPEN") {
    return sendError(res, 400, { code: "INVALID_SESSION", message: "La caja no existe o ya está cerrada" });
  }

  const actual = parseFloat(actualClosingBalance);
  const diff = actual - session.expectedClosingBalance;

  const closedSession = await db.cashSession.update({
    where: { id: sessionId },
    data: {
      status: "CLOSED",
      actualClosingBalance: actual,
      difference: diff,
      notes: notes || session.notes,
      closedAt: new Date()
    },
    include: {
      admin: { select: { name: true } },
      branch: { select: { name: true } },
      movements: true
    }
  });

  await logAdminAction(req, {
    action: "cash.close",
    entity: "cashSession",
    entityId: sessionId,
    details: { expected: session.expectedClosingBalance, actual, diff }
  });

  posEventEmitter.emit("pos_update");
  res.json(closedSession);
});

/** GET /api/admin/cash/history — Historial de cajas */
router.get("/history", requireAuth, async (req, res) => {
  const { branchId, limit = "20" } = req.query;
  
  const sessions = await db.cashSession.findMany({
    where: branchId ? { branchId: branchId as string } : {},
    include: {
      admin: { select: { name: true } },
      branch: { select: { name: true } },
      movements: true
    },
    orderBy: { openedAt: "desc" },
    take: parseInt(limit as string)
  });
  
  res.json(sessions);
});

export default router;

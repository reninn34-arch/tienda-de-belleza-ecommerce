import { Router } from "express";
import { db } from "../../../lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendError } from "../lib/errors";
import { logAdminAction } from "../lib/audit";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return sendError(res, 400, {
      code: "BAD_REQUEST",
      message: "Email y contraseña son requeridos",
    });
  }

  const admin = await db.admin.findUnique({
    where: { email },
  });

  if (!admin || !admin.active) {
    return sendError(res, 401, {
      code: "INVALID_CREDENTIALS",
      message: "Credenciales inválidas o cuenta suspendida",
    });
  }

  const isValid = await bcrypt.compare(password, admin.password);
  if (!isValid) {
    return sendError(res, 401, {
      code: "INVALID_CREDENTIALS",
      message: "Credenciales inválidas",
    });
  }

  const token = jwt.sign(
    { userId: admin.id, email: admin.email, role: admin.role, branchId: admin.branchId },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  await logAdminAction(req, {
    action: "admin.login",
    entity: "admin",
    entityId: admin.id,
    actor: { userId: admin.id, email: admin.email },
  });

  res.json({
    user: {
      name: admin.name,
      email: admin.email,
      role: admin.role,
      branchId: admin.branchId,
    },
    token
  });
});

// ─── Staff Management (ADMIN Only) ───────────────────────────────────────────

/** Listar staff */
router.get("/staff", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  const staff = await db.admin.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branchId: true,
      active: true,
      branch: { select: { name: true } },
      createdAt: true
    },
    orderBy: { createdAt: "desc" }
  });
  res.json(staff);
});

/** Crear staff */
router.post("/staff", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  const { name, email, password, role, branchId } = req.body;
  
  if (!name || !email || !password || !role) {
    return sendError(res, 400, { code: "BAD_REQUEST", message: "Faltan campos requeridos" });
  }

  const existing = await db.admin.findUnique({ where: { email } });
  if (existing) {
    return sendError(res, 400, { code: "ALREADY_EXISTS", message: "El correo ya está registrado" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  const newStaff = await db.admin.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: role as any,
      branchId: branchId || null
    }
  });

  await logAdminAction(req, {
    action: "staff.create",
    entity: "admin",
    entityId: newStaff.id,
    details: { name, email, role, branchId }
  });

  res.status(201).json({ id: newStaff.id, name: newStaff.name });
});

/** Eliminar staff */
router.delete("/staff/:id", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  
  // No permitirse auto-eliminarse
  const authReq = req as any;
  if (authReq.user?.userId === id) {
    return sendError(res, 400, { code: "BAD_REQUEST", message: "No puedes eliminar tu propio usuario" });
  }

  const user = await db.admin.findUnique({ where: { id } });
  if (!user) {
    return sendError(res, 404, { code: "NOT_FOUND", message: "Usuario no encontrado" });
  }

  try {
    await db.admin.delete({ where: { id } });

    await logAdminAction(req, {
      action: "staff.delete",
      entity: "admin",
      entityId: id,
      details: { name: user.name, email: user.email }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("DEBUG DELETE ADMIN ERROR:", error);
    const errStr = String(error);
    if (error?.code === "P2003" || errStr.includes("Foreign key constraint failed") || errStr.includes("violates RESTRICT setting of foreign key constraint")) {
      // P2003 = Foreign key constraint failed
      return sendError(res, 400, { 
        code: "CANNOT_DELETE", 
        message: "No se puede eliminar este usuario porque tiene historial de caja (sesiones de caja) registradas a su nombre." 
      });
    }
    // Para otros errores
    return sendError(res, 500, { 
      code: "INTERNAL_ERROR", 
      message: "Ocurrió un error al intentar eliminar el usuario",
      details: error.message || String(error)
    });
  }
});

/** Alternar estado activo/inactivo (Soft Delete) */
router.patch("/staff/:id/status", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;
  
  if (typeof active !== "boolean") {
    return sendError(res, 400, { code: "BAD_REQUEST", message: "Se requiere estado 'active' booleano" });
  }

  const authReq = req as any;
  if (authReq.user?.userId === id && !active) {
    return sendError(res, 400, { code: "BAD_REQUEST", message: "No puedes desactivar tu propio usuario" });
  }

  const user = await db.admin.findUnique({ where: { id } });
  if (!user) {
    return sendError(res, 404, { code: "NOT_FOUND", message: "Usuario no encontrado" });
  }

  const updated = await db.admin.update({
    where: { id },
    data: { active }
  });

  await logAdminAction(req, {
    action: active ? "staff.activate" : "staff.deactivate",
    entity: "admin",
    entityId: id,
    details: { name: user.name, email: user.email }
  });

  res.json({ id: updated.id, active: updated.active });
});

/** Actualizar staff */
router.put("/staff/:id", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, branchId } = req.body;

  const user = await db.admin.findUnique({ where: { id } });
  if (!user) {
    return sendError(res, 404, { code: "NOT_FOUND", message: "Usuario no encontrado" });
  }

  // Si cambia el email, verificar que no esté en uso por otro
  if (email && email !== user.email) {
    const existing = await db.admin.findUnique({ where: { email } });
    if (existing) {
      return sendError(res, 400, { code: "ALREADY_EXISTS", message: "El correo ya está registrado por otro usuario" });
    }
  }

  const updateData: any = {
    name,
    email,
    role: role as any,
    branchId: role === "VENDEDOR" ? (branchId || null) : null
  };

  if (password && password.trim() !== "") {
    updateData.password = await bcrypt.hash(password, 10);
  }

  const updatedStaff = await db.admin.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branchId: true
    }
  });

  await logAdminAction(req, {
    action: "staff.update",
    entity: "admin",
    entityId: id,
    details: { name, email, role, branchId, passwordChanged: !!password }
  });

  res.json(updatedStaff);
});

export default router;
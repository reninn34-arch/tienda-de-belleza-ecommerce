import { Router } from "express";
import { db } from "../../../lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendError } from "../lib/errors";
import { logAdminAction } from "../lib/audit";

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

  if (!admin) {
    return sendError(res, 401, {
      code: "INVALID_CREDENTIALS",
      message: "Credenciales inválidas",
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
    { userId: admin.id, email: admin.email },
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
    },
    token
  });
});

export default router;
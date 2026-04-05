import { Router } from "express";
import { db } from "../../../lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-12345";

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña son requeridos" });
  }

  const admin = await db.admin.findUnique({
    where: { email },
  });

  if (!admin) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const isValid = await bcrypt.compare(password, admin.password);
  if (!isValid) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const token = jwt.sign(
    { userId: admin.id, email: admin.email },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({
    user: {
      name: admin.name,
      email: admin.email,
    },
    token
  });
});

export default router;
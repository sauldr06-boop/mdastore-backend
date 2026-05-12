// =====================================================
// routes/auth.js
// POST /api/auth/register  → Registro + email de bienvenida
// POST /api/auth/login     → Login → JWT
// GET  /api/auth/me        → Perfil del usuario autenticado
// =====================================================

const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const { v4: uuid }            = require("uuid");
const { readDB, writeDB }     = require("../data/db");
const { requireAuth }         = require("../middleware/auth");
const { sendWelcomeEmail }    = require("../services/mailer");

const router = express.Router();

/* ─── POST ──── */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "Nombre, email y contraseña son obligatorios." });

    if (password.length < 6)
      return res.status(400).json({ success: false, message: "La contraseña debe tener al menos 6 caracteres." });

    const db = readDB();

    if (db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()))
      return res.status(409).json({ success: false, message: "Ya existe una cuenta con ese email." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id:        uuid(),
      name:      name.trim(),
      email:     email.toLowerCase().trim(),
      password:  hashedPassword,
      role:      "user",
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    writeDB(db);

    // Enviar email de bienvenida 
    sendWelcomeEmail(newUser.email, newUser.name).catch((err) =>
      console.warn("⚠️  Email de bienvenida no enviado:", err.message)
    );

    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: "Usuario registrado correctamente.",
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    });
  } catch (err) {
    console.error("Error en /register:", err);
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

/* ─── POST /api/auth/login ──────────────────────────── */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email y contraseña son obligatorios." });

    const db   = readDB();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ success: false, message: "Credenciales incorrectas." });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: "Sesión iniciada correctamente.",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Error en /login:", err);
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

/* ─── GET /api/auth/me ──────────────────────────────── */
router.get("/me", requireAuth, (req, res) => {
  try {
    const db   = readDB();
    const user = db.users.find((u) => u.id === req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "Usuario no encontrado." });
    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

module.exports = router;
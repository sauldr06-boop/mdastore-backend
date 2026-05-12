// =====================================================
// routes/contact.js
//
// POST /api/contact          → Enviar mensaje de contacto
// GET  /api/contact/admin    → Ver todos los mensajes [Admin]
// DELETE /api/contact/:id    → Eliminar mensaje [Admin]
// =====================================================

const express  = require("express");
const { v4: uuid }               = require("uuid");
const { readDB, writeDB }        = require("../data/db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();


router.post("/", (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Nombre, email y mensaje son obligatorios.",
      });
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "El formato del email no es válido.",
      });
    }

    const db = readDB();

    const newContact = {
      id:        uuid(),
      name:      name.trim(),
      email:     email.trim().toLowerCase(),
      subject:   subject?.trim() || "Sin asunto",
      message:   message.trim(),
      read:      false,
      createdAt: new Date().toISOString(),
    };

    db.contacts.push(newContact);
    writeDB(db);

    res.status(201).json({
      success: true,
      message: "Mensaje enviado correctamente. Te responderemos pronto.",
    });
  } catch (err) {
    console.error("Error en POST /contact:", err);
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

/* ─── GET /api/contact/admin [Admin] ────────────────── */
router.get("/admin", requireAuth, requireAdmin, (req, res) => {
  try {
    const db = readDB();
    const contacts = [...db.contacts].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json({ success: true, total: contacts.length, contacts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

/* ─── DELETE /api/contact/:id [Admin] ───────────────── */
router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  try {
    const db    = readDB();
    const index = db.contacts.findIndex((c) => c.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: "Mensaje no encontrado." });
    }

    db.contacts.splice(index, 1);
    writeDB(db);

    res.json({ success: true, message: "Mensaje eliminado." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

module.exports = router;
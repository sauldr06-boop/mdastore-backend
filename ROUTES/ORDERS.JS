// =====================================================
// routes/orders.js — con envío de email de confirmación
// =====================================================

const express  = require("express");
const { v4: uuid }                  = require("uuid");
const { readDB, writeDB }           = require("../data/db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { sendOrderConfirmation }     = require("../services/mailer");

const router = express.Router();

/* ─── POST /api/orders ──────────────────────────────── */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ success: false, message: "El carrito está vacío." });

    const db = readDB();
    const orderLines = [];

    // Validar stock y construir líneas del pedido
    for (const item of items) {
      const product = db.products.find((p) => p.id === Number(item.productId));

      if (!product)
        return res.status(404).json({ success: false, message: `Producto ID ${item.productId} no encontrado.` });

      if (product.stock < item.qty)
        return res.status(409).json({
          success: false,
          message: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}.`,
        });

      orderLines.push({
        productId: product.id,
        name:      product.name,
        image:     product.image,
        unitPrice: product.price,
        qty:       item.qty,
        lineTotal: +(product.price * item.qty).toFixed(2),
      });

      product.stock -= item.qty;
    }

    // Calcular totales
    const subtotal = +orderLines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2);
    const shipping  = subtotal >= 50 ? 0 : 4.99;
    const total     = +(subtotal + shipping).toFixed(2);

    const newOrder = {
      id:              "NX-" + uuid().split("-")[0].toUpperCase(),
      userId:          req.user.id,
      userName:        req.user.name,
      userEmail:       req.user.email,
      items:           orderLines,
      subtotal,
      shipping,
      total,
      shippingAddress: shippingAddress || null,
      status:          "pending",
      createdAt:       new Date().toISOString(),
      updatedAt:       new Date().toISOString(),
    };

    db.orders.push(newOrder);
    writeDB(db);

    // ── Enviar email de confirmación (no bloqueante) ──
    sendOrderConfirmation(newOrder, req.user.email, req.user.name).catch((err) =>
      console.warn("⚠️  Email de confirmación no enviado:", err.message)
    );

    res.status(201).json({
      success: true,
      message: `Pedido realizado. Email de confirmación enviado a ${req.user.email}.`,
      order:   newOrder,
    });
  } catch (err) {
    console.error("Error en POST /orders:", err);
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

/* ─── GET /api/orders (mis pedidos) ─────────────────── */
router.get("/", requireAuth, (req, res) => {
  try {
    const db     = readDB();
    const orders = db.orders
      .filter((o) => o.userId === req.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, total: orders.length, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

/* ─── GET /api/orders/admin/all [Admin] ─────────────── */
router.get("/admin/all", requireAuth, requireAdmin, (req, res) => {
  try {
    const db     = readDB();
    const orders = [...db.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, total: orders.length, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

/* ─── GET /api/orders/:id ───────────────────────────── */
router.get("/:id", requireAuth, (req, res) => {
  try {
    const db    = readDB();
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Pedido no encontrado." });
    if (order.userId !== req.user.id && req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Acceso denegado." });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

/* ─── PUT /api/orders/:id/cancel ────────────────────── */
router.put("/:id/cancel", requireAuth, (req, res) => {
  try {
    const db    = readDB();
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Pedido no encontrado." });
    if (order.userId !== req.user.id && req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Acceso denegado." });
    if (!["pending", "processing"].includes(order.status))
      return res.status(409).json({ success: false, message: `No se puede cancelar un pedido en estado "${order.status}".` });

    // Restaurar stock
    for (const line of order.items) {
      const product = db.products.find((p) => p.id === line.productId);
      if (product) product.stock += line.qty;
    }

    order.status    = "cancelled";
    order.updatedAt = new Date().toISOString();
    writeDB(db);

    res.json({ success: true, message: "Pedido cancelado y stock restaurado.", order });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

/* ─── PUT /api/orders/admin/:id/status [Admin] ──────── */
router.put("/admin/:id/status", requireAuth, requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["pending", "processing", "shipped", "delivered", "cancelled"];
    if (!valid.includes(status))
      return res.status(400).json({ success: false, message: `Estado inválido. Posibles: ${valid.join(", ")}.` });

    const db    = readDB();
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Pedido no encontrado." });

    order.status    = status;
    order.updatedAt = new Date().toISOString();
    writeDB(db);

    res.json({ success: true, message: `Estado actualizado a "${status}".`, order });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

module.exports = router;
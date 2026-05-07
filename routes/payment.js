// =====================================================
// routes/payment.js
// POST /api/payment/create-session → Crear sesión Stripe
// =====================================================

const express = require("express");
const Stripe   = require("stripe");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/* ─── POST /api/payment/create-session ─────────────── */
router.post("/create-session", requireAuth, async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "El carrito está vacío.",
      });
    }

    // Construir los line_items para Stripe
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name:   item.name,
          images: [item.image],
        },
        unit_amount: Math.round(item.price * 100), // Stripe trabaja en céntimos
      },
      quantity: item.qty,
    }));

    // Crear la sesión de pago
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items:           lineItems,
      mode:                 "payment",
      success_url: `${process.env.CLIENT_ORIGIN}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.CLIENT_ORIGIN}/cancel.html`,
    });

    res.json({ success: true, url: session.url });

  } catch (err) {
    console.error("Error creando sesión Stripe:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
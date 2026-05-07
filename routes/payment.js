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
     success_url: "https://sauldr06-boop.github.io/mdastore-frontend/success.html?session_id={CHECKOUT_SESSION_ID}",
     cancel_url:  "https://sauldr06-boop.github.io/mdastore-frontend/cancel.html",
    });

    res.json({ success: true, url: session.url });

  } catch (err) {
    console.error("Error creando sesión Stripe:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ─── POST /api/payment/webhook ─────────────────────── */
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig     = req.headers["stripe-signature"];
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Cuando el pago se completa correctamente
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    console.log("✅ Pago completado:", session.id);

    // Enviar email de confirmación
    const { sendOrderConfirmation } = require("../services/mailer");

    const order = {
      id:       session.id.slice(-10).toUpperCase(),
      items:    [],
      subtotal: session.amount_subtotal / 100,
      shipping: 0,
      total:    session.amount_total / 100,
    };

    const toEmail  = session.customer_details?.email;
    const userName = session.customer_details?.name || "Cliente";

    if (toEmail) {
      sendOrderConfirmation(order, toEmail, userName).catch((err) =>
        console.warn("⚠️ Email no enviado:", err.message)
      );
    }
  }

  res.json({ received: true });
});

module.exports = router;
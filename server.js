// =====================================================
// server.js — Nexus Gaming Backend
// =====================================================

require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const path    = require("path");

const authRouter    = require("./routes/auth");
const productsRouter= require("./routes/products");
const ordersRouter  = require("./routes/orders");
const contactRouter = require("./routes/contact");
const paymentRouter = require("./routes/payment");
const { verifyMailer } = require("./services/mailer");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globales ───────────────────────────────
app.use(cors({
  origin: [
    "https://sauldr06-boop.github.io",
    "https://sauldr06-boop.github.io/mdastore-frontend",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
  ],
  methods:        ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use("/api/payment/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger de peticiones
app.use((req, _res, next) => {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${req.method.padEnd(6)} ${req.path}`);
  next();
});

// ── Archivos estáticos del frontend ───────────────────
app.use(express.static(path.join(__dirname, "..", "frontend")));

// ── Rutas API ──────────────────────────────────────────
app.use("/api/auth",     authRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders",   ordersRouter);
app.use("/api/contact",  contactRouter);
app.use("/api/payment",  paymentRouter);

app.get("/api/health", (_req, res) => {
  res.json({ success: true, status: "online", version: "1.0.0", time: new Date().toISOString() });
});

// Catch-all para SPA
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

// ── Error handler global ───────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("❌ Error:", err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || "Error interno." });
});

// ── Arrancar servidor ──────────────────────────────────
app.listen(PORT, async () => {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║      MDASTORE GAMING — API SERVER      ║");
  console.log(`║  🚀 http://localhost:${PORT}          ║`);
  console.log("╚══════════════════════════════════════╝\n");
  await verifyMailer(); // Verificar conexión Gmail al arrancar
});
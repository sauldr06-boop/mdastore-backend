// =====================================================
// services/mailer.js
// Servicio de envío de emails con Nodemailer + Gmail
// =====================================================

const nodemailer = require("nodemailer");

// ── Crear el transporter de Gmail ─────────────────────
// Usa "Contraseña de aplicación" (no la contraseña normal de Google).
// Guía para generarla: https://myaccount.google.com/apppasswords
const transporter = nodemailer.createTransport({
  host:   process.env.BREVO_HOST,
  port:   Number(process.env.BREVO_PORT),
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
    from: process.env.BREVO_FROM,   // ← línea nueva
  },
});
/**
 * Verifica la conexión con Gmail al arrancar el servidor.
 * Imprime un mensaje en consola con el resultado.
 */
async function verifyMailer() {
  try {
    await transporter.verify();
    console.log("✅ Mailer conectado como:", process.env.BREVO_USER);
  } catch (err) {
    console.warn("⚠️  Mailer Gmail NO conectado:", err.message);
    console.warn("   → Revisa GMAIL_USER y GMAIL_APP_PASSWORD en tu .env");
  }
}

// ─────────────────────────────────────────────────────
// PLANTILLAS HTML DE EMAIL
// ─────────────────────────────────────────────────────

/**
 * Genera el HTML del email de confirmación de pedido.
 * @param {Object} order  - Objeto del pedido (de db.json)
 * @param {string} userName - Nombre del comprador
 * @returns {string} HTML completo del email
 */
function buildOrderConfirmationHTML(order, userName) {
  // Filas de productos
  const itemRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 8px; border-bottom:1px solid #1a1a2e; color:#e0e0f0; font-size:14px;">
          ${item.name}
        </td>
        <td style="padding:10px 8px; border-bottom:1px solid #1a1a2e; color:#7878a0; font-size:14px; text-align:center;">
          × ${item.qty}
        </td>
        <td style="padding:10px 8px; border-bottom:1px solid #1a1a2e; color:#00f5ff; font-size:14px; text-align:right; font-weight:700;">
          ${formatEUR(item.lineTotal)}
        </td>
      </tr>`
    )
    .join("");

  const shippingText =
    order.shipping === 0 ? "Gratis 🚚" : formatEUR(order.shipping);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Confirmación de pedido — MDASTORE GAMING</title>
</head>
<body style="margin:0; padding:0; background-color:#050508; font-family:'Segoe UI', Arial, sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050508; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px; background:#0f0f1a; border:1px solid rgba(0,245,255,0.2);
                      border-radius:12px; overflow:hidden;">

          <!-- Header con logo -->
          <tr>
            <td style="background:linear-gradient(135deg,#050508,#0a0a18);
                        padding:36px 40px; text-align:center;
                        border-bottom:2px solid rgba(0,245,255,0.3);">
              <p style="margin:0 0 8px; font-size:28px;">⬡</p>
              <h1 style="margin:0; font-size:22px; font-weight:900; letter-spacing:4px;
                          color:#ffffff; text-transform:uppercase;">
                MDASTORE<span style="color:#00f5ff;">GAMING</span>
              </h1>
              <p style="margin:8px 0 0; font-size:12px; letter-spacing:3px;
                         color:#7878a0; text-transform:uppercase;">
                Confirmación de pedido
              </p>
            </td>
          </tr>

          <!-- Cuerpo principal -->
          <tr>
            <td style="padding:40px;">

              <!-- Saludo -->
              <p style="margin:0 0 8px; font-size:20px; color:#ffffff; font-weight:700;">
                ¡Gracias, ${userName}! 🎮
              </p>
              <p style="margin:0 0 28px; font-size:15px; color:#7878a0; line-height:1.7;">
                Hemos recibido tu pedido correctamente. En breve lo procesaremos
                y te mantendremos informado sobre su estado.
              </p>

              <!-- Número de pedido destacado -->
              <div style="background:#141425; border:1px solid rgba(0,245,255,0.2);
                           border-radius:8px; padding:20px; margin-bottom:28px; text-align:center;">
                <p style="margin:0 0 6px; font-size:11px; letter-spacing:3px;
                            color:#7878a0; text-transform:uppercase;">
                  Número de pedido
                </p>
                <p style="margin:0; font-size:22px; font-weight:900; letter-spacing:2px;
                            color:#00f5ff;">
                  ${order.id}
                </p>
              </div>

              <!-- Tabla de productos -->
              <p style="margin:0 0 12px; font-size:11px; letter-spacing:3px;
                          color:#7878a0; text-transform:uppercase;">
                Resumen del pedido
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid rgba(255,255,255,0.06); border-radius:8px;
                             overflow:hidden; margin-bottom:20px;">
                <thead>
                  <tr style="background:#141425;">
                    <th style="padding:10px 8px; text-align:left; font-size:11px;
                                letter-spacing:2px; color:#7878a0; text-transform:uppercase;
                                font-weight:600; border-bottom:1px solid #1a1a2e;">
                      Producto
                    </th>
                    <th style="padding:10px 8px; text-align:center; font-size:11px;
                                letter-spacing:2px; color:#7878a0; text-transform:uppercase;
                                font-weight:600; border-bottom:1px solid #1a1a2e;">
                      Und.
                    </th>
                    <th style="padding:10px 8px; text-align:right; font-size:11px;
                                letter-spacing:2px; color:#7878a0; text-transform:uppercase;
                                font-weight:600; border-bottom:1px solid #1a1a2e;">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
              </table>

              <!-- Totales -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid rgba(255,255,255,0.06); border-radius:8px;
                             overflow:hidden; margin-bottom:32px;">
                <tr>
                  <td style="padding:10px 16px; color:#7878a0; font-size:14px;">Subtotal</td>
                  <td style="padding:10px 16px; color:#e0e0f0; font-size:14px; text-align:right;">
                    ${formatEUR(order.subtotal)}
                  </td>
                </tr>
                <tr style="background:#141425;">
                  <td style="padding:10px 16px; color:#7878a0; font-size:14px;">Envío</td>
                  <td style="padding:10px 16px; color:#e0e0f0; font-size:14px; text-align:right;">
                    ${shippingText}
                  </td>
                </tr>
                <tr style="border-top:2px solid rgba(0,245,255,0.2);">
                  <td style="padding:14px 16px; color:#ffffff; font-size:16px; font-weight:700;
                              letter-spacing:1px; text-transform:uppercase;">
                    Total pagado
                  </td>
                  <td style="padding:14px 16px; color:#00f5ff; font-size:20px; font-weight:900;
                              text-align:right;">
                    ${formatEUR(order.total)}
                  </td>
                </tr>
              </table>

              <!-- Información de envío -->
              ${
                order.shippingAddress
                  ? `<div style="background:#141425; border:1px solid rgba(255,255,255,0.06);
                                  border-radius:8px; padding:20px; margin-bottom:32px;">
                      <p style="margin:0 0 8px; font-size:11px; letter-spacing:3px;
                                  color:#7878a0; text-transform:uppercase;">
                        Dirección de envío
                      </p>
                      <p style="margin:0; font-size:14px; color:#e0e0f0; line-height:1.7;">
                        ${order.shippingAddress.street || ""}<br/>
                        ${order.shippingAddress.zip || ""} ${order.shippingAddress.city || ""}
                      </p>
                    </div>`
                  : ""
              }

              <!-- CTA botón -->
              <div style="text-align:center; margin-bottom:8px;">
                <a href="http://localhost:3000"
                   style="display:inline-block; background:linear-gradient(135deg,#00f5ff,#bf00ff);
                           color:#050508; font-size:13px; font-weight:900; letter-spacing:3px;
                           text-transform:uppercase; text-decoration:none;
                           padding:14px 36px; border-radius:6px;">
                  Volver a la Tienda →
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0a0a12; padding:24px 40px; text-align:center;
                        border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0 0 6px; font-size:12px; color:#4a4a6a;">
                Este email fue enviado automáticamente. No respondas a este mensaje.
              </p>
              <p style="margin:0; font-size:12px; color:#4a4a6a;">
                © 2026 MDAStore Gaming· Calle Gamer 42, 28080 Madrid ·
                <a href="mailto:soporte@mdastoregaming.es"
                   style="color:#00f5ff; text-decoration:none;">
                  soporte@mdastoregaming.es
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Genera el HTML del email de bienvenida tras el registro.
 * @param {string} userName - Nombre del nuevo usuario
 * @returns {string} HTML del email
 */
function buildWelcomeHTML(userName) {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><title>Bienvenido a MDAStore Gaming</title></head>
<body style="margin:0; padding:0; background:#050508;
             font-family:'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px; background:#0f0f1a;
                      border:1px solid rgba(0,245,255,0.2); border-radius:12px; overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#050508,#0a0a18);
                        padding:36px 40px; text-align:center;
                        border-bottom:2px solid rgba(0,245,255,0.3);">
              <p style="margin:0 0 8px; font-size:28px;">⬡</p>
              <h1 style="margin:0; font-size:22px; font-weight:900; letter-spacing:4px;
                          color:#fff; text-transform:uppercase;">
                MDASTORE<span style="color:#00f5ff;">GAMING</span>
              </h1>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding:40px; text-align:center;">
              <p style="font-size:40px; margin:0 0 16px;">🎮</p>
              <h2 style="margin:0 0 16px; color:#fff; font-size:22px;">
                ¡Bienvenido, ${userName}!
              </h2>
              <p style="color:#7878a0; font-size:15px; line-height:1.7; margin:0 0 32px;">
                Tu cuenta en MDAStore Gaming ha sido creada correctamente.<br/>
                Ya puedes explorar nuestro catálogo y comprar los mejores
                videojuegos y periféricos gaming.
              </p>
              <a href="http://localhost:3000"
                 style="display:inline-block; background:linear-gradient(135deg,#00f5ff,#bf00ff);
                         color:#050508; font-size:13px; font-weight:900; letter-spacing:3px;
                         text-transform:uppercase; text-decoration:none;
                         padding:14px 36px; border-radius:6px;">
                Ir a la tienda →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0a0a12; padding:20px 40px; text-align:center;
                        border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0; font-size:12px; color:#4a4a6a;">
                © 2026 NexusGaming ·
                <a href="mailto:soporte@mdastoregaming.es"
                   style="color:#00f5ff; text-decoration:none;">soporte@mdastoregaming.es</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────
// FUNCIONES DE ENVÍO
// ─────────────────────────────────────────────────────

/**
 * Envía el email de confirmación de pedido al comprador.
 * @param {Object} order     - Pedido completo
 * @param {string} toEmail   - Email del destinatario
 * @param {string} userName  - Nombre del comprador
 */
async function sendOrderConfirmation(order, toEmail, userName) {
  const mailOptions = {
    from:    process.env.BREVO_FROM,
    to:      toEmail,
    subject: `✅ Pedido confirmado ${order.id} — MDAStore Gaming`,
    html:    buildOrderConfirmationHTML(order, userName),
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Email de pedido enviado a ${toEmail} — ID: ${info.messageId}`);
  return info;
}

/**
 * Envía el email de bienvenida tras el registro.
 * @param {string} toEmail   - Email del nuevo usuario
 * @param {string} userName  - Nombre del usuario
 */
async function sendWelcomeEmail(toEmail, userName) {
  console.log(`📧 Intentando enviar email de bienvenida a ${toEmail}...`);
  console.log(`📧 FROM: ${process.env.BREVO_FROM}`);
  console.log(`📧 USER: ${process.env.BREVO_USER}`);

  const mailOptions = {
    from:    process.env.BREVO_FROM,
    to:      toEmail,
    subject: `Bienvenido a MDAStore Gaming, ${userName}!`,
    html:    buildWelcomeHTML(userName),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado correctamente a ${toEmail} — ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`❌ Error enviando email:`, err.message);
    throw err;
  }
}

// ─────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────

/** Formatea un número como precio en euros. */
function formatEUR(amount) {
  return Number(amount).toLocaleString("es-ES", {
    style:                 "currency",
    currency:              "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

module.exports = {
  verifyMailer,
  sendOrderConfirmation,
  sendWelcomeEmail,
};
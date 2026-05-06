// =====================================================
// data/db.js
// Capa de acceso a la "base de datos" (archivo JSON)
// En producción real sustituir por PostgreSQL / MongoDB
// =====================================================

const fs   = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "db.json");

/**
 * Lee y devuelve el contenido completo de la base de datos.
 * @returns {Object} datos completos (users, products, orders, contacts)
 */
function readDB() {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

/**
 * Persiste el objeto de datos en el archivo JSON.
 * @param {Object} data - Objeto completo a guardar
 */
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = { readDB, writeDB };
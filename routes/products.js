// =====================================================
// routes/products.js
//
// GET    /api/products           → Listar (filtros, búsqueda, paginación)
// GET    /api/products/:id       → Detalle de un producto
// GET    /api/products/category/:cat → Por categoría
// POST   /api/products           → Crear producto  [Admin]
// PUT    /api/products/:id       → Editar producto  [Admin]
// DELETE /api/products/:id       → Eliminar producto [Admin]
// =====================================================

const express = require("express");
const { readDB, writeDB }          = require("../data/db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

/* ─── GET /api/products ─────────────────────────────── */
// Query params opcionales:
//   ?category=teclados
//   ?search=viper
//   ?minPrice=50&maxPrice=200
//   ?sort=price_asc | price_desc | rating | newest
//   ?page=1&limit=9
router.get("/", (req, res) => {
  try {
    const db = readDB();
    let products = [...db.products];

    const { category, search, minPrice, maxPrice, sort, page = 1, limit = 18 } = req.query;

    // Filtrar por categoría
    if (category && category !== "all") {
      products = products.filter((p) => p.category === category);
    }

    // Búsqueda por nombre o descripción
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    // Filtrar por rango de precio
    if (minPrice) products = products.filter((p) => p.price >= Number(minPrice));
    if (maxPrice) products = products.filter((p) => p.price <= Number(maxPrice));

    
    switch (sort) {
      case "price_asc":  products.sort((a, b) => a.price - b.price);   break;
      case "price_desc": products.sort((a, b) => b.price - a.price);   break;
      case "rating":     products.sort((a, b) => b.rating - a.rating); break;
      case "newest":     products.sort((a, b) => b.id - a.id);         break;
      default: break; // Sin ordenación: orden original
    }

    // Paginación
    const total      = products.length;
    const totalPages = Math.ceil(total / Number(limit));
    const start      = (Number(page) - 1) * Number(limit);
    const paginated  = products.slice(start, start + Number(limit));

    res.json({
      success: true,
      total,
      totalPages,
      currentPage: Number(page),
      products: paginated,
    });
  } catch (err) {
    console.error("Error en GET /products:", err);
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

/* ─── GET /api/products/category/:cat ──────────────── */
router.get("/category/:cat", (req, res) => {
  try {
    const db = readDB();
    const products = db.products.filter((p) => p.category === req.params.cat);
    res.json({ success: true, total: products.length, products });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

/* ─── GET /api/products/:id ─────────────────────────── */
router.get("/:id", (req, res) => {
  try {
    const db      = readDB();
    const product = db.products.find((p) => p.id === Number(req.params.id));

    if (!product) {
      return res.status(404).json({ success: false, message: "Producto no encontrado." });
    }

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

/* ─── POST /api/products [Admin] ────────────────────── */
router.post("/", requireAuth, requireAdmin, (req, res) => {
  try {
    const { name, category, image, price, oldPrice, stock, description, rating, reviews } = req.body;

    if (!name || !category || !price || !description) {
      return res.status(400).json({
        success: false,
        message: "Faltan campos obligatorios: name, category, price, description.",
      });
    }

    const db = readDB();

    // Generar ID autoincremental
    const maxId  = db.products.reduce((max, p) => Math.max(max, p.id), 0);
    const newProduct = {
      id:          maxId + 1,
      name:        name.trim(),
      category,
      image:       image || "",
      price:       Number(price),
      oldPrice:    oldPrice ? Number(oldPrice) : null,
      stock:       stock ? Number(stock) : 0,
      description: description.trim(),
      rating:      rating ? Number(rating) : 0,
      reviews:     reviews ? Number(reviews) : 0,
    };

    db.products.push(newProduct);
    writeDB(db);

    res.status(201).json({ success: true, message: "Producto creado.", product: newProduct });
  } catch (err) {
    console.error("Error en POST /products:", err);
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

/* ─── PUT /api/products/:id [Admin] ─────────────────── */
router.put("/:id", requireAuth, requireAdmin, (req, res) => {
  try {
    const db    = readDB();
    const index = db.products.findIndex((p) => p.id === Number(req.params.id));

    if (index === -1) {
      return res.status(404).json({ success: false, message: "Producto no encontrado." });
    }

    // Mezclar los campos existentes con los nuevos (PATCH-style)
    const updated = { ...db.products[index], ...req.body, id: db.products[index].id };
    db.products[index] = updated;
    writeDB(db);

    res.json({ success: true, message: "Producto actualizado.", product: updated });
  } catch (err) {
    console.error("Error en PUT /products/:id:", err);
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

/* ─── DELETE /api/products/:id [Admin] ──────────────── */
router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  try {
    const db    = readDB();
    const index = db.products.findIndex((p) => p.id === Number(req.params.id));

    if (index === -1) {
      return res.status(404).json({ success: false, message: "Producto no encontrado." });
    }

    const deleted = db.products.splice(index, 1)[0];
    writeDB(db);

    res.json({ success: true, message: `Producto "${deleted.name}" eliminado.` });
  } catch (err) {
    console.error("Error en DELETE /products/:id:", err);
    res.status(500).json({ success: false, message: "Error interno del servidor." });
  }
});

module.exports = router;
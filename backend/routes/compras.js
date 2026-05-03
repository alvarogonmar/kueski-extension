const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const auth = require('../middleware/auth');

// GET /api/compras — historial del usuario
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.monto, c.quincenas, c.fecha, c.estatus,
              com.nombre AS comercio, com.logo_url
       FROM compras c
       LEFT JOIN comercios com ON com.id = c.comercio_id
       WHERE c.usuario_id = $1
       ORDER BY c.fecha DESC`,
      [req.usuario.id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/compras — registrar nueva compra
router.post('/', auth, async (req, res) => {
  const { monto, quincenas, comercio_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO compras (usuario_id, comercio_id, monto, quincenas, estatus)
       VALUES ($1, $2, $3, $4, 'activa') RETURNING *`,
      [req.usuario.id, comercio_id, monto, quincenas]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/compras/:id — detalle de una compra
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, com.nombre AS comercio
       FROM compras c
       LEFT JOIN comercios com ON com.id = c.comercio_id
       WHERE c.id = $1 AND c.usuario_id = $2`,
      [req.params.id, req.usuario.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
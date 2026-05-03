const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const auth = require('../middleware/auth');

// GET /api/recordatorios
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM recordatorios WHERE usuario_id = $1 ORDER BY fecha_pago ASC',
      [req.usuario.id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/recordatorios
router.post('/', auth, async (req, res) => {
  const { compra_id, fecha_pago, mensaje } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO recordatorios (usuario_id, compra_id, fecha_pago, mensaje)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.usuario.id, compra_id, fecha_pago, mensaje]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
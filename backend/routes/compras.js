const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const auth = require('../middleware/auth');

// GET /api/compras
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.monto_total, c.num_quincenas, c.monto_quincena,
              c.estado, c.fecha_compra,
              co.nombre AS comercio, co.logo_url,
              json_agg(cu ORDER BY cu.numero_cuota) AS cuotas
       FROM compras c
       JOIN comercios co ON co.id = c.comercio_id
       LEFT JOIN cuotas cu ON cu.compra_id = c.id
       WHERE c.usuario_id = $1
       GROUP BY c.id, co.nombre, co.logo_url
       ORDER BY c.fecha_compra DESC`,
      [req.usuario.id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/compras/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.monto_total, c.num_quincenas, c.monto_quincena,
              c.estado, c.fecha_compra,
              co.nombre AS comercio, co.logo_url,
              json_agg(cu ORDER BY cu.numero_cuota) AS cuotas
       FROM compras c
       JOIN comercios co ON co.id = c.comercio_id
       LEFT JOIN cuotas cu ON cu.compra_id = c.id
       WHERE c.id = $1 AND c.usuario_id = $2
       GROUP BY c.id, co.nombre, co.logo_url`,
      [req.params.id, req.usuario.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Compra no encontrada' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
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

// POST /api/compras/actualizar-vencidas — marca cuotas y actualiza nivel_riesgo
router.post('/actualizar-vencidas', auth, async (req, res) => {
  try {
    // 1. Marcar cuotas vencidas
    await pool.query(`
      UPDATE cuotas
      SET estado = 'vencida'
      WHERE estado = 'pendiente'
        AND fecha_vencimiento < CURRENT_DATE
        AND compra_id IN (
          SELECT id FROM compras WHERE usuario_id = $1
        )
    `, [req.usuario.id])

    // 2. Contar cuotas vencidas del usuario
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM cuotas cu
      JOIN compras c ON c.id = cu.compra_id
      WHERE c.usuario_id = $1 AND cu.estado = 'vencida'
    `, [req.usuario.id])

    const total = parseInt(countResult.rows[0].total)

    // 3. Actualizar nivel_riesgo según cuotas vencidas
    const nivel = total === 0 ? 'bajo' : total <= 2 ? 'medio' : 'alto'
    await pool.query(`
      UPDATE perfil_financiero
      SET nivel_riesgo = $1, updated_at = NOW()
      WHERE usuario_id = $2
    `, [nivel, req.usuario.id])

    res.json({ cuotas_vencidas: total, nivel_riesgo: nivel })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router;
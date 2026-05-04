const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const auth = require('../middleware/auth');

// GET /api/recordatorios/pendientes
router.get('/pendientes', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.tipo, r.dias_antes,
              cu.numero_cuota, cu.monto, cu.fecha_vencimiento
       FROM recordatorios r
       JOIN cuotas cu ON cu.id = r.cuota_id
       WHERE r.usuario_id = $1 AND r.enviado = false
       ORDER BY cu.fecha_vencimiento ASC`,
      [req.usuario.id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/recordatorios/:id/enviado
router.put('/:id/enviado', auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE recordatorios SET enviado = true, enviado_en = NOW() WHERE id = $1 AND usuario_id = $2',
      [req.params.id, req.usuario.id]
    );
    res.json({ mensaje: 'Recordatorio marcado como enviado' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
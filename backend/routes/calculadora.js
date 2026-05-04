const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const auth = require('../middleware/auth');

// GET /api/calculadora/config
router.get('/config', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM configuracion_kueski LIMIT 1');
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/calculadora/perfil
router.get('/perfil', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT limite_credito, credito_usado, credito_disponible, nivel_riesgo FROM perfil_financiero WHERE usuario_id = $1',
      [req.usuario.id]
    );
    res.json(result.rows[0] || { error: 'Perfil financiero no encontrado' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/calculadora/simular
router.post('/simular', auth, async (req, res) => {
  const { monto, num_quincenas } = req.body;
  if (!monto || !num_quincenas)
    return res.status(400).json({ error: 'Monto y num_quincenas son requeridos' });
  try {
    const configResult = await pool.query('SELECT * FROM configuracion_kueski LIMIT 1');
    const config = configResult.rows[0];

    if (monto < config.monto_minimo || monto > config.monto_maximo)
      return res.status(400).json({ error: 'Monto fuera del rango permitido' });
    if (num_quincenas < 1 || num_quincenas > config.max_quincenas)
      return res.status(400).json({ error: 'Quincenas fuera del rango permitido' });

    const tasa = parseFloat(config.tasa_interes_quincenal);
    const monto_por_quincena = parseFloat(
      (monto * tasa / (1 - Math.pow(1 + tasa, -num_quincenas))).toFixed(2)
    );
    const total_con_intereses = parseFloat((monto_por_quincena * num_quincenas).toFixed(2));

    res.json({
      monto_total: monto,
      num_quincenas,
      tasa_aplicada: tasa,
      monto_por_quincena,
      total_con_intereses
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
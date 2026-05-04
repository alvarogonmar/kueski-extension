const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const auth = require('../middleware/auth');

// GET /api/preferencias
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM preferencias_usuario WHERE usuario_id = $1',
      [req.usuario.id]
    );
    res.json(result.rows[0] || {
      notif_email: true,
      notif_push: true,
      dias_antes_recordatorio: 3
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/preferencias
router.put('/', auth, async (req, res) => {
  const { notif_email, notif_push, dias_antes_recordatorio } = req.body;
  try {
    await pool.query(
      `INSERT INTO preferencias_usuario (usuario_id, notif_email, notif_push, dias_antes_recordatorio)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (usuario_id) DO UPDATE
       SET notif_email = $2, notif_push = $3, dias_antes_recordatorio = $4, updated_at = NOW()`,
      [req.usuario.id, notif_email, notif_push, dias_antes_recordatorio]
    );
    res.json({ mensaje: 'Preferencias actualizadas' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
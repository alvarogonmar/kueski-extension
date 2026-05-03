const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const auth = require('../middleware/auth');

// GET /api/preferencias — obtiene preferencias del usuario
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM preferencias WHERE usuario_id = $1',
      [req.usuario.id]
    );
    if (result.rows.length === 0) {
      return res.json({
        quincenas_default: 6,
        notificaciones: true,
        tema: 'dark'
      });
    }
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/preferencias — actualiza preferencias
router.put('/', auth, async (req, res) => {
  const { quincenas_default, notificaciones, tema } = req.body;
  try {
    await pool.query(
      `INSERT INTO preferencias (usuario_id, quincenas_default, notificaciones, tema)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (usuario_id) 
       DO UPDATE SET 
         quincenas_default = $2,
         notificaciones = $3,
         tema = $4`,
      [req.usuario.id, quincenas_default, notificaciones, tema]
    );
    res.json({ mensaje: 'Preferencias actualizadas' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
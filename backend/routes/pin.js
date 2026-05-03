const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');

// POST /api/pin/crear
router.post('/crear', auth, async (req, res) => {
  const { pin } = req.body;
  try {
    const hash = await bcrypt.hash(pin, 10);
    await pool.query(
      'UPDATE usuarios SET pin_hash = $1 WHERE id = $2',
      [hash, req.usuario.id]
    );
    res.json({ mensaje: 'PIN creado correctamente' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/pin/verificar
router.post('/verificar', auth, async (req, res) => {
  const { pin } = req.body;
  try {
    const result = await pool.query(
      'SELECT pin_hash FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );
    const valido = await bcrypt.compare(pin, result.rows[0].pin_hash);
    res.json({ valido });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
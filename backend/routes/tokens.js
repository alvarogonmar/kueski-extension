const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const auth = require('../middleware/auth');

// GET /api/tokens — saldo de tokens del usuario
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT saldo FROM tokens WHERE usuario_id = $1',
      [req.usuario.id]
    );
    res.json(result.rows[0] || { saldo: 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
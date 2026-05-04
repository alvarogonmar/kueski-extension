const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');

// POST /api/pin/crear
router.post('/crear', auth, async (req, res) => {
  const { pin } = req.body;
  if (!pin || pin.length !== 4 || isNaN(pin)) {
    return res.status(400).json({ error: 'El PIN debe ser de 4 dígitos numéricos' });
  }
  try {
    const hash = await bcrypt.hash(pin, 10);
    await pool.query(
      `INSERT INTO pins (usuario_id, pin_hash)
       VALUES ($1, $2)
       ON CONFLICT (usuario_id) DO UPDATE SET pin_hash = $2, updated_at = NOW()`,
      [req.usuario.id, hash]
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
      'SELECT pin_hash, intentos_fallidos, bloqueado_hasta FROM pins WHERE usuario_id = $1',
      [req.usuario.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'PIN no configurado' });
    }

    const pinData = result.rows[0];

    // Verificar bloqueo
    if (pinData.bloqueado_hasta && new Date() < new Date(pinData.bloqueado_hasta)) {
      return res.status(423).json({
        error: 'Cuenta bloqueada',
        bloqueado_hasta: pinData.bloqueado_hasta
      });
    }

    const valido = await bcrypt.compare(pin, pinData.pin_hash);

    if (!valido) {
      const intentos = pinData.intentos_fallidos + 1;
      const bloqueo = intentos >= 3 ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await pool.query(
        'UPDATE pins SET intentos_fallidos = $1, bloqueado_hasta = $2 WHERE usuario_id = $3',
        [intentos, bloqueo, req.usuario.id]
      );
      await pool.query(
        'INSERT INTO log_intentos_pin (usuario_id, exitoso, ip_origen) VALUES ($1, false, $2)',
        [req.usuario.id, req.ip]
      );

      return res.status(401).json({
        error: 'PIN incorrecto',
        intentos_restantes: Math.max(0, 3 - intentos)
      });
    }

    // PIN correcto — resetear intentos
    await pool.query(
      'UPDATE pins SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE usuario_id = $1',
      [req.usuario.id]
    );
    await pool.query(
      'INSERT INTO log_intentos_pin (usuario_id, exitoso, ip_origen) VALUES ($1, true, $2)',
      [req.usuario.id, req.ip]
    );

    res.json({ valido: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');

// POST /api/tokens/generar — verifica PIN y genera token CVV
router.post('/generar', auth, async (req, res) => {
  const { pin, comercio_id, monto, num_quincenas } = req.body;
  try {

    // Verificar si el usuario tiene cuotas vencidas
    const vencidasResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM cuotas cu
      JOIN compras c ON c.id = cu.compra_id
      WHERE c.usuario_id = $1 AND cu.estado = 'vencida'
    `, [req.usuario.id])

    const cuotasVencidas = parseInt(vencidasResult.rows[0].total)
    if (cuotasVencidas > 0) {
      return res.status(403).json({
        error: 'Tienes pagos vencidos',
        detalle: `Tienes ${cuotasVencidas} cuota${cuotasVencidas > 1 ? 's' : ''} vencida${cuotasVencidas > 1 ? 's' : ''}. Ponte al corriente para seguir comprando.`,
        cuotas_vencidas: cuotasVencidas
      })
    }
    // Validar crédito disponible PRIMERO
    const perfilResult = await pool.query(
      'SELECT credito_disponible FROM perfil_financiero WHERE usuario_id = $1',
      [req.usuario.id]
    );
    const disponible = parseFloat(perfilResult.rows[0]?.credito_disponible || 0);
    if (monto > disponible) {
      return res.status(400).json({
        error: `Crédito insuficiente. Disponible: $${disponible.toLocaleString('es-MX')}`
      });
    }

    // Verificar PIN
    const pinResult = await pool.query(
      'SELECT pin_hash, intentos_fallidos, bloqueado_hasta FROM pins WHERE usuario_id = $1',
      [req.usuario.id]
    );

    if (!pinResult.rows[0]) {
      return res.status(404).json({ error: 'PIN no configurado' });
    }

    const pinData = pinResult.rows[0];

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

    // 3. PIN correcto — resetear intentos
    await pool.query(
      'UPDATE pins SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE usuario_id = $1',
      [req.usuario.id]
    );
    await pool.query(
      'INSERT INTO log_intentos_pin (usuario_id, exitoso, ip_origen) VALUES ($1, true, $2)',
      [req.usuario.id, req.ip]
    );

    // 4. Generar token CVV
    const tokenResult = await pool.query(
      `INSERT INTO tokens_pago (usuario_id, comercio_id, monto, num_quincenas)
       VALUES ($1, $2, $3, $4)
       RETURNING id, expira_en`,
      [req.usuario.id, comercio_id, monto, num_quincenas]
    );

    res.json({ valido: true, token_pago: tokenResult.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/tokens/canjear — confirma la compra con el token CVV
router.post('/canjear', auth, async (req, res) => {
  const { token_id } = req.body;
  try {
    const tokenResult = await pool.query(
      'SELECT * FROM tokens_pago WHERE id = $1',
      [token_id]
    );
    const token = tokenResult.rows[0];

    if (!token) return res.status(404).json({ error: 'Token no existe' });
    if (token.usado) return res.status(400).json({ error: 'Token ya fue usado' });
    if (new Date() > new Date(token.expira_en)) {
      return res.status(410).json({ error: 'Token expirado' });
    }

    // Calcular monto por quincena
    const configResult = await pool.query('SELECT tasa_interes_quincenal FROM configuracion_kueski LIMIT 1');
    const tasa = parseFloat(configResult.rows[0].tasa_interes_quincenal);
    const monto_quincena = parseFloat(
      (token.monto * tasa / (1 - Math.pow(1 + tasa, -token.num_quincenas))).toFixed(2)
    );

    // Marcar token como usado
    await pool.query('UPDATE tokens_pago SET usado = true WHERE id = $1', [token_id]);

    // Crear la compra
    const compraResult = await pool.query(
      `INSERT INTO compras (usuario_id, comercio_id, token_pago_id, monto_total, num_quincenas, monto_quincena)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [token.usuario_id, token.comercio_id, token.id, token.monto, token.num_quincenas, monto_quincena]
    );

    const compra_id = compraResult.rows[0].id;

    // Crear cuotas individuales
    const hoy = new Date();
    for (let i = 1; i <= token.num_quincenas; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i * 15);
      await pool.query(
        `INSERT INTO cuotas (compra_id, numero_cuota, monto, fecha_vencimiento)
         VALUES ($1, $2, $3, $4)`,
        [compra_id, i, monto_quincena, fecha.toISOString().split('T')[0]]
      );
    }

    // ✅ Descontar crédito usado
    await pool.query(
      'UPDATE perfil_financiero SET credito_usado = credito_usado + $1 WHERE usuario_id = $2',
      [token.monto, token.usuario_id]
    );

    res.status(201).json({ mensaje: 'Compra registrada correctamente', compra_id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
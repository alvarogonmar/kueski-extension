const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const auth = require('../middleware/auth');

const IVA = 0.16;
const TASA_MORATORIA_DIARIA = 0.005;
const DIAS_MAX_MORATORIOS = 11;

const redondearDinero = (valor) => Number(Number(valor).toFixed(2));

const calcularComisionPagoTardio = (monto) => {
  const montoNum = Number(monto);
  if (montoNum <= 150) return 50;
  if (montoNum <= 300) return 100;
  if (montoNum <= 700) return 150;
  return 200;
};

const calcularDiasVencida = (fechaVencimiento) => {
  const hoy = new Date();
  const vencimiento = new Date(fechaVencimiento);

  hoy.setHours(0, 0, 0, 0);
  vencimiento.setHours(0, 0, 0, 0);

  return Math.max(0, Math.floor((hoy - vencimiento) / (1000 * 60 * 60 * 24)));
};

const calcularDesgloseCuota = (cuota) => {
  const montoOriginal = redondearDinero(cuota.monto);
  const diasVencida = calcularDiasVencida(cuota.fecha_vencimiento);
  const aplicaMora = cuota.estado === 'vencida' || diasVencida > 0;
  const diasMoratorios = aplicaMora ? Math.min(diasVencida, DIAS_MAX_MORATORIOS) : 0;
  const comisionBase = aplicaMora ? calcularComisionPagoTardio(montoOriginal) : 0;
  const multaAcumulada = redondearDinero(comisionBase * (1 + IVA));
  const interesAcumulado = redondearDinero(montoOriginal * TASA_MORATORIA_DIARIA * diasMoratorios);
  const totalAPagar = redondearDinero(montoOriginal + multaAcumulada + interesAcumulado);

  return {
    cuota_id: cuota.id,
    compra_id: cuota.compra_id,
    numero_cuota: cuota.numero_cuota,
    estado: cuota.estado,
    fecha_vencimiento: cuota.fecha_vencimiento,
    dias_vencida: diasVencida,
    dias_moratorios: diasMoratorios,
    monto_original: montoOriginal,
    multa_acumulada: multaAcumulada,
    interes_acumulado: interesAcumulado,
    total_a_pagar: totalAPagar,
    reglas: {
      iva: IVA,
      tasa_moratoria_diaria: TASA_MORATORIA_DIARIA,
      dias_max_moratorios: DIAS_MAX_MORATORIOS
    }
  };
};

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

// GET /api/compras/cuotas/:id/desglose — calcula multa, interes y total a pagar
router.get('/cuotas/:id/desglose', auth, async (req, res) => {
  try {
    const cuotaResult = await pool.query(
      `SELECT cu.id, cu.compra_id, cu.numero_cuota, cu.monto, cu.fecha_vencimiento, cu.estado
       FROM cuotas cu
       JOIN compras c ON c.id = cu.compra_id
       WHERE cu.id = $1 AND c.usuario_id = $2`,
      [req.params.id, req.usuario.id]
    )

    if (cuotaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cuota no encontrada' })
    }

    res.json(calcularDesgloseCuota(cuotaResult.rows[0]))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/compras/cuotas/:id/pagar — registra el pago de una cuota
router.post('/cuotas/:id/pagar', auth, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const cuotaResult = await client.query(
      `SELECT cu.id, cu.compra_id, cu.numero_cuota, cu.monto, cu.fecha_vencimiento, cu.estado,
              c.usuario_id, c.estado AS compra_estado
       FROM cuotas cu
       JOIN compras c ON c.id = cu.compra_id
       WHERE cu.id = $1 AND c.usuario_id = $2
       FOR UPDATE`,
      [req.params.id, req.usuario.id]
    )

    if (cuotaResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Cuota no encontrada' })
    }

    const cuota = cuotaResult.rows[0]
    if (cuota.estado === 'pagada') {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'La cuota ya está pagada' })
    }

    const cuotaPagadaResult = await client.query(
      `UPDATE cuotas
       SET estado = 'pagada'
       WHERE id = $1
       RETURNING id, compra_id, numero_cuota, monto, fecha_vencimiento, estado`,
      [cuota.id]
    )

    const pendientesResult = await client.query(
      `SELECT COUNT(*) AS total
       FROM cuotas
       WHERE compra_id = $1 AND estado <> 'pagada'`,
      [cuota.compra_id]
    )

    const compraCompletada = parseInt(pendientesResult.rows[0].total) === 0
    if (compraCompletada) {
      await client.query(
        `UPDATE compras
         SET estado = 'completada'
         WHERE id = $1 AND usuario_id = $2`,
        [cuota.compra_id, req.usuario.id]
      )
    }

    const vencidasResult = await client.query(
      `SELECT COUNT(*) AS total
       FROM cuotas cu
       JOIN compras c ON c.id = cu.compra_id
       WHERE c.usuario_id = $1 AND cu.estado = 'vencida'`,
      [req.usuario.id]
    )

    const cuotasVencidas = parseInt(vencidasResult.rows[0].total)
    const nivel = cuotasVencidas === 0 ? 'bajo' : cuotasVencidas <= 2 ? 'medio' : 'alto'
    await client.query(
      `UPDATE perfil_financiero
       SET nivel_riesgo = $1, updated_at = NOW()
       WHERE usuario_id = $2`,
      [nivel, req.usuario.id]
    )

    await client.query('COMMIT')
    res.json({
      mensaje: 'Pago registrado correctamente',
      cuota: cuotaPagadaResult.rows[0],
      compra_completada: compraCompletada,
      cuotas_vencidas: cuotasVencidas,
      nivel_riesgo: nivel
    })
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: e.message })
  } finally {
    client.release()
  }
})

module.exports = router;

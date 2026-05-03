const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// POST /api/calculadora/simular
router.post('/simular', auth, async (req, res) => {
  const { monto, quincenas } = req.body;

  if (!monto || !quincenas) {
    return res.status(400).json({ error: 'Monto y quincenas son requeridos' });
  }

  try {
    const tasaQuincenal = 0.04; // 4% quincenal
    const pagoQuincenal = monto * tasaQuincenal / (1 - Math.pow(1 + tasaQuincenal, -quincenas));
    const totalPagar = pagoQuincenal * quincenas;
    const interesMonto = totalPagar - monto;

    const plan = [];
    let saldo = monto;

    for (let i = 1; i <= quincenas; i++) {
      const interes = saldo * tasaQuincenal;
      const capital = pagoQuincenal - interes;
      saldo -= capital;
      plan.push({
        quincena: i,
        pago: parseFloat(pagoQuincenal.toFixed(2)),
        capital: parseFloat(capital.toFixed(2)),
        interes: parseFloat(interes.toFixed(2)),
        saldo: parseFloat(Math.max(saldo, 0).toFixed(2))
      });
    }

    res.json({
      monto,
      quincenas,
      pagoQuincenal: parseFloat(pagoQuincenal.toFixed(2)),
      totalPagar: parseFloat(totalPagar.toFixed(2)),
      interesMonto: parseFloat(interesMonto.toFixed(2)),
      plan
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
const express = require('express')
const router = express.Router()
const pool = require('../db/db')
const auth = require('../middleware/auth')

// GET /api/favoritos
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.nombre, c.dominio, c.logo_url
       FROM favoritos f
       JOIN comercios c ON c.id = f.comercio_id
       WHERE f.usuario_id = $1`,
      [req.usuario.id]
    )
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/favoritos
router.post('/', auth, async (req, res) => {
  const { dominio } = req.body
  try {
    const comercio = await pool.query('SELECT id FROM comercios WHERE dominio = $1', [dominio])
    if (!comercio.rows[0]) return res.status(404).json({ error: 'Comercio no encontrado' })
    await pool.query(
      'INSERT INTO favoritos (usuario_id, comercio_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.usuario.id, comercio.rows[0].id]
    )
    res.json({ mensaje: 'Agregado a favoritos' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/favoritos/:dominio
router.delete('/:dominio', auth, async (req, res) => {
  try {
    const comercio = await pool.query('SELECT id FROM comercios WHERE dominio = $1', [req.params.dominio])
    if (!comercio.rows[0]) return res.status(404).json({ error: 'Comercio no encontrado' })
    await pool.query(
      'DELETE FROM favoritos WHERE usuario_id = $1 AND comercio_id = $2',
      [req.usuario.id, comercio.rows[0].id]
    )
    res.json({ mensaje: 'Eliminado de favoritos' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
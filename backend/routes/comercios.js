const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const auth = require('../middleware/auth');

// GET /api/comercios — lista todos los comercios afiliados
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, dominio, logo_url, activo FROM comercios ORDER BY nombre'
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/comercios/dominio/:dominio — busca comercio por dominio
router.get('/dominio/:dominio', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM comercios WHERE dominio = $1 AND activo = true',
      [req.params.dominio]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comercio no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/comercios/favoritos — obtiene favoritos del usuario
router.get('/favoritos', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.nombre, c.dominio, c.logo_url 
       FROM comercios c
       INNER JOIN favoritos f ON f.comercio_id = c.id
       WHERE f.usuario_id = $1`,
      [req.usuario.id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/comercios/favoritos — agrega un favorito
router.post('/favoritos', auth, async (req, res) => {
  const { comercio_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO favoritos (usuario_id, comercio_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.usuario.id, comercio_id]
    );
    res.status(201).json({ mensaje: 'Comercio agregado a favoritos' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/comercios/favoritos/:id — elimina un favorito
router.delete('/favoritos/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM favoritos WHERE usuario_id = $1 AND comercio_id = $2',
      [req.usuario.id, req.params.id]
    );
    res.json({ mensaje: 'Comercio eliminado de favoritos' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
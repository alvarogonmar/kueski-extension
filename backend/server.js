require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Rutas
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/comercios',     require('./routes/comercios'));
app.use('/api/calculadora',   require('./routes/calculadora'));
app.use('/api/pin',           require('./routes/pin'));
app.use('/api/tokens',        require('./routes/tokens'));
app.use('/api/compras',       require('./routes/compras'));
app.use('/api/preferencias',  require('./routes/preferencias'));
app.use('/api/recordatorios', require('./routes/recordatorios'));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Kueski API corriendo' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
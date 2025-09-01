require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const pool = require('./config/db'); // Importamos pool separado
const authRoutes = require('./routes/auth');
const indexRoutes = require('./routes/index');
const productosRoutes = require('./routes/productos');
// const bcrypt = require('bcryptjs'); // (Opcional) No se usa aquí, puedes quitarlo
const clientesRoutes = require('./routes/clientes');
const pedidosRoutes = require('./routes/pedidos');
const clienteAuthRoutes = require('./routes/clienteAuth');
const clientePedidosRoutes = require('./routes/clientePedidos');

const app = express();

// <<< NUEVO: server http + socket.io
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
// Mismo dominio, no hace falta CORS extra:
const io = new Server(server);
app.locals.io = io; // io accesible desde rutas/controladores con req.app.locals.io

const PORT = process.env.PORT || 4000;

// Middleware para añadir pool a req
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// Configurar EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para parsear cuerpos
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Servir archivos estáticos (CSS, imágenes, JS cliente)
app.use(express.static(path.join(__dirname, 'public')));

// Sesiones
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Middleware para mensajes flash (guardamos en session)
app.use((req, res, next) => {
  res.locals.error = req.session.error || null;
  res.locals.success = req.session.success || null;
  delete req.session.error;
  delete req.session.success;
  next();
});

// Rutas
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/admin/productos', productosRoutes);
app.use('/admin/clientes', clientesRoutes);
app.use('/admin/pedidos', pedidosRoutes);
app.use('/cliente', clienteAuthRoutes);
app.use('/cliente', clientePedidosRoutes);

// <<< NUEVO: logs y gestión básica de salas
io.on('connection', (socket) => {
  // Unirse a "salas" que te interesen (p. ej., por cliente o por pedido)
  socket.on('join', (room) => socket.join(room));
});

// Iniciar servidor (OJO: ahora server.listen, no app.listen)
server.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});

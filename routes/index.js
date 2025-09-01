// routes/index.js
// --------------------------------------------------------------------
// En este archivo defino las rutas principales de la aplicación.
// Incluyo:
//   1) Middleware isLoggedIn → protege rutas que solo deben ver
//      usuarios administradores con sesión iniciada.
//   2) GET / → página pública (home). Redirige al dashboard si
//      el admin ya está logueado, o a "mis pedidos" si hay un
//      cliente con sesión iniciada. Si no hay sesión, muestra
//      la portada.
//   3) GET /dashboard → zona protegida de administrador, solo
//      accesible si hay sesión de admin activa.
// --------------------------------------------------------------------

const express = require('express');
const router = express.Router(); // Creo el router de Express para definir rutas

// Middleware para comprobar si el admin está logueado
function isLoggedIn(req, res, next) {
  // Si en la sesión existe un userId, dejo pasar al siguiente middleware/controlador
  if (req.session.userId) return next();

  // Si no hay sesión de admin, guardo mensaje de error en la sesión
  req.session.error = 'Debes iniciar sesión para ver esa página';

  // Redirijo al formulario de login de admin
  res.redirect('/auth/login');
}

// GET / → página pública (home)
router.get('/', (req, res) => {
  // Si ya hay sesión de admin → redirijo al dashboard
  if (req.session.userId) return res.redirect('/dashboard');

  // Si ya hay sesión de cliente → redirijo a "mis pedidos"
  if (req.session.clienteId) return res.redirect('/cliente/mis-pedidos');

  // Si no hay sesión, renderizo la portada con los accesos
  res.render('index');
});

// GET /dashboard → página de administrador protegida
router.get('/dashboard', isLoggedIn, (req, res) => {
  // Renderizo la vista dashboard y paso el userId desde la sesión
  res.render('dashboard', { userId: req.session.userId });
});

// Exporto el router para usarlo en app.js
module.exports = router;

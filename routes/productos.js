// routes/productos.js
const express = require('express');
const router = express.Router();

// Reusa el guard de tu routes/index.js
function isLoggedIn(req, res, next) {
  if (req.session.userId) return next();
  req.session.error = 'Debes iniciar sesión para ver esa página';
  return res.redirect('/auth/login');
}

// Listado
router.get('/', isLoggedIn, async (req, res) => {
  const [rows] = await req.pool.query('SELECT * FROM productos ORDER BY id DESC');
  res.render('productos/index', { productos: rows });
});

// Form crear
router.get('/nuevo', isLoggedIn, (req, res) => {
  res.render('productos/nuevo');
});

// Crear
router.post('/nuevo', isLoggedIn, async (req, res) => {
  const { nombre, precio, activo } = req.body;
  await req.pool.query(
    'INSERT INTO productos (nombre, precio, activo) VALUES (?,?,?)',
    [nombre, Number(precio), activo ? 1 : 0]
  );
  req.session.success = 'Producto creado';
  res.redirect('/admin/productos');
});

// Form editar
router.get('/:id/editar', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const [rows] = await req.pool.query('SELECT * FROM productos WHERE id=?', [id]);
  if (!rows.length) {
    req.session.error = 'Producto no encontrado';
    return res.redirect('/admin/productos');
  }
  res.render('productos/editar', { p: rows[0] });
});

// Editar
router.post('/:id/editar', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const { nombre, precio, activo } = req.body;
  await req.pool.query(
    'UPDATE productos SET nombre=?, precio=?, activo=? WHERE id=?',
    [nombre, Number(precio), activo ? 1 : 0, id]
  );
  req.session.success = 'Producto actualizado';
  res.redirect('/admin/productos');
});

// Eliminar
router.post('/:id/eliminar', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  await req.pool.query('DELETE FROM productos WHERE id=?', [id]);
  req.session.success = 'Producto eliminado';
  res.redirect('/admin/productos');
});

module.exports = router;

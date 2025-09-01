// routes/clientes.js
const express = require('express');
const router = express.Router();

function isLoggedIn(req, res, next) {
  if (req.session.userId) return next();
  req.session.error = 'Debes iniciar sesión';
  return res.redirect('/auth/login');
}

// Listado
router.get('/', isLoggedIn, async (req, res) => {
  const [rows] = await req.pool.query(
    'SELECT * FROM clientes ORDER BY id DESC'
  );
  res.render('clientes/index', { clientes: rows });
});

// Form nuevo
router.get('/nuevo', isLoggedIn, (req, res) => {
  res.render('clientes/nuevo');
});

// Crear
router.post('/nuevo', isLoggedIn, async (req, res) => {
  const { tipo_cliente, empresa, nombre, apellidos, email, telefono, direccion_entrega } = req.body;
  try {
    await req.pool.query(
      `INSERT INTO clientes (tipo_cliente, empresa, nombre, apellidos, email, telefono, direccion_entrega)
       VALUES (?,?,?,?,?,?,?)`,
      [tipo_cliente, empresa || null, nombre || null, apellidos || null, email, telefono || null, direccion_entrega || null]
    );
    req.session.success = 'Cliente creado';
    res.redirect('/admin/clientes');
  } catch (e) {
    console.error(e);
    req.session.error = 'Error creando cliente (¿email duplicado?)';
    res.redirect('/admin/clientes/nuevo');
  }
});

// Form editar
router.get('/:id/editar', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const [rows] = await req.pool.query('SELECT * FROM clientes WHERE id=?', [id]);
  if (!rows.length) {
    req.session.error = 'Cliente no encontrado';
    return res.redirect('/admin/clientes');
  }
  res.render('clientes/editar', { c: rows[0] });
});

// Editar
router.post('/:id/editar', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const { tipo_cliente, empresa, nombre, apellidos, email, telefono, direccion_entrega } = req.body;
  try {
    await req.pool.query(
      `UPDATE clientes
       SET tipo_cliente=?, empresa=?, nombre=?, apellidos=?, email=?, telefono=?, direccion_entrega=?
       WHERE id=?`,
      [tipo_cliente, empresa || null, nombre || null, apellidos || null, email, telefono || null, direccion_entrega || null, id]
    );
    req.session.success = 'Cliente actualizado';
    res.redirect('/admin/clientes');
  } catch (e) {
    console.error(e);
    req.session.error = 'Error actualizando cliente';
    res.redirect(`/admin/clientes/${id}/editar`);
  }
});

// Eliminar
router.post('/:id/eliminar', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  try {
    await req.pool.query('DELETE FROM clientes WHERE id=?', [id]);
    req.session.success = 'Cliente eliminado';
  } catch (e) {
    console.error(e);
    req.session.error = 'No se pudo eliminar (tiene pedidos asociados o error)';
  }
  res.redirect('/admin/clientes');
});

module.exports = router;

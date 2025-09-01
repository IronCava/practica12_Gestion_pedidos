// routes/pedidos.js
const express = require('express');
const router = express.Router();

function isLoggedIn(req, res, next) {
  if (req.session.userId) return next();
  req.session.error = 'Debes iniciar sesión';
  return res.redirect('/auth/login');
}

// Listado de pedidos
router.get('/', isLoggedIn, async (req, res) => {
  const [rows] = await req.pool.query(`
    SELECT p.id, p.fecha, p.estado_trabajo, c.nombre, c.apellidos, c.empresa,
           ep.total, ep.pagado, ep.estado_pago
    FROM pedidos p
    JOIN clientes c ON p.cliente_id = c.id
    LEFT JOIN v_pedido_estado_pago ep ON ep.pedido_id = p.id
    ORDER BY p.id DESC
  `);
  res.render('pedidos/index', { pedidos: rows });
});

// Form nuevo pedido
router.get('/nuevo', isLoggedIn, async (req, res) => {
  const [clientes] = await req.pool.query('SELECT * FROM clientes ORDER BY id DESC');
  const [productos] = await req.pool.query('SELECT * FROM productos WHERE activo=1 ORDER BY id DESC');
  res.render('pedidos/nuevo', { clientes, productos });
});

// Crear pedido
router.post('/nuevo', isLoggedIn, async (req, res) => {
  const { cliente_id, observaciones, productos = [] } = req.body;

  try {
    // Crear pedido
    const [result] = await req.pool.query(
      'INSERT INTO pedidos (cliente_id, observaciones) VALUES (?,?)',
      [cliente_id, observaciones || null]
    );
    const pedidoId = result.insertId;

    // Insertar productos seleccionados
    if (Array.isArray(productos)) {
      for (let p of productos) {
        const { producto_id, cantidad, precio_unitario } = JSON.parse(p);
        await req.pool.query(
          'INSERT INTO pedido_productos (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?,?,?,?)',
          [pedidoId, producto_id, cantidad, precio_unitario]
        );
      }
    }

    req.session.success = 'Pedido creado';
    res.redirect('/admin/pedidos');
  } catch (err) {
    console.error(err);
    req.session.error = 'Error creando pedido';
    res.redirect('/admin/pedidos/nuevo');
  }
});

// DETALLE DEL PEDIDO (items + pagos + resumen)
router.get('/:id', isLoggedIn, async (req, res) => {
  const { id } = req.params;

  const [[pedido]] = await req.pool.query(`
    SELECT p.*, c.nombre, c.apellidos, c.empresa, c.email, c.telefono
    FROM pedidos p
    JOIN clientes c ON c.id = p.cliente_id
    WHERE p.id = ?`, [id]);

  if (!pedido) {
    req.session.error = 'Pedido no encontrado';
    return res.redirect('/admin/pedidos');
  }

  const [items] = await req.pool.query(`
    SELECT pp.*, pr.nombre AS producto_nombre
    FROM pedido_productos pp
    JOIN productos pr ON pr.id = pp.producto_id
    WHERE pp.pedido_id = ?`, [id]);

  const [[totales]] = await req.pool.query(`
    SELECT t.total, pa.pagado, ep.estado_pago
    FROM v_pedido_totales t
    LEFT JOIN v_pedido_pagado pa ON pa.pedido_id = t.pedido_id
    LEFT JOIN v_pedido_estado_pago ep ON ep.pedido_id = t.pedido_id
    WHERE t.pedido_id = ?`, [id]);

  const [pagos] = await req.pool.query(
    `SELECT * FROM pagos WHERE pedido_id=? ORDER BY fecha DESC`, [id]
  );

  const [hist] = await req.pool.query(
    `SELECT * FROM trabajo_historial WHERE pedido_id=? ORDER BY fecha DESC`, [id]
  );

  res.render('pedidos/detalle', {
    pedido,
    items,
    pagos,
    hist,
    resumen: {
      total: (totales && totales.total) || 0,
      pagado: (totales && totales.pagado) || 0,
      estado_pago: (totales && totales.estado_pago) || 'Sin liquidar'
    }
  });
});

/* ===========================
   3A) CAMBIAR ESTADO DE TRABAJO
   =========================== */
router.post('/:id/estado', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const { estado_trabajo, nota } = req.body;

  try {
    // Actualizar estado + insertar en historial
    await req.pool.query(`UPDATE pedidos SET estado_trabajo=? WHERE id=?`, [estado_trabajo, id]);
    await req.pool.query(
      `INSERT INTO trabajo_historial (pedido_id, estado, nota) VALUES (?,?,?)`,
      [id, estado_trabajo, nota || null]
    );

    // Obtener cliente_id y una fecha "NOW()" para payload
    const [[pedido]] = await req.pool.query(
      `SELECT cliente_id, NOW() AS fecha FROM pedidos WHERE id=?`,
      [id]
    );

    // Emitir a sala del pedido y a la sala del cliente
    const io = req.app.locals.io;
    io.to(`pedido:${id}`).emit('pedido:estado_actualizado', {
      pedidoId: Number(id),
      estado: estado_trabajo,
      fecha: pedido.fecha,
      nota: nota || null
    });
    io.to(`cliente:${pedido.cliente_id}`).emit('pedido:estado_actualizado', {
      pedidoId: Number(id),
      estado: estado_trabajo,
      fecha: pedido.fecha,
      nota: nota || null
    });

    req.session.success = 'Estado de trabajo actualizado';
    res.redirect(`/admin/pedidos/${id}`);
  } catch (e) {
    console.error(e);
    req.session.error = 'Error al actualizar el estado';
    res.redirect(`/admin/pedidos/${id}`);
  }
});

/* =================
    REGISTRAR PAGO
   ================= */
router.post('/:id/pagos', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const { importe, metodo, nota } = req.body;

  try {
    // Insertar pago
    await req.pool.query(
      `INSERT INTO pagos (pedido_id, importe, metodo, nota) VALUES (?,?,?,?)`,
      [id, Number(importe), metodo, nota || null]
    );

    // Recalcular totales y obtener cliente_id
    const [[resumen]] = await req.pool.query(`
      SELECT t.total, pa.pagado, ep.estado_pago
      FROM v_pedido_totales t
      LEFT JOIN v_pedido_pagado pa ON pa.pedido_id = t.pedido_id
      LEFT JOIN v_pedido_estado_pago ep ON ep.pedido_id = t.pedido_id
      WHERE t.pedido_id=?`, [id]);

    const [[pedido]] = await req.pool.query(
      `SELECT cliente_id FROM pedidos WHERE id=?`,
      [id]
    );

    // Emitir a sala del pedido y a la sala del cliente
    const io = req.app.locals.io;
    io.to(`pedido:${id}`).emit('pedido:pagos_actualizados', {
      pedidoId: Number(id),
      total: Number(resumen?.total || 0),
      pagado: Number(resumen?.pagado || 0),
      estado_pago: resumen?.estado_pago || 'Sin liquidar'
    });
    io.to(`cliente:${pedido.cliente_id}`).emit('pedido:pagos_actualizados', {
      pedidoId: Number(id),
      total: Number(resumen?.total || 0),
      pagado: Number(resumen?.pagado || 0),
      estado_pago: resumen?.estado_pago || 'Sin liquidar'
    });

    req.session.success = 'Pago registrado';
    res.redirect(`/admin/pedidos/${id}`);
  } catch (e) {
    console.error(e);
    req.session.error = 'Error registrando el pago';
    res.redirect(`/admin/pedidos/${id}`);
  }
});

module.exports = router;

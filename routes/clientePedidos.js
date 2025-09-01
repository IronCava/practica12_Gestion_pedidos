const express = require('express');
const router = express.Router();

function requireCliente(req, res, next) {
  if (req.session.clienteId) return next();
  req.session.error = 'Inicia sesión como cliente';
  return res.redirect('/cliente/login');
}

// Listado de pedidos del cliente
router.get('/mis-pedidos', requireCliente, async (req, res) => {
  const clienteId = req.session.clienteId;
  const [rows] = await req.pool.query(`
    SELECT p.id, p.fecha, p.estado_trabajo,
           ep.total, ep.pagado, ep.estado_pago
    FROM pedidos p
    LEFT JOIN v_pedido_estado_pago ep ON ep.pedido_id = p.id
    WHERE p.cliente_id = ?
    ORDER BY p.id DESC
  `, [clienteId]);
  res.render('cliente/mis-pedidos', { pedidos: rows, clienteId });
});

// Detalle de un pedido del cliente
router.get('/mis-pedidos/:id', requireCliente, async (req, res) => {
  const clienteId = req.session.clienteId;
  const { id } = req.params;

  const [[pedido]] = await req.pool.query(`
    SELECT p.*
    FROM pedidos p
    WHERE p.id=? AND p.cliente_id=?`, [id, clienteId]);

  if (!pedido) { req.session.error = 'Pedido no encontrado'; return res.redirect('/cliente/mis-pedidos'); }

  const [items] = await req.pool.query(`
    SELECT pr.nombre, pp.cantidad, pp.precio_unitario
    FROM pedido_productos pp
    JOIN productos pr ON pr.id = pp.producto_id
    WHERE pp.pedido_id=?`, [id]);

  const [[resumen]] = await req.pool.query(`
    SELECT t.total, pa.pagado, ep.estado_pago
    FROM v_pedido_totales t
    LEFT JOIN v_pedido_pagado pa ON pa.pedido_id = t.pedido_id
    LEFT JOIN v_pedido_estado_pago ep ON ep.pedido_id = t.pedido_id
    WHERE t.pedido_id=?`, [id]);

  res.render('cliente/detalle-pedido', {
    pedido,
    items,
    resumen: { total: resumen?.total || 0, pagado: resumen?.pagado || 0, estado_pago: resumen?.estado_pago || 'Sin liquidar' }
  });
});

module.exports = router;

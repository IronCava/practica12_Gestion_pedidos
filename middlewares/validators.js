// middlewares/validators.js
// -----------------------------------------------------
// En este archivo defino dos helpers para mi proyecto:
// 1) handleErrors → gestiona los errores de validación 
//    de express-validator y los guarda en la sesión o 
//    re-renderiza una vista con los mensajes.
// 2) sanitizeNumber → limpia y convierte un valor a número
//    de forma segura, devolviendo null si no es válido.
// -----------------------------------------------------

// Importo validationResult de express-validator para poder revisar los errores
const { validationResult } = require('express-validator');

// Exporto una función llamada handleErrors que recibe una vista opcional (viewPath)
exports.handleErrors = (viewPath) => (req, res, next) => {
  // Obtengo los errores de validación de la petición actual
  const errors = validationResult(req);
  // Si no hay errores, paso al siguiente middleware/controlador
  if (errors.isEmpty()) return next();

  // Guardo todos los mensajes de error en la sesión para mostrarlos en la vista
  req.session.error = errors.array().map(e => e.msg).join(' · ');

  // Si me pasan una vista como parámetro, re-renderizo esa vista con los datos previos
  if (viewPath) return res.render(viewPath, { ...(req.localsForView || {}) });

  // Si no hay vista definida, redirijo a la página anterior
  return res.redirect('back');
};

// Exporto una función llamada sanitizeNumber para limpiar valores numéricos
exports.sanitizeNumber = (v) => {
  // Si el valor viene vacío, nulo o indefinido, devuelvo null
  if (v === undefined || v === null || v === '') return null;
  // Convierto el valor a número
  const n = Number(v);
  // Si es un número finito válido, lo devuelvo; si no, devuelvo null
  return Number.isFinite(n) ? n : null;
};

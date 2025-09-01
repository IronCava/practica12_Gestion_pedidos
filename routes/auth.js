// routes/auth.js
// --------------------------------------------------------------------
// En este archivo defino las rutas de autenticación del panel admin.
// Incluyo:
//   1) GET /auth/register → mostrar formulario de registro.
//   2) POST /auth/register → crear usuarios (lógica en el controlador).
//   3) GET /auth/login → mostrar formulario de login.
//   4) POST /auth/login → valido email y password; si hay errores,
//      los gestiono con handleErrors('login') y si todo va bien,
//      delego en authController.postLogin.
//   5) GET /auth/logout → cerrar sesión.
// Uso express-validator para validar la entrada y mi middleware
// handleErrors para re-renderizar la vista 'login' con mensajes.
// --------------------------------------------------------------------

const express = require('express');
const router = express.Router(); // Creo el router de Express
const authController = require('../controllers/authController'); // Importo el controlador
const { body } = require('express-validator'); // Importo body para validar campos del POST
const { handleErrors } = require('../middlewares/validators'); // Importo mi helper de errores

// GET /auth/register → muestro el formulario de registro
router.get('/register', authController.getRegister); // Delego en el controlador

// POST /auth/register → lógica de registro
router.post(
  '/register',
  [
    body('email').trim().isEmail().withMessage('Email no válido'),
    body('password').isLength({ min: 6 }).withMessage('Contraseña mínima de 6 caracteres')
  ],
  handleErrors('register'),
  authController.postRegister
);


// GET /auth/login → muestro el formulario de login admin
router.get('/login', authController.getLogin); // El controlador debe renderizar la vista 'login'

// POST /auth/login → aplico validaciones y gestiono errores antes de llamar al controlador
router.post(
  '/login',
  [
    // Valido que el email tenga formato correcto
    body('email')
      .trim() // Quito espacios alrededor
      .isEmail().withMessage('Email no válido'), // Si no es email válido, agrego este mensaje

    // Valido que la contraseña no venga vacía
    body('password')
      .notEmpty().withMessage('Introduce la contraseña') // Exijo que haya contraseña
  ],
  // Si hay errores, handleErrors re-renderiza la vista 'login' y mete los mensajes en req.session.error
  handleErrors('login'),
  // Si no hubo errores de validación, paso al controlador que hace el login real
  authController.postLogin
);

// GET /auth/logout → cierro sesión y redirijo
router.get('/logout', authController.logout); // Delego el cierre de sesión

// Exporto el router para usarlo en la app principal
module.exports = router;

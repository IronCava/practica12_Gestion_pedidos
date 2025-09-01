// routes/clienteAuth.js
// -------------------------------------------------------------
// En este archivo defino las rutas de autenticación del cliente.
// Incluyo:
//   1) GET /login → muestro el formulario de acceso.
//   2) POST /login → aplico validaciones al email y password,
//      gestiono errores con handleErrors y verifico credenciales
//      contra la base de datos usando bcrypt.
//   3) GET /logout → cierro la sesión del cliente.
// También añado un middleware auxiliar (rememberOldInput) para
// recordar el email introducido y volver a mostrarlo en la vista
// si hay errores de validación.
// -------------------------------------------------------------

const express = require('express');
const router = express.Router(); // Creo el router de Express
const bcrypt = require('bcrypt'); // Uso bcrypt para comprobar hashes de contraseña
const { body } = require('express-validator'); // Importo body para validar campos
const { handleErrors } = require('../middlewares/validators'); // Uso mi helper de errores

// GET /cliente/login → muestro el formulario de login
router.get('/login', (req, res) => {
  res.render('cliente/login'); // Renderizo la vista del formulario de login
});

// Middleware opcional para recordar lo que escribió el usuario
const rememberOldInput = (req, res, next) => {
  // Guardo el email introducido en req.localsForView.old
  req.localsForView = {
    old: {
      email: req.body?.email || '' // Si hay email en el body lo guardo, si no vacío
    }
  };
  next(); // Paso al siguiente middleware
};

// POST /cliente/login → valido, gestiono errores y luego ejecuto la lógica
router.post(
  '/login',
  [
    // Valido y saneo el campo email
    body('email')
      .trim() // Quito espacios alrededor
      .isEmail().withMessage('Email no válido') // Verifico formato de email
      .bail() // Si falla lo anterior, no sigo con más validaciones
      .normalizeEmail(), // Normalizo email (ej. mayúsculas → minúsculas)

    // Valido el campo password
    body('password')
      .isString().withMessage('La contraseña es obligatoria') // Aseguro que sea string
      .bail() // Si falla no sigo
      .isLength({ min: 6 }).withMessage('Contraseña mínima de 6 caracteres') // Mínimo 6
  ],
  rememberOldInput, // Guardo el email para re-render en caso de error
  handleErrors('cliente/login'), // Si hay errores re-renderizo la vista cliente/login
  async (req, res) => { // Si no hay errores paso a la lógica del login
    const { email, password } = req.body; // Extraigo email y password del body
    console.log('DEBUG login:', email, password);


    try {
      // Busco en la BD el cliente por email
      const [rows] = await req.pool.query('SELECT * FROM clientes WHERE email=?', [email]);

      // Si no encuentro ningún cliente, muestro error
      if (!rows.length) {
        req.session.error = 'Credenciales inválidas';
        return res.redirect('/cliente/login');
      }

      const c = rows[0]; // Tomo el primer cliente encontrado

      // Si no tiene contraseña registrada, muestro error
      if (!c.password_hash) {
        req.session.error = 'Este cliente no tiene clave asignada';
        return res.redirect('/cliente/login');
      }

      // Comparo la contraseña escrita con el hash almacenado
      const ok = await bcrypt.compare(password, c.password_hash);

      // Si no coincide, error
      if (!ok) {
        req.session.error = 'Credenciales inválidas';
        return res.redirect('/cliente/login');
      }

      // Si todo está bien, guardo el id del cliente en la sesión
      req.session.clienteId = c.id;
      req.session.success = 'Bienvenida/o'; // Mensaje de éxito
      res.redirect('/cliente/mis-pedidos'); // Redirijo al área privada
    } catch (e) {
      // Si algo falla en el servidor, lo registro y muestro error
      console.error(e);
      req.session.error = 'Error de servidor';
      res.redirect('/cliente/login');
    }
  }
  
);

// GET /cliente/logout → cierro la sesión del cliente
router.get('/logout', (req, res) => {
  delete req.session.clienteId; // Elimino clienteId de la sesión
  res.redirect('/cliente/login'); // Redirijo al login
});

// --- REGISTRO CLIENTE (form) ---
router.get('/register', (req, res) => {
  // Puedes pasar mensajes por sesión si quieres (success/error)
  const { success, error } = req.session;
  delete req.session.success;
  delete req.session.error;

  res.render('cliente/register', {
    success,
    error,
    // Si tu handleErrors ya inyecta "old" y "errors", no hace falta,
    // pero lo dejamos vacío para la primera carga:
    old: {},
    errors: {}
  });
});

// --- REGISTRO CLIENTE (guardar) ---
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Email no válido'),
    body('password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
    body('tipo_cliente').isIn(['persona', 'empresa']).withMessage('Tipo inválido'),
    body('empresa')
      .if(body('tipo_cliente').equals('empresa'))
      .notEmpty()
      .withMessage('Empresa requerida'),
    body().custom(b => (b.tipo_cliente === 'persona' ? (b.nombre || b.apellidos) : true))
      .withMessage('Indica nombre o apellidos'),
  ],
  // Este handleErrors debe re-renderizar 'cliente/register' con { errors, old }
  handleErrors('cliente/register'),
  async (req, res) => {
    const { tipo_cliente, empresa, nombre, apellidos, email, telefono, direccion_entrega, password } = req.body;

    try {
      // ¿Ya existe el email?
      const [exists] = await req.pool.query('SELECT id FROM clientes WHERE email=?', [email]);
      if (exists.length) {
        req.session.error = 'Ese email ya está registrado';
        return res.redirect('/cliente/register');
      }

      // Hash de contraseña
      const hash = await bcrypt.hash(password, 10);

      // Insert
      const [r] = await req.pool.query(
        `INSERT INTO clientes (tipo_cliente, empresa, nombre, apellidos, email, telefono, direccion_entrega, password_hash)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          tipo_cliente,
          empresa || null,
          nombre || null,
          apellidos || null,
          email,
          telefono || null,
          direccion_entrega || null,
          hash
        ]
      );

      // Autologin
      req.session.clienteId = r.insertId;
      req.session.success = 'Registro correcto';
      return res.redirect('/cliente/mis-pedidos');
    } catch (e) {
      console.error(e);
      req.session.error = 'Error en el servidor';
      return res.redirect('/cliente/register');
    }
  }
);

// Exporto el router para usarlo en la app
module.exports = router;
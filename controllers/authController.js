// controllers/authController.js
const bcrypt = require('bcrypt');

// GET /auth/register
exports.getRegister = (req, res) => {
  res.render('register');
};

// POST /auth/register
// (Usa email + password_hash, coherente con la tabla `usuarios`)
exports.postRegister = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.session.error = 'Todos los campos son obligatorios';
    return res.redirect('/auth/register');
  }

  try {
    // ¿Existe ya ese email?
    const [rows] = await req.pool.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );
    if (rows.length > 0) {
      req.session.error = 'Ese email ya está registrado';
      return res.redirect('/auth/register');
    }

    // Crear usuario
    const hashedPassword = await bcrypt.hash(password, 10);
    await req.pool.query(
      'INSERT INTO usuarios (email, password_hash) VALUES (?, ?)',
      [email, hashedPassword]
    );

    req.session.success = 'Registro exitoso. Ya puedes iniciar sesión';
    res.redirect('/auth/login');
  } catch (err) {
    console.error(err);
    req.session.error = 'Error en el servidor';
    res.redirect('/auth/register');
  }
};

// GET /auth/login
exports.getLogin = (req, res) => {
  res.render('login');
};

// POST /auth/login
exports.postLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.session.error = 'Todos los campos son obligatorios';
    return res.redirect('/auth/login');
  }

  try {
    // Buscar por email
    const [rows] = await req.pool.query(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );
    if (rows.length === 0) {
      req.session.error = 'Usuario o contraseña incorrectos';
      return res.redirect('/auth/login');
    }

    const user = rows[0];

    // Comparar con password_hash
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      req.session.error = 'Usuario o contraseña incorrectos';
      return res.redirect('/auth/login');
    }

    // Ok → sesión
    req.session.userId = user.id;
    req.session.success = 'Has iniciado sesión';
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.session.error = 'Error en el servidor';
    res.redirect('/auth/login');
  }
};

// GET /auth/logout
exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/'));
};

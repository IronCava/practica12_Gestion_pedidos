# Gestión de pedidos (Node.js + Express + MySQL + EJS)

Aplicación web para gestión de productos, clientes y pedidos, con área de administración y área de cliente.  
Incluye login/registro con contraseñas hasheadas, sesiones, validaciones y actualizaciones en tiempo real con **Socket.IO**.

👉 Para ver cómo funciona la app en acción, mira este vídeo: [📺 Ver demo en Vimeo](https://vimeo.com/1114958874?fl=pl&fe=sh)

---

## 🚀 Requisitos previos
- Node.js ≥ 18  
- MySQL ≥ 8  
- npm  

---

## ⚙️ Instalación
```bash
git clone <URL-del-repo>
cd practica12_07_07_25
npm install
```

---

## 🔑 Configuración de entorno (`.env`)
Crea un archivo `.env` en la raíz con:

```ini
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=gestion_pedidos
SESSION_SECRET=un_string_seguro
PORT=4000
```

---

## 🗄️ Base de datos
- Script SQL inicial en `/db/schema.sql`.  
- Tablas principales:  
  - `usuarios` (admins)  
  - `clientes`  
  - `productos`  
  - `pedidos`  
  - `pedido_productos`  
  - `pagos`  
- Vistas de apoyo:  
  - `v_pedido_totales`  
  - `v_pedido_estado_pago`  

---

## ▶️ Arrancar la aplicación
```bash
npm run dev   # con nodemon
# o
npm start
```

La app se abrirá en:  
👉 `http://localhost:4000/`

---

## 👤 Credenciales iniciales
- **Administrador** creado manualmente en la BD:  
  ```
  Email: admin@demo.com
  Password: 123456
  ```
- Los **clientes** pueden registrarse directamente en `/cliente/register`.

---

## 📂 Estructura de carpetas
```plaintext
├── app.js
├── config/db.js
├── controllers/
├── middlewares/
├── routes/
│   ├── auth.js
│   ├── clientes.js
│   ├── productos.js
│   ├── pedidos.js
│   └── clienteAuth.js
├── views/
│   ├── cliente/
│   ├── clientes/
│   ├── productos/
│   ├── pedidos/
│   └── ...
├── public/css/app.css
├── package.json
└── .env
```

---

## ✨ Características principales
- 🔑 Login y registro de **admin** y **clientes**.  
- 🛍️ CRUD de productos y clientes (admin).  
- 📦 Gestión de pedidos y pagos (admin).  
- 👤 Área cliente con pedidos y detalles.  
- ⚡ Actualizaciones en tiempo real con **Socket.IO**.  
- 🎨 Estilo brutalista con CSS personalizado.  

---

## 📸 Capturas de pantalla
Incluye capturas de:
- Dashboard (admin)  
- Listado de pedidos  
- Detalle de pedido  
- Área cliente  

---

## 📝 Licencia
Este proyecto se desarrolla como práctica educativa en el marco del Certificado de Profesionalidad **IFCD0210 – Desarrollo de Aplicaciones con Tecnologías Web** (Ironhack / Consorci de Catalunya).

---

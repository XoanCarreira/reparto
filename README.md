# 📦 Reparto - Sistema de Gestión de Entregas

Sistema moderno, escalable y ligero para la gestión de entregas entre empresas y clientes. Construido con **SvelteKit** y diseño **responsive**, con planes de convertirse en PWA para acceso desde móviles.

---

## ✨ Características Principales

### Para Administradores
- **📊 Dashboard**: Vista general con estadísticas en tiempo real
- **📦 Gestión de Pedidos**: Ver, filtrar y marcar pedidos como entregados
- **📋 Control de Stock**: Visualizar inventario y productos con stock bajo
- **👥 Gestión de Clientes**: Ver información y actividad de cada cliente
- **⚠️ Incidencias**: Registrar y resolver problemas de entregas

### Para Clientes
- **🛒 Carrito de Compras**: Crear pedidos de forma intuitiva
- **📦 Mis Pedidos**: Ver estado de entregas y historial
- **🛍️ Catálogo**: Explorar productos disponibles con filtros
- **👤 Mi Perfil**: Información personal y estadísticas de compra
- **📍 Zona de Reparto**: Ver horarios y ubicación de entregas

---

## 🚀 Comenzar

### Requisitos
- Node.js 18+ 
- npm o pnpm

### Instalación

```bash
# Clonar o descargar el proyecto
cd reparto

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Visita http://localhost:5173
```

### Credenciales de Prueba

**Admin:**
- Email: `admin@empresa.com`
- Contraseña: `admin123`

**Cliente:**
- Email: `cliente1@empresa.com`
- Contraseña: `cliente123`

---

## 📁 Estructura del Proyecto

```
src/
├── lib/
│   ├── data/
│   │   └── mockData.js           # Datos de ejemplo (usuarios, productos, órdenes)
│   ├── stores/
│   │   ├── authStore.js          # Store de autenticación y sesión
│   │   └── dataStore.js          # Stores de productos, órdenes, incidencias
│   ├── components/
│   │   ├── Button.svelte         # Botón reutilizable
│   │   ├── Badge.svelte          # Badge de estado
│   │   ├── Card.svelte           # Contenedor de tarjeta
│   │   ├── InputField.svelte     # Campo de entrada
│   │   └── Navbar.svelte         # Barra de navegación
│   ├── utils/
│   │   └── helpers.js            # Funciones auxiliares
│   └── assets/
│
├── routes/
│   ├── +layout.svelte            # Layout global
│   ├── +page.svelte              # Página LOGIN
│   ├── admin/                    # Rutas admin (protegidas)
│   └── client/                   # Rutas cliente (protegidas)
│
├── app.html                       # HTML raíz + estilos globales
└── package.json

static/
├── manifest.json                  # Manifest PWA
└── robots.txt
```

---

## 🔑 Conceptos Principales

### Autenticación
- Login simple con email/contraseña
- Roles: `admin` y `client`
- Sesión en localStorage
- **Rutas protegidas** según rol

### Estado de Pedidos
- **pending**: En espera
- **delivered**: Entregado
- **cancelled**: Cancelado

### Almacenamiento
- Datos mock en **stores reactivos de Svelte**
- Fácil migración a API/BD

---

## 💡 Uso

### Acceso admin: `/admin/dashboard`
- Ver estadísticas
- Gestionar pedidos, stock, clientes
- Responder incidencias

### Acceso cliente: `/client/orders`
- Ver y crear pedidos
- Explorar catálogo
- Ver perfil y zona de reparto

---

## 🛠️ Extensión del Proyecto

### Agregar Producto
Edita `src/lib/data/mockData.js`:

```javascript
{
  id: 7,
  name: 'Producto',
  category: 'Categoría',
  stock: 50,
  price: 9.99,
  ...
}
```

### Agregar Cliente
```javascript
{
  id: 104,
  email: 'new@email.com',
  name: 'Empresa',
  role: 'client',
  zone: 1,
  ...
}
```

---

## 📱 PWA (Futuro)

Para convertir en PWA instalable:
1. ✅ Manifest.json incluido
2. 📝 Desplegar en HTTPS
3. 📝 Crear Service Worker
4. 📝 Generar iconos 192x512

---

## 🔒 Seguridad

⚠️ Para producción agrega:
- Autenticación JWT/OAuth
- Hash de contraseñas (bcrypt)
- Validación en backend
- HTTPS
- Rate limiting
- CORS

---

## 📚 Recursos

- [SvelteKit](https://kit.svelte.dev/)
- [Svelte Stores](https://svelte.dev/docs/svelte-stores)
- [Tailwind CSS](https://tailwindcss.com/)
- [PWA Docs](https://web.dev/progressive-web-apps/)

---

**Versión**: 1.0.0 | **Estado**: Beta → PWA
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.12.8 create --template minimal --no-types --add prettier eslint --install npm reparto
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

# 🚀 GUÍA DE DESPLIEGUE EN NETLIFY

## Configuración Completada

Este proyecto está configurado para desplegar en **Netlify** con las siguientes características:

### ✅ Seguridad Implementada
- **Security Headers**: CSP, X-Frame-Options, HSTS, Permissions-Policy
- **Row Level Security (RLS)**: Políticas PostgreSQL por rol
- **Autenticación**: Supabase Auth con validación en BD
- **SessionStorage**: Sesión segura en memoria (no localStorage)
- **Session Timeout**: Logout automático después de 1 hora
- **Validación de inputs**: Sanitización en frontend y backend

### ⚙️ Configuración Deploytment
- **Adaptador**: `@sveltejs/adapter-netlify`
- **Build Command**: `npm run build`
- **Publish Directory**: `.svelte-kit/netlify`
- **Node Functions**: Build estándar con esbuild

---

## 📋 Pasos para Desplegar

### 1. Preparar el Repositorio Git
```bash
cd /home/xoan/Proxectos\ VSCode/reparto

# Inicializar git (si no está ya)
git init
git add .
git commit -m "Initial commit: ready for Netlify deployment"
git branch -M main
```

### 2. Conectar con Netlify

#### Opción A: Netlify CLI (Recomendado para desarrollo)
```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Autenticarse
netlify login

# Conectar este proyecto a Netlify
netlify init

# Seleccionar:
# ✓ Create & configure a new site
# ✓ Team: Elige tu equipo
# ✓ Site name: reparto (o tu nombre preferido)
```

#### Opción B: GitHub + Netlify UI (Recomendado para producción)
1. Push el repositorio a GitHub
2. Ir a [netlify.com](https://netlify.com)
3. Click "New site from Git"
4. Autorizar y conectar tu repositorio GitHub
5. Netlify detectará automáticamente `netlify.toml` y configurará todo

### 3. Configurar Variables de Entorno en Netlify

**En Netlify UI**:
1. Site Settings → Build & deploy → Environment
2. Add environment variables:

```
PUBLIC_SUPABASE_URL = https://vkypfoyjuogyoqlowcbg.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY = sb_publishable_EclIhVRzxo_eoZXlOhfI0A_YjgMPU4Y
```

⚠️ **IMPORTANTE**: Estas variables **son públicas** (comienzan con `PUBLIC_`).
- Supabase RLS protege los datos
- No incluir secrets/API keys privadas aquí

### 4. Desplegar

#### Con Netlify CLI:
```bash
# Deploy (desarrollo)
netlify deploy --prod
```

#### Con GitHub + Netlify:
- Hacer push a `main` rama automáticamente dispara deploy

### 5. Probar en Vivo

```bash
# Ver logs en tiempo real
netlify logs

# Abrir sitio
netlify open
```

---

## 🔐 Seguridad - Checklist Pre-Producción

### En Netlify UI - Site Settings

- [ ] **HTTPS automático**: Debe estar habilitado por defecto
- [ ] **Certificado SSL**: Verificar en "Certificates"
- [ ] **Domain custom**: Configurar si tienes dominio propio
- [ ] **Branch deploys**: Solo main/production

### En Supabase Console

- [ ] **RLS enabled** en todas las tablas (ya hecho)
- [ ] **Auth providers**: Solo Email/Password habilitado
- [ ] **Rate limiting**: Verificar policies
- [ ] **Backups**: Configurar backup automático diario

### En tu Código

- [ ] No commitar `.env` archivos en variables sensibles
- [ ] `netlify.toml` tiene CSP headers configurado
- [ ] HSTS header está habilitado (max-age 1 año)
- [ ] Validadores de input están siendo usados

---

## 📊 Variables de Entorno Disponibles

### Cliente (Public)
```javascript
// Automáticamente disponibles en import.meta.env
PUBLIC_SUPABASE_URL        // URL de tu proyecto
PUBLIC_SUPABASE_PUBLISHABLE_KEY // Clave pública
VITE_SESSION_TIMEOUT       // 3600000ms (1 hora)
VITE_API_TIMEOUT           // 30000ms
```

### Servidor (Solo en edge/functions)
No implementado aún (architecture es client-side con RLS en BD)

---

## 🐛 Troubleshooting

### Error: "PUBLIC_SUPABASE_URL is not defined"
- Verificar que variables están en Netlify Environment
- Redeploy después de agregar variables
- Limpiar cache del navegador

### Error: "RLS policy violation"
- Verificar que usuario está autenticado
- Revisar políticas RLS en Supabase console
- Ver logs en Supabase para mayor detalle

### Sesión se pierde al recargar
- SessionStorage se comporta así (esperado en navegadores)
- Usuario debe estar en Supabase Auth para persistencia
- En navegador privado/incógnito: sesión perdida al cerrar

### Build falla en Netlify
```bash
# Test build localmente
npm run build

# Ver errores específicos
npm run build -- --verbose

# Verificar que netlify.toml es válido
npx netlify status
```

---

## 📈 Monitoreo

### Logs en Netlify UI
- Site Analytics: Visualizar tráfico
- Builds: Ver historiales de deploy
- Functions: Logs de cualquier función edge

### Logs en Supabase
- Auth tab: Intentos de login
- Edge logs: Anomalías de RLS
- API section: Rate limiting hits

---

## 🔄 Actualizar Después del Deploy

```bash
# Hacer cambios locales
git add .
git commit -m "Fix: security headers update"

# Push a main dispara deploy automático
git push origin main

# Seguir progreso
netlify logs --tail
```

---

## ✨ Próximos Pasos

1. **Testing en Producción**
   - Probar login con usuarios diferentes roles
   - Verificar que datos sensibles no son accesibles
   - Validar que CSP headers están presente

2. **Monitoreo Continuo**
   - Configurar Sentry para error tracking (opcional)
   - Revisar logs semanalmente
   - Actualizar Supabase cuando hay nuevas versiones

3. **Mejoras de Seguridad**
   - Implementar 2FA en admin
   - Agregar audit logging
   - Configurar CORS estricto si es necesario

---

## 📞 Recursos Útiles

- [SvelteKit Adapter Netlify](https://kit.svelte.dev/docs/adapters)
- [Netlify Documentation](https://docs.netlify.com)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Security Headers](https://securityheaders.com)

---

## 🎉 ¡Felicidades!

Tu proyecto está listo para producción. Sigue esta guía y estarás online en minutos.

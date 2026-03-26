# Reparto

Aplicación de gestión de entregas con SvelteKit.

## Requisitos

- Node.js 20+
- npm
- Proyecto Supabase enlazado

## Configuración

1. Instala dependencias:

```bash
npm install
```

2. Configura variables públicas en `.env.example` (o en tu `.env` local):

```dotenv
PUBLIC_SUPABASE_URL=...
PUBLIC_SUPABASE_ANON_KEY=...
```

3. Aplica migraciones en Supabase:

```bash
npx supabase db push
```

## Desarrollo

```bash
npm run dev
```

## Notas

- La aplicación usa Supabase como fuente única de datos.
- No se incluyen datos de ejemplo ni credenciales de demostración en la UI.

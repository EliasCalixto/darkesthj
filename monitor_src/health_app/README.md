This is a [Next.js](https://nextjs.org) dashboard that reads health data (pasos, sueño, frecuencia cardíaca, HRV, VO₂máx, entrenamientos y sesiones de terapia) directamente desde la página "Health" de Notion.

## Configuración

1. Crea una integración interna en Notion (Settings -> Connections -> Develop or manage integrations) y copia su secreto.
2. Comparte la página "Health" (y sus bases de datos 📅 Resumen Mensual, 🏃 Entrenamientos y 🧠 Therapy) con esa integración.
3. Copia `.env.example` a `.env.local` y completa `NOTION_TOKEN` con el secreto de la integración:

```bash
cp .env.example .env.local
```

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) para ver el dashboard.

## Build

```bash
npm run build
npm start
```

## Deploy en GitHub Pages

El sitio se genera como una exportación estática (`output: "export"`) y se publica en GitHub Pages mediante el workflow `.github/workflows/deploy.yml`. Como es estático, los datos de Notion se obtienen durante el build, no en cada visita; el workflow reconstruye el sitio automáticamente cada 6 horas además de en cada push a `main`.

Para activarlo:

1. En el repositorio, agrega los secrets `NOTION_TOKEN` y `NOTION_PAGE_ID` en **Settings -> Secrets and variables -> Actions -> Secrets** (no como "Variables", ya que esas se ven en texto plano).
2. En **Settings -> Pages**, selecciona como *Source* la opción **GitHub Actions**.
3. Haz push a `main` (o ejecuta el workflow manualmente desde la pestaña *Actions*) y espera a que termine el deploy. El sitio quedará disponible en `https://<usuario>.github.io/<repositorio>/`.

## Deploy en Vercel

Configura las variables de entorno `NOTION_TOKEN` y `NOTION_PAGE_ID` en el proyecto de Vercel y despliega normalmente.

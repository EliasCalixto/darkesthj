This is a [Next.js](https://nextjs.org) dashboard that reads food and calorie data directly from the "Health" page in Notion.

## Configuración

1. Crea una integración interna en Notion (Settings -> Connections -> Develop or manage integrations) y copia su secreto.
2. Comparte la página "Health" y la base de datos 🍎 Alimentación con esa integración.
3. Copia `.env.example` a `.env.local` y completa `NOTION_TOKEN` con el secreto de la integración:

```bash
cp .env.example .env.local
```

4. Si cambiaste la base de datos de alimentación en Notion, actualiza también `NOTION_FOOD_DATA_SOURCE_ID` en `.env.local`. Si usas la base actual, puedes dejar el valor por defecto.

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) para ver el dashboard.

Para probar localmente con la misma ruta final de producción:

```bash
NEXT_BASE_PATH=/monitor/health npm run dev
```

Abre [http://localhost:3000/monitor/health](http://localhost:3000/monitor/health).

## Build

```bash
npm run build
npm start
```

## Deploy en GitHub Pages

El sitio se genera como una exportación estática (`output: "export"`) y se copia a `docs/monitor/health` mediante el workflow `.github/workflows/deploy.yml`. Como es estático, los datos de Notion se obtienen durante el build, no en cada visita; el workflow reconstruye el sitio automáticamente cada 15 minutos además de en cada push a `main`.

Para activarlo:

1. En el repositorio, agrega los secrets `NOTION_TOKEN` y `NOTION_PAGE_ID_HEALTH` en **Settings -> Secrets and variables -> Actions -> Secrets** (no como "Variables", ya que esas se ven en texto plano).
2. En **Settings -> Pages**, selecciona **Deploy from a branch**, rama `main` y carpeta `/docs`.
3. Haz push a `main` (o ejecuta el workflow manualmente desde la pestaña *Actions*) y espera a que termine el deploy. El dashboard quedará disponible en `/monitor/health/`.

## Deploy en Vercel

Configura las variables de entorno `NOTION_TOKEN` y `NOTION_PAGE_ID` en el proyecto de Vercel y despliega normalmente.

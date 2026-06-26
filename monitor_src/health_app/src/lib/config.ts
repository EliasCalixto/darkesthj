// Notion integration configuration.
// NOTION_TOKEN: internal integration secret with access to the "Health" page (and its databases).
// NOTION_PAGE_ID: the ID of the "Health" page in Notion.
export const NOTION_TOKEN = (process.env.NOTION_TOKEN ?? "").trim();

// El secreto de GitHub puede traer espacios sobrantes o incluso la URL completa
// pegada por error; normalizamos a un ID hex de 32 caracteres para que la API
// de Notion (que valida UUID) no falle.
function normalizePageId(raw: string): string {
  const trimmed = raw.trim();
  const matches = trimmed.match(/[0-9a-fA-F]{32}/g);
  return matches ? matches[matches.length - 1] : trimmed;
}

export const HEALTH_PAGE_ID = normalizePageId(
  process.env.NOTION_PAGE_ID ?? "104e6c72cc7280b582bbeb8757c49704",
);

// Data source IDs for the databases linked from the Health page.
// These are stable for this workspace; override via env vars if needed.
export const MONTHLY_DATA_SOURCE_ID =
  process.env.NOTION_MONTHLY_DATA_SOURCE_ID ??
  "4311bffa-3f5c-4fee-93e9-5b4dfe389055";

export const WORKOUTS_DATA_SOURCE_ID =
  process.env.NOTION_WORKOUTS_DATA_SOURCE_ID ??
  "684ea392-f7c3-49e3-859d-d906a797fcb2";

export const THERAPY_DATA_SOURCE_ID =
  process.env.NOTION_THERAPY_DATA_SOURCE_ID ??
  "29fe6c72-cc72-815f-b7d4-000ba5715621";

// 🍎 Alimentación: manual food log (Nombre / Calorías / Date).
export const FOOD_DATA_SOURCE_ID =
  process.env.NOTION_FOOD_DATA_SOURCE_ID ??
  "5ea92aec-1c64-4a47-977a-bd6041bcbe3e";

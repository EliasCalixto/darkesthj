import { Client } from "@notionhq/client";
import type {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client";
import {
  FOOD_DATA_SOURCE_ID,
  HEALTH_PAGE_ID,
  MONTHLY_DATA_SOURCE_ID,
  NOTION_TOKEN,
  THERAPY_DATA_SOURCE_ID,
  WORKOUTS_DATA_SOURCE_ID,
} from "./config";
import type {
  FoodEntry,
  MonthlySummary,
  TherapySession,
  Workout,
  WorkoutType,
} from "./types";

let client: Client | null = null;

function getClient(): Client {
  if (!NOTION_TOKEN) {
    throw new Error("Falta la variable de entorno NOTION_TOKEN");
  }
  if (!client) {
    client = new Client({ auth: NOTION_TOKEN });
  }
  return client;
}

type Properties = PageObjectResponse["properties"];

function getNumber(properties: Properties, name: string): number | null {
  const prop = properties[name];
  if (!prop || prop.type !== "number") return null;
  return prop.number;
}

function getTitle(properties: Properties, name: string): string {
  const prop = properties[name];
  if (!prop || prop.type !== "title") return "";
  return prop.title.map((t) => t.plain_text).join("");
}

function getDate(properties: Properties, name: string): string | null {
  const prop = properties[name];
  if (!prop || prop.type !== "date" || !prop.date) return null;
  return prop.date.start;
}

function getSelect(properties: Properties, name: string): string | null {
  const prop = properties[name];
  if (!prop || prop.type !== "select" || !prop.select) return null;
  return prop.select.name;
}

async function queryAllPages(dataSourceId: string) {
  const notion = getClient();
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    });
    pages.push(...(response.results as PageObjectResponse[]));
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return pages;
}

export async function getMonthlySummary(): Promise<MonthlySummary[]> {
  const pages = await queryAllPages(MONTHLY_DATA_SOURCE_ID);

  return pages
    .map((page) => {
      const props = page.properties;
      return {
        month: getTitle(props, "Mes"),
        date: getDate(props, "Fecha") ?? "",
        steps: getNumber(props, "Pasos diarios"),
        energy: getNumber(props, "Energía diaria"),
        exerciseMinutes: getNumber(props, "Ejercicio diario"),
        sleepHours: getNumber(props, "Sueño (h)"),
        floors: getNumber(props, "Pisos diarios"),
        restingHeartRate: getNumber(props, "FC reposo"),
        hrv: getNumber(props, "HRV (ms)"),
        vo2max: getNumber(props, "VO2máx"),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

const KNOWN_WORKOUT_TYPES: WorkoutType[] = [
  "Caminata",
  "Correr",
  "Core",
  "Fútbol",
  "Saltar cuerda",
  "Fitness Gaming",
  "Fuerza",
];

export async function getWorkouts(): Promise<Workout[]> {
  const pages = await queryAllPages(WORKOUTS_DATA_SOURCE_ID);

  return pages
    .map((page) => {
      const props = page.properties;
      const type = getSelect(props, "Tipo");
      return {
        activity: getTitle(props, "Actividad"),
        type: KNOWN_WORKOUT_TYPES.find((t) => t === type) ?? null,
        date: getDate(props, "Fecha") ?? "",
        durationMinutes: getNumber(props, "Duración (min)"),
        distanceKm: getNumber(props, "Distancia (km)"),
        energyKcal: getNumber(props, "Energía (kcal)"),
        avgHeartRate: getNumber(props, "FC media"),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getFood(): Promise<FoodEntry[]> {
  const pages = await queryAllPages(FOOD_DATA_SOURCE_ID);

  return pages
    .map((page) => {
      const props = page.properties;
      return {
        name: getTitle(props, "Nombre"),
        date: getDate(props, "Date") ?? "",
        calories: getNumber(props, "Calorías"),
        protein: getNumber(props, "Proteína (g)"),
        carbs: getNumber(props, "Carbohidratos (g)"),
        fat: getNumber(props, "Grasas (g)"),
        fiber: getNumber(props, "Fibra (g)"),
      };
    })
    .filter((entry) => entry.date !== "")
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getTherapySessions(): Promise<TherapySession[]> {
  const pages = await queryAllPages(THERAPY_DATA_SOURCE_ID);

  return pages
    .map((page) => {
      const props = page.properties;
      return {
        name: getTitle(props, "Name"),
        date: getDate(props, "Date"),
        url: page.url,
      };
    })
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

// --- Render the full Notion "Health" page to HTML --------------------------
// Recorremos los bloques de la página con la API estable `blocks.children.list`
// (la antigua `pages.retrieveMarkdown` devolvía null en este SDK) y los
// convertimos a HTML con las clases que estiliza globals.css (.notion-content).
// Así TODO lo que el usuario escribe en su página de Notion —encabezados,
// párrafos, listas y tablas— aparece en el dashboard y se actualiza solo.

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderRichText(richText: RichTextItemResponse[]): string {
  return richText
    .map((token) => {
      let html = escapeHtml(token.plain_text);
      const a = token.annotations;
      if (a.code) html = `<code>${html}</code>`;
      if (a.bold) html = `<strong>${html}</strong>`;
      if (a.italic) html = `<em>${html}</em>`;
      if (token.href) {
        html = `<a href="${escapeHtml(token.href)}" target="_blank" rel="noreferrer">${html}</a>`;
      }
      return html;
    })
    .join("");
}

async function listAllBlocks(blockId: string): Promise<BlockObjectResponse[]> {
  const notion = getClient();
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    blocks.push(...(response.results as BlockObjectResponse[]));
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return blocks;
}

async function renderTable(block: BlockObjectResponse & { type: "table" }): Promise<string> {
  const rows = await listAllBlocks(block.id);
  const hasHeader = block.table.has_column_header;

  const rowsHtml = rows
    .map((row, index) => {
      if (row.type !== "table_row") return "";
      const cells = row.table_row.cells
        .map((cell) => {
          const tag = hasHeader && index === 0 ? "th" : "td";
          return `<${tag}>${renderRichText(cell)}</${tag}>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<table>${rowsHtml}</table>`;
}

export async function getHealthPageHtml(): Promise<string | null> {
  const blocks = await listAllBlocks(HEALTH_PAGE_ID);
  const parts: string[] = [];
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      parts.push("</ul>");
      listOpen = false;
    }
  };

  for (const block of blocks) {
    if (block.type === "bulleted_list_item") {
      if (!listOpen) {
        parts.push("<ul>");
        listOpen = true;
      }
      parts.push(`<li>${renderRichText(block.bulleted_list_item.rich_text)}</li>`);
      continue;
    }

    closeList();

    switch (block.type) {
      case "heading_1":
        parts.push(`<h2>${renderRichText(block.heading_1.rich_text)}</h2>`);
        break;
      case "heading_2":
        parts.push(`<h2>${renderRichText(block.heading_2.rich_text)}</h2>`);
        break;
      case "heading_3":
        parts.push(`<h3>${renderRichText(block.heading_3.rich_text)}</h3>`);
        break;
      case "paragraph": {
        const html = renderRichText(block.paragraph.rich_text);
        if (html.trim()) parts.push(`<p>${html}</p>`);
        break;
      }
      case "quote":
        parts.push(`<blockquote>${renderRichText(block.quote.rich_text)}</blockquote>`);
        break;
      case "callout":
        parts.push(`<p>${renderRichText(block.callout.rich_text)}</p>`);
        break;
      case "code":
        parts.push(
          `<pre><code>${escapeHtml(block.code.rich_text.map((t) => t.plain_text).join(""))}</code></pre>`,
        );
        break;
      case "divider":
        // Evita reglas duplicadas o al inicio (quedan junto a las databases).
        if (parts.length > 0 && parts[parts.length - 1] !== "<hr />") {
          parts.push("<hr />");
        }
        break;
      case "table":
        parts.push(await renderTable(block));
        break;
      default:
        // child_database, child_page, etc. -> se omiten (no son texto legible).
        break;
    }
  }

  closeList();

  const html = parts.join("\n").trim();
  return html.length > 0 ? html : null;
}

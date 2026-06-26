import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client";
import {
  HEALTH_PAGE_ID,
  MONTHLY_DATA_SOURCE_ID,
  NOTION_TOKEN,
  THERAPY_DATA_SOURCE_ID,
  WORKOUTS_DATA_SOURCE_ID,
} from "./config";
import type {
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

export async function getHealthPageIntro(): Promise<string | null> {
  const notion = getClient();
  const { markdown } = await notion.pages.retrieveMarkdown({
    page_id: HEALTH_PAGE_ID,
  });

  const firstHeadingIndex = markdown.indexOf("\n#");
  const intro =
    firstHeadingIndex === -1 ? markdown : markdown.slice(0, firstHeadingIndex);

  // Notion serializa los enlaces a bases de datos incrustadas como pseudo-tags
  // "<database ...>...</database>" dentro del markdown; no son contenido legible,
  // así que se descartan en vez de mostrarlos como texto crudo.
  const cleaned = intro
    .replace(/<database\b[^>]*>[\s\S]*?<\/database>/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

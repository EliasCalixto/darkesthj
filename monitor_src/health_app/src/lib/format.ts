export function formatNumber(value: number | null, decimals = 0): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

// Hora de la última consulta a Notion (el build hace fetch de Notion, así que
// la marca de build == última actualización de datos). Siempre en hora de Perú
// (America/Lima, UTC−5 sin horario de verano), independientemente del visitante.
export function formatBuildTimestamp(date: Date): string {
  const formatted = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
  }).format(date);
  return `${formatted} (Perú)`;
}

export function formatDuration(minutes: number | null): string {
  if (minutes == null) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins} min`;
  return `${hours}h ${mins}m`;
}

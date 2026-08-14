// Selección de periodo compartida por todo el dashboard de Health. Las opciones
// y los rangos replican exactamente los de Finance (monitor_src/finance/dashboard.js
// → computePeriod) para que ambos dashboards se comporten igual.

export type Period =
  | "today"
  | "this-week"
  | "this-month"
  | "last-month"
  | "3m"
  | "6m"
  | "year"
  | "last-year"
  | "all";

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "this-week", label: "Esta semana" },
  { value: "this-month", label: "Este mes" },
  { value: "last-month", label: "Mes anterior" },
  { value: "3m", label: "Últimos 3 meses" },
  { value: "6m", label: "Últimos 6 meses" },
  { value: "year", label: "Este año" },
  { value: "last-year", label: "Año anterior" },
  { value: "all", label: "Todo" },
];

export type DateRange = { from: Date | null; to: Date | null };

// Mismos límites que Finance: meses anclados al día 1, semana anclada al lunes.
export function computePeriod(period: Period, now = new Date()): DateRange {
  switch (period) {
    case "today":
      return {
        from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
      };
    case "this-week": {
      const dow = (now.getDay() + 6) % 7; // 0 = lunes … 6 = domingo
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
      const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6, 23, 59, 59);
      return { from, to };
    }
    case "this-month":
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    case "last-month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      };
    case "3m":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    case "6m":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    case "year":
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      };
    case "last-year":
      return {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59),
      };
    case "all":
    default:
      return { from: null, to: null };
  }
}

// Periodo inmediatamente anterior, de la misma duración, para las comparativas
// (la flecha ▲/▼ de las KPIs mensuales). Para "all" no hay periodo previo.
export function precedingPeriod(range: DateRange): DateRange {
  if (!range.from || !range.to) return { from: null, to: null };
  const len = range.to.getTime() - range.from.getTime();
  const to = new Date(range.from.getTime() - 1);
  const from = new Date(range.from.getTime() - len - 1);
  return { from, to };
}

// Construye una fecha local a partir de un ISO (o "YYYY-MM-DD"), evitando el
// corrimiento de zona horaria que introduce new Date(iso) al interpretar UTC.
export function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, d || 1);
}

// Para datos con fecha puntual (comidas, entrenamientos).
export function inRange(dateStr: string, range: DateRange): boolean {
  const date = parseLocalDate(dateStr);
  if (!date) return false;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

// Para datos mensuales (resumen mensual): el mes se incluye si se solapa con el
// rango, no solo si su día 1 cae dentro (así "Esta semana" sigue mostrando el
// mes en curso).
export function monthInRange(dateStr: string, range: DateRange): boolean {
  const start = parseLocalDate(dateStr);
  if (!start) return false;
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
  if (range.from && end < range.from) return false;
  if (range.to && start > range.to) return false;
  return true;
}

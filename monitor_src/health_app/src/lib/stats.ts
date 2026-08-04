import type {
  FoodDay,
  FoodEntry,
  MacroSplit,
  MonthlySummary,
  Workout,
  WorkoutTypeSummary,
} from "./types";

export type MetricKey = keyof Pick<
  MonthlySummary,
  | "steps"
  | "energy"
  | "exerciseMinutes"
  | "sleepHours"
  | "floors"
  | "restingHeartRate"
  | "hrv"
  | "vo2max"
>;

export type KpiSummary = {
  key: MetricKey;
  label: string;
  icon: string;
  unit: string;
  value: number | null;
  comparison: number | null;
  decimals: number;
  // Si un valor más alto es más saludable (pasos, HRV...) o no (FC en reposo).
  higherIsBetter: boolean;
};

const KPI_DEFS: {
  key: MetricKey;
  label: string;
  icon: string;
  unit: string;
  decimals: number;
  higherIsBetter: boolean;
}[] = [
  { key: "steps", label: "Pasos por día", icon: "👟", unit: "pasos", decimals: 0, higherIsBetter: true },
  { key: "sleepHours", label: "Sueño por noche", icon: "😴", unit: "h", decimals: 1, higherIsBetter: true },
  { key: "restingHeartRate", label: "FC en reposo", icon: "❤️", unit: "bpm", decimals: 1, higherIsBetter: false },
  { key: "hrv", label: "HRV (SDNN)", icon: "📈", unit: "ms", decimals: 1, higherIsBetter: true },
  { key: "vo2max", label: "VO₂máx", icon: "🫁", unit: "mL/min·kg", decimals: 1, higherIsBetter: true },
  { key: "exerciseMinutes", label: "Ejercicio por día", icon: "🔥", unit: "min", decimals: 0, higherIsBetter: true },
  { key: "energy", label: "Energía activa diaria", icon: "⚡", unit: "Cal", decimals: 0, higherIsBetter: true },
  { key: "floors", label: "Pisos por día", icon: "🪜", unit: "pisos", decimals: 1, higherIsBetter: true },
];

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function averageOf(months: MonthlySummary[], key: MetricKey): number | null {
  return average(months.filter((m) => m[key] != null).map((m) => m[key] as number));
}

export function buildKpiSummaries(
  months: MonthlySummary[],
  comparisonMonths: MonthlySummary[],
): KpiSummary[] {
  return KPI_DEFS.map(({ key, label, icon, unit, decimals, higherIsBetter }) => ({
    key,
    label,
    icon,
    unit,
    decimals,
    higherIsBetter,
    value: averageOf(months, key),
    comparison: averageOf(comparisonMonths, key),
  }));
}

export function summarizeWorkoutsByType(workouts: Workout[]): WorkoutTypeSummary[] {
  const groups = new Map<string, Workout[]>();

  for (const workout of workouts) {
    const type = workout.type ?? "Otro";
    const list = groups.get(type) ?? [];
    list.push(workout);
    groups.set(type, list);
  }

  return Array.from(groups.entries())
    .map(([type, list]) => {
      const heartRates = list
        .map((w) => w.avgHeartRate)
        .filter((v): v is number => v != null);

      return {
        type,
        sessions: list.length,
        totalDurationMinutes: sum(list.map((w) => w.durationMinutes)),
        totalDistanceKm: sum(list.map((w) => w.distanceKm)),
        totalEnergyKcal: sum(list.map((w) => w.energyKcal)),
        avgHeartRate: heartRates.length > 0 ? average(heartRates) : null,
      };
    })
    .sort((a, b) => b.sessions - a.sessions);
}

function sum(values: (number | null)[]): number {
  return values.reduce((total: number, v) => total + (v ?? 0), 0);
}

// kcal por gramo de cada macro (factores de Atwater). La fibra no entra: es un
// carbohidrato, así que sumarla aparte duplicaría energía y el reparto pasaría
// del 100%.
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

// Una comida cuenta para el reparto solo si tiene los tres macros. Con uno
// suelto (p. ej. solo proteína) el porcentaje saldría inflado hacia ese macro,
// así que es preferible dejarla fuera que ensuciar el reparto.
export function hasMacros(entry: FoodEntry): boolean {
  return entry.protein != null && entry.carbs != null && entry.fat != null;
}

// Agrupa el registro de comidas (🍎 Alimentación) por día calendario, sumando
// las calorías de cada comida. La fecha se recorta a YYYY-MM-DD para evitar el
// corrimiento de zona horaria al agrupar.
export function summarizeFoodByDay(entries: FoodEntry[]): FoodDay[] {
  const groups = new Map<string, FoodEntry[]>();

  for (const entry of entries) {
    if (!entry.date) continue;
    const day = entry.date.slice(0, 10);
    const list = groups.get(day) ?? [];
    list.push(entry);
    groups.set(day, list);
  }

  return Array.from(groups.entries())
    .map(([date, list]) => {
      const withMacros = list.filter(hasMacros);
      return {
        date,
        totalCalories: sum(list.map((e) => e.calories)),
        count: list.length,
        protein: sum(withMacros.map((e) => e.protein)),
        carbs: sum(withMacros.map((e) => e.carbs)),
        fat: sum(withMacros.map((e) => e.fat)),
        // La fibra sí se suma de todas las comidas que la traigan: no participa
        // del reparto, solo se muestra como total aparte.
        fiber: sum(list.map((e) => e.fiber)),
        macroCount: withMacros.length,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Reparto de energía entre proteína, carbohidratos y grasas. Devuelve null si
// ninguna comida del periodo tiene los tres macros, para que la UI muestre el
// estado vacío en vez de un reparto de ceros.
export function summarizeMacros(entries: FoodEntry[]): MacroSplit | null {
  const withMacros = entries.filter(hasMacros);
  if (withMacros.length === 0) return null;

  const proteinGrams = sum(withMacros.map((e) => e.protein));
  const carbsGrams = sum(withMacros.map((e) => e.carbs));
  const fatGrams = sum(withMacros.map((e) => e.fat));

  const proteinKcal = proteinGrams * KCAL_PER_GRAM.protein;
  const carbsKcal = carbsGrams * KCAL_PER_GRAM.carbs;
  const fatKcal = fatGrams * KCAL_PER_GRAM.fat;
  const macroKcal = proteinKcal + carbsKcal + fatKcal;

  // Todo en cero (comidas registradas con 0 g en los tres) haría 0/0 = NaN.
  const pct = (part: number) => (macroKcal > 0 ? (part / macroKcal) * 100 : 0);

  const days = new Set(withMacros.map((e) => e.date.slice(0, 10)));

  return {
    proteinGrams,
    carbsGrams,
    fatGrams,
    fiberGrams: sum(entries.map((e) => e.fiber)),
    proteinPct: pct(proteinKcal),
    carbsPct: pct(carbsKcal),
    fatPct: pct(fatKcal),
    macroKcal,
    meals: withMacros.length,
    days: days.size,
  };
}

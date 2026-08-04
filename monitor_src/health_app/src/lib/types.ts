export type MonthlySummary = {
  month: string;
  date: string;
  steps: number | null;
  energy: number | null;
  exerciseMinutes: number | null;
  sleepHours: number | null;
  floors: number | null;
  restingHeartRate: number | null;
  hrv: number | null;
  vo2max: number | null;
};

export type WorkoutType =
  | "Caminata"
  | "Correr"
  | "Core"
  | "Fútbol"
  | "Saltar cuerda"
  | "Fitness Gaming"
  | "Fuerza";

export type Workout = {
  activity: string;
  type: WorkoutType | null;
  date: string;
  durationMinutes: number | null;
  distanceKm: number | null;
  energyKcal: number | null;
  avgHeartRate: number | null;
};

export type WorkoutTypeSummary = {
  type: string;
  sessions: number;
  totalDurationMinutes: number;
  totalDistanceKm: number;
  totalEnergyKcal: number;
  avgHeartRate: number | null;
};

export type TherapySession = {
  name: string;
  date: string | null;
  url: string;
};

export type FoodEntry = {
  name: string;
  date: string;
  calories: number | null;
  // Macros en gramos. Son opcionales en Notion: la mayoría del histórico solo
  // tiene calorías, así que casi siempre llegan en null.
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
};

export type FoodDay = {
  date: string;
  totalCalories: number;
  count: number;
  // Los macros solo suman las comidas con los tres registrados (ver hasMacros),
  // así que macroCount suele ser menor que count y sus totales no se pueden
  // comparar con totalCalories.
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  macroCount: number;
};

// Reparto de energía entre macros. Los porcentajes se calculan sobre las kcal
// derivadas de los gramos (4/4/9), no sobre la columna "Calorías": así el
// reparto cuadra siempre al 100% aunque lo registrado no coincida del todo.
export type MacroSplit = {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  macroKcal: number;
  meals: number;
  days: number;
};

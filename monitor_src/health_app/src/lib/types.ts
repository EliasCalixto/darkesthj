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

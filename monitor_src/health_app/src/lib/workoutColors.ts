export const WORKOUT_TYPE_COLORS: Record<string, string> = {
  Caminata: "#8dbad6",
  Correr: "#f8ccad",
  Core: "#8ea9db",
  Fútbol: "#b9f5c4",
  "Saltar cuerda": "#fd9a9a",
  "Fitness Gaming": "#fef2cb",
  Fuerza: "#d6b8f5",
  Otro: "#abb9d4",
};

export function getWorkoutTypeColor(type: string | null): string {
  return WORKOUT_TYPE_COLORS[type ?? "Otro"] ?? WORKOUT_TYPE_COLORS.Otro;
}

import { formatDate, formatDuration, formatNumber } from "@/lib/format";
import { getWorkoutTypeColor } from "@/lib/workoutColors";
import type { Workout } from "@/lib/types";

export function WorkoutsTable({ workouts }: { workouts: Workout[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-black/10 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
            <th className="py-2 pr-4 font-medium">Fecha</th>
            <th className="py-2 pr-4 font-medium">Actividad</th>
            <th className="py-2 pr-4 font-medium">Tipo</th>
            <th className="py-2 pr-4 font-medium">Duración</th>
            <th className="py-2 pr-4 font-medium">Distancia</th>
            <th className="py-2 pr-4 font-medium">Energía</th>
            <th className="py-2 pr-4 font-medium">FC media</th>
          </tr>
        </thead>
        <tbody>
          {workouts.map((workout, i) => (
            <tr
              key={`${workout.date}-${workout.activity}-${i}`}
              className="border-b border-black/5 last:border-0 transition-colors hover:bg-black/[0.03]"
            >
              <td className="py-2 pr-4 whitespace-nowrap">{formatDate(workout.date)}</td>
              <td className="py-2 pr-4">{workout.activity}</td>
              <td className="py-2 pr-4">
                {workout.type ? (
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-zinc-700"
                    style={{ backgroundColor: getWorkoutTypeColor(workout.type) }}
                  >
                    {workout.type}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2 pr-4 whitespace-nowrap">{formatDuration(workout.durationMinutes)}</td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {workout.distanceKm != null ? `${formatNumber(workout.distanceKm, 1)} km` : "—"}
              </td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {workout.energyKcal != null ? `${formatNumber(workout.energyKcal, 0)} kcal` : "—"}
              </td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {workout.avgHeartRate != null ? `${formatNumber(workout.avgHeartRate, 0)} bpm` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

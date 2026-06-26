import { formatNumber } from "@/lib/format";
import { getWorkoutTypeColor } from "@/lib/workoutColors";
import type { WorkoutTypeSummary } from "@/lib/types";

export function WorkoutTypeSummaryTable({ data }: { data: WorkoutTypeSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-black/10 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
            <th className="py-2 pr-4 font-medium">Tipo</th>
            <th className="py-2 pr-4 font-medium">Sesiones</th>
            <th className="py-2 pr-4 font-medium">Tiempo total</th>
            <th className="py-2 pr-4 font-medium">Distancia</th>
            <th className="py-2 pr-4 font-medium">Energía</th>
            <th className="py-2 pr-4 font-medium">FC media</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.type}
              className="border-b border-black/5 last:border-0 transition-colors hover:bg-black/[0.03]"
            >
              <td className="py-2 pr-4 font-medium">
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-zinc-700"
                  style={{ backgroundColor: getWorkoutTypeColor(row.type) }}
                >
                  {row.type}
                </span>
              </td>
              <td className="py-2 pr-4">{row.sessions}</td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {Math.floor(row.totalDurationMinutes / 60)}h{" "}
                {Math.round(row.totalDurationMinutes % 60)}m
              </td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {row.totalDistanceKm > 0 ? `${formatNumber(row.totalDistanceKm, 1)} km` : "—"}
              </td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {formatNumber(row.totalEnergyKcal, 0)} kcal
              </td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {row.avgHeartRate != null ? `${formatNumber(row.avgHeartRate, 0)} bpm` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

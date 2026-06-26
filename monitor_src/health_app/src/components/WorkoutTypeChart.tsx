"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getWorkoutTypeColor } from "@/lib/workoutColors";
import type { WorkoutTypeSummary } from "@/lib/types";

export function WorkoutTypeChart({ data }: { data: WorkoutTypeSummary[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-black/10 dark:stroke-white/10" />
        <XAxis dataKey="type" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={32} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          labelStyle={{ fontWeight: 600 }}
          formatter={(value) => [`${value} sesiones`, ""]}
        />
        <Bar dataKey="sessions" name="Sesiones" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.type} fill={getWorkoutTypeColor(entry.type)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

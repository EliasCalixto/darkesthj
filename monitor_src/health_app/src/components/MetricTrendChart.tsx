"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlySummary } from "@/lib/types";

type Series = {
  dataKey: keyof MonthlySummary;
  label: string;
  color: string;
  yAxisId?: "left" | "right";
};

export function MetricTrendChart({
  data,
  series,
  height = 260,
}: {
  data: MonthlySummary[];
  series: Series[];
  height?: number;
}) {
  const hasRightAxis = series.some((s) => s.yAxisId === "right");

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 16, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-black/10 dark:stroke-white/10" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11 }}
          interval="preserveStartEnd"
          angle={-35}
          textAnchor="end"
          height={50}
        />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={48} />
        {hasRightAxis && (
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={48} />
        )}
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          labelStyle={{ fontWeight: 600 }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s) => (
          <Line
            key={s.dataKey}
            yAxisId={s.yAxisId ?? "left"}
            type="monotone"
            dataKey={s.dataKey}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

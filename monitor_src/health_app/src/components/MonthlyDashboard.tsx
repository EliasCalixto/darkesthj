"use client";

import { useMemo } from "react";
import { buildKpiSummaries } from "@/lib/stats";
import type { MonthlySummary } from "@/lib/types";
import { KpiCard } from "./KpiCard";
import { MetricTrendChart } from "./MetricTrendChart";
import { SectionCard } from "./SectionCard";

// Presentacional: el periodo lo controla el combobox global del dashboard
// (Dashboard.tsx). Aquí solo recibimos los meses ya filtrados y los de
// comparación para pintar las KPIs y las gráficas.
export function MonthlyDashboard({
  months,
  comparisonMonths,
  comparisonNote,
  comparisonLabel,
  invert = false,
}: {
  months: MonthlySummary[];
  comparisonMonths: MonthlySummary[];
  comparisonNote: string;
  comparisonLabel: string;
  invert?: boolean;
}) {
  const kpis = useMemo(
    () => buildKpiSummaries(months, comparisonMonths),
    [months, comparisonMonths],
  );

  if (months.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No hay métricas mensuales en el periodo seleccionado.
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-zinc-400">
        <span>{comparisonNote}</span>
        <span>
          <span className="text-emerald-500">▲</span> mejor ·{" "}
          <span className="text-rose-500">▼</span> peor
        </span>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.key}
            kpi={kpi}
            comparisonLabel={comparisonLabel}
            invert={invert}
          />
        ))}
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <SectionCard title="Pasos por día" description="Promedio diario por mes">
          <MetricTrendChart
            data={months}
            series={[{ dataKey: "steps", label: "Pasos/día", color: "#3b82f6" }]}
          />
        </SectionCard>

        <SectionCard title="Sueño" description="Horas promedio por noche">
          <MetricTrendChart
            data={months}
            series={[{ dataKey: "sleepHours", label: "Sueño (h)", color: "#8b5cf6" }]}
          />
        </SectionCard>

        <SectionCard title="Corazón" description="FC en reposo y HRV (SDNN)">
          <MetricTrendChart
            data={months}
            series={[
              { dataKey: "restingHeartRate", label: "FC reposo (bpm)", color: "#ef4444" },
              { dataKey: "hrv", label: "HRV (ms)", color: "#10b981" },
            ]}
          />
        </SectionCard>

        <SectionCard title="VO₂máx" description="Capacidad cardiorrespiratoria">
          <MetricTrendChart
            data={months}
            series={[{ dataKey: "vo2max", label: "VO₂máx", color: "#f59e0b" }]}
          />
        </SectionCard>

        <SectionCard title="Energía y ejercicio" description="Promedios diarios por mes">
          <MetricTrendChart
            data={months}
            series={[
              { dataKey: "energy", label: "Energía activa (Cal)", color: "#f97316", yAxisId: "right" },
              { dataKey: "exerciseMinutes", label: "Ejercicio (min)", color: "#06b6d4" },
            ]}
          />
        </SectionCard>

        <SectionCard title="Pisos subidos" description="Promedio diario por mes">
          <MetricTrendChart
            data={months}
            series={[{ dataKey: "floors", label: "Pisos/día", color: "#84cc16" }]}
          />
        </SectionCard>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { buildKpiSummaries } from "@/lib/stats";
import type { MonthlySummary } from "@/lib/types";
import { KpiCard } from "./KpiCard";
import { MetricTrendChart } from "./MetricTrendChart";
import { SectionCard } from "./SectionCard";

type Period = "all" | "thisMonth" | "lastMonth" | "thisYear" | "lastYear" | `year:${number}`;

// Parse the calendar year/month straight from the ISO date string ("2026-06-01")
// to avoid the timezone shift that `new Date(...)` introduces: UTC midnight read in
// a negative-offset locale rolls a "01" date back to the previous month.
function parseYearMonth(dateStr: string): { year: number; month: number } {
  const [year, month] = dateStr.split("-").map(Number);
  return { year, month: (month || 1) - 1 };
}

function filterMonths(months: MonthlySummary[], period: Period): MonthlySummary[] {
  if (period === "all") return months;

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();

  return months.filter((m) => {
    const { year, month } = parseYearMonth(m.date);

    switch (period) {
      case "thisMonth":
        return year === thisYear && month === thisMonth;
      case "lastMonth": {
        const lastMonth = new Date(thisYear, thisMonth - 1, 1);
        return year === lastMonth.getFullYear() && month === lastMonth.getMonth();
      }
      case "thisYear":
        return year === thisYear;
      case "lastYear":
        return year === thisYear - 1;
      default:
        return year === Number(period.slice("year:".length));
    }
  });
}

// The comparison shown under the big KPI number is the immediately preceding
// period of the same granularity (previous month for month periods, previous
// year for year periods). "all" is special-cased to compare against the most
// recent month, since there's no broader period to compare it against.
function getComparison(
  months: MonthlySummary[],
  period: Period,
): { months: MonthlySummary[]; label: string; note: string } {
  if (months.length === 0) return { months: [], label: "", note: "" };

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();

  const byYearMonth = (year: number, month: number) =>
    months.filter((m) => {
      const ym = parseYearMonth(m.date);
      return ym.year === year && ym.month === month;
    });

  const byYear = (year: number) =>
    months.filter((m) => parseYearMonth(m.date).year === year);

  switch (period) {
    case "all": {
      const last = months[months.length - 1];
      return {
        months: [last],
        label: last.month,
        note: `Promedio histórico · la flecha compara ${last.month} contra el promedio`,
      };
    }
    case "thisMonth": {
      const d = new Date(thisYear, thisMonth - 1, 1);
      const comp = byYearMonth(d.getFullYear(), d.getMonth());
      const label = comp[0]?.month ?? "Mes anterior";
      return { months: comp, label, note: `Comparado con el mes anterior (${label})` };
    }
    case "lastMonth": {
      const d = new Date(thisYear, thisMonth - 2, 1);
      const comp = byYearMonth(d.getFullYear(), d.getMonth());
      const label = comp[0]?.month ?? "Mes previo";
      return { months: comp, label, note: `Comparado con ${label}` };
    }
    case "thisYear": {
      const year = thisYear - 1;
      return { months: byYear(year), label: String(year), note: `Comparado con ${year}` };
    }
    case "lastYear": {
      const year = thisYear - 2;
      return { months: byYear(year), label: String(year), note: `Comparado con ${year}` };
    }
    default: {
      const year = Number(period.slice("year:".length)) - 1;
      return { months: byYear(year), label: String(year), note: `Comparado con ${year}` };
    }
  }
}

export function MonthlyDashboard({ months }: { months: MonthlySummary[] }) {
  const [period, setPeriod] = useState<Period>("thisYear");

  const olderYears = useMemo(() => {
    const thisYear = new Date().getFullYear();
    const years = new Set(months.map((m) => parseYearMonth(m.date).year));
    return Array.from(years)
      .filter((year) => year < thisYear - 1)
      .sort((a, b) => b - a);
  }, [months]);

  const filteredMonths = useMemo(() => filterMonths(months, period), [months, period]);
  const comparison = useMemo(() => getComparison(months, period), [months, period]);
  const kpis = useMemo(
    () => buildKpiSummaries(filteredMonths, comparison.months),
    [filteredMonths, comparison.months],
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex justify-end">
        <label className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          Periodo
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="rounded-md border border-black/10 bg-transparent px-2 py-1 text-sm dark:border-white/10"
          >
            <option value="all">Todo</option>
            <option value="thisMonth">Este mes</option>
            <option value="lastMonth">Mes anterior</option>
            <option value="thisYear">Este año</option>
            <option value="lastYear">Año anterior</option>
            {olderYears.map((year) => (
              <option key={year} value={`year:${year}`}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-zinc-400">
        <span>{comparison.note}</span>
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
            comparisonLabel={comparison.label}
            invert={period === "all"}
          />
        ))}
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <SectionCard title="Pasos por día" description="Promedio diario por mes">
          <MetricTrendChart
            data={filteredMonths}
            series={[{ dataKey: "steps", label: "Pasos/día", color: "#3b82f6" }]}
          />
        </SectionCard>

        <SectionCard title="Sueño" description="Horas promedio por noche">
          <MetricTrendChart
            data={filteredMonths}
            series={[{ dataKey: "sleepHours", label: "Sueño (h)", color: "#8b5cf6" }]}
          />
        </SectionCard>

        <SectionCard title="Corazón" description="FC en reposo y HRV (SDNN)">
          <MetricTrendChart
            data={filteredMonths}
            series={[
              { dataKey: "restingHeartRate", label: "FC reposo (bpm)", color: "#ef4444" },
              { dataKey: "hrv", label: "HRV (ms)", color: "#10b981" },
            ]}
          />
        </SectionCard>

        <SectionCard title="VO₂máx" description="Capacidad cardiorrespiratoria">
          <MetricTrendChart
            data={filteredMonths}
            series={[{ dataKey: "vo2max", label: "VO₂máx", color: "#f59e0b" }]}
          />
        </SectionCard>

        <SectionCard title="Energía y ejercicio" description="Promedios diarios por mes">
          <MetricTrendChart
            data={filteredMonths}
            series={[
              { dataKey: "energy", label: "Energía activa (Cal)", color: "#f97316", yAxisId: "right" },
              { dataKey: "exerciseMinutes", label: "Ejercicio (min)", color: "#06b6d4" },
            ]}
          />
        </SectionCard>

        <SectionCard title="Pisos subidos" description="Promedio diario por mes">
          <MetricTrendChart
            data={filteredMonths}
            series={[{ dataKey: "floors", label: "Pisos/día", color: "#84cc16" }]}
          />
        </SectionCard>
      </div>
    </div>
  );
}

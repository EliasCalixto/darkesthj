"use client";

import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/format";
import {
  computePeriod,
  inRange,
  monthInRange,
  PERIOD_OPTIONS,
  precedingPeriod,
  type Period,
} from "@/lib/period";
import { summarizeFoodByDay, summarizeWorkoutsByType } from "@/lib/stats";
import type { FoodEntry, MonthlySummary, Workout } from "@/lib/types";
import { FoodSection } from "./FoodSection";
import { HealthSummary, type SummaryItem } from "./HealthSummary";
import { MonthlyDashboard } from "./MonthlyDashboard";
import { SectionCard } from "./SectionCard";
import { WorkoutsTable } from "./WorkoutsTable";
import { WorkoutTypeChart } from "./WorkoutTypeChart";
import { WorkoutTypeSummaryTable } from "./WorkoutTypeSummaryTable";

const avg = (values: number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

// Toda la página gira en torno a este periodo (mismas opciones que Finance).
export function Dashboard({
  months,
  workouts,
  food,
}: {
  months: MonthlySummary[];
  workouts: Workout[];
  food: FoodEntry[];
}) {
  const [period, setPeriod] = useState<Period>("this-month");

  const range = useMemo(() => computePeriod(period), [period]);
  const prevRange = useMemo(() => precedingPeriod(range), [range]);

  const fMonths = useMemo(
    () => (period === "all" ? months : months.filter((m) => monthInRange(m.date, range))),
    [months, range, period],
  );
  const compMonths = useMemo(
    () => (period === "all" ? months : months.filter((m) => monthInRange(m.date, prevRange))),
    [months, prevRange, period],
  );
  const fWorkouts = useMemo(
    () => (period === "all" ? workouts : workouts.filter((w) => inRange(w.date, range))),
    [workouts, range, period],
  );
  const fFood = useMemo(
    () => (period === "all" ? food : food.filter((e) => inRange(e.date, range))),
    [food, range, period],
  );

  const foodDays = useMemo(() => summarizeFoodByDay(fFood), [fFood]);
  const workoutTypes = useMemo(() => summarizeWorkoutsByType(fWorkouts), [fWorkouts]);

  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "";

  const avgSleep = avg(fMonths.map((m) => m.sleepHours).filter((v): v is number => v != null));
  const avgKcal = avg(foodDays.map((d) => d.totalCalories));
  const totalWorkoutMin = fWorkouts.reduce((s, w) => s + (w.durationMinutes ?? 0), 0);
  const topType = workoutTypes[0]?.type;

  const summaryItems: SummaryItem[] = [
    {
      icon: "🍎",
      title: "Alimentación",
      value: avgKcal != null ? formatNumber(avgKcal, 0) : "—",
      unit: "kcal/día",
      sub: `${foodDays.length} día(s) registrados`,
      status:
        avgKcal == null ? "neutral" : avgKcal > 2500 ? "bad" : avgKcal < 1800 ? "warn" : "good",
    },
    {
      icon: "😴",
      title: "Sueño",
      value: avgSleep != null ? formatNumber(avgSleep, 1) : "—",
      unit: "h/noche",
      sub: "Meta 7–8 h",
      status:
        avgSleep == null ? "neutral" : avgSleep >= 7 ? "good" : avgSleep >= 6 ? "warn" : "bad",
    },
    {
      icon: "🏋️",
      title: "Entrenamiento",
      value: `${fWorkouts.length}`,
      unit: "sesiones",
      sub: `${Math.round(totalWorkoutMin / 60)} h en total${topType ? ` · ${topType}` : ""}`,
      status: fWorkouts.length > 0 ? "good" : "neutral",
    },
  ];

  const comparisonNote =
    period === "all" ? "Promedio histórico" : "Comparado con el periodo anterior";
  const comparisonLabel = period === "all" ? "Promedio" : "Periodo previo";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Periodo:{" "}
          <span className="font-medium text-zinc-700">{periodLabel}</span>
        </p>
        <label className="flex items-center gap-2 text-sm text-zinc-500">
          <span className="hidden sm:inline">Periodo</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-zinc-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--green)]/40"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Alimentación primero: es el dato en tiempo real (se registra a mano
          en Notion), a diferencia de sueño/entrenamiento que dependen de la
          carga periódica de Apple Health. */}
      <FoodSection days={foodDays} entries={fFood} />

      <HealthSummary items={summaryItems} />

      <SectionCard
        title="🏋️ Entrenamiento"
        description={`${fWorkouts.length} sesiones registradas`}
      >
        {fWorkouts.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No hay entrenamientos en el periodo seleccionado.
          </p>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <WorkoutTypeChart data={workoutTypes} />
              <WorkoutTypeSummaryTable data={workoutTypes} />
            </div>
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-zinc-500">Últimas sesiones</h3>
              <WorkoutsTable workouts={fWorkouts.slice(0, 15)} />
            </div>
          </>
        )}
      </SectionCard>

      <section>
        <h2 className="mb-1 text-base font-semibold">😴 Sueño y métricas detalladas</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Pasos, sueño, corazón y más — promedios diarios por mes.
        </p>
        <MonthlyDashboard
          months={fMonths}
          comparisonMonths={compMonths}
          comparisonNote={comparisonNote}
          comparisonLabel={comparisonLabel}
          invert={period === "all"}
        />
      </section>
    </main>
  );
}

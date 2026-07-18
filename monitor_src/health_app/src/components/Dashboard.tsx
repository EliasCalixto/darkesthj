"use client";

import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/format";
import {
  computePeriod,
  inRange,
  PERIOD_OPTIONS,
  type Period,
} from "@/lib/period";
import { summarizeFoodByDay } from "@/lib/stats";
import type { FoodEntry } from "@/lib/types";
import { FoodSection, KCAL_HIGH, KCAL_TARGET } from "./FoodSection";
import { HealthSummary, type SummaryItem } from "./HealthSummary";

const avg = (values: number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

function todayIso(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function Dashboard({ food }: { food: FoodEntry[] }) {
  const [period, setPeriod] = useState<Period>("this-month");

  const range = useMemo(() => computePeriod(period), [period]);
  const fFood = useMemo(
    () => (period === "all" ? food : food.filter((e) => inRange(e.date, range))),
    [food, range, period],
  );

  const foodDays = useMemo(() => summarizeFoodByDay(fFood), [fFood]);

  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "";

  const avgKcal = avg(foodDays.map((d) => d.totalCalories));
  const mealCalories = fFood.map((entry) => entry.calories).filter((v): v is number => v != null);
  const avgMealKcal = avg(mealCalories);
  const today = todayIso();
  const todayCalories = foodDays.find((d) => d.date === today)?.totalCalories ?? null;
  const daysInTarget = foodDays.filter((d) => d.totalCalories <= KCAL_TARGET).length;
  const targetRate =
    foodDays.length > 0 ? Math.round((daysInTarget / foodDays.length) * 100) : null;

  const summaryItems: SummaryItem[] = [
    {
      icon: "🍎",
      title: "Promedio diario",
      value: avgKcal != null ? formatNumber(avgKcal, 0) : "—",
      unit: "kcal",
      sub: `${foodDays.length} día(s) registrados`,
      status:
        avgKcal == null
          ? "neutral"
          : avgKcal > KCAL_HIGH
            ? "bad"
            : avgKcal > KCAL_TARGET
              ? "warn"
              : "good",
    },
    {
      icon: "🥗",
      title: "Promedio por comida",
      value: avgMealKcal != null ? formatNumber(avgMealKcal, 0) : "—",
      unit: "kcal",
      sub: `${fFood.length} comida(s) registradas`,
      status:
        avgMealKcal == null
          ? "neutral"
          : avgMealKcal <= 700
            ? "good"
            : avgMealKcal <= 900
              ? "warn"
              : "bad",
    },
    {
      icon: "🎯",
      title: "Días en meta",
      value: targetRate != null ? `${targetRate}` : "—",
      unit: "%",
      sub: `${daysInTarget} de ${foodDays.length} día(s) hasta ${formatNumber(KCAL_TARGET, 0)} kcal`,
      status:
        targetRate == null
          ? "neutral"
          : targetRate >= 70
            ? "good"
            : targetRate >= 50
              ? "warn"
              : "bad",
    },
  ];

  const todayStatus =
    todayCalories == null
      ? "Sin registro de hoy"
      : todayCalories > KCAL_TARGET
        ? `${formatNumber(todayCalories - KCAL_TARGET, 0)} kcal por encima de la meta`
        : `${formatNumber(KCAL_TARGET - todayCalories, 0)} kcal disponibles hoy`;

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

      <div className="rounded-2xl border border-[var(--border)] bg-white px-5 py-4 text-sm text-zinc-600 shadow-sm">
        <span className="font-medium text-zinc-900">Hoy:</span> {todayStatus}
      </div>

      <HealthSummary items={summaryItems} />

      <FoodSection days={foodDays} entries={fFood} />
    </main>
  );
}

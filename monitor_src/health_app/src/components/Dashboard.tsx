"use client";

import { useEffect, useMemo, useState } from "react";
import { decryptEnvelope } from "@/lib/decrypt";
import { formatNumber } from "@/lib/format";
import type { FoodPayload, Gate } from "@/lib/gateTypes";
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

// Misma clave que Finance (mismo origen darkesthj.com), así un solo desbloqueo
// sirve para ambos paneles cuando comparten DATA_PASSPHRASE.
const PASSPHRASE_KEY = "monitor_passphrase";

const avg = (values: number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

function todayIso(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

// Envoltura del panel: si los datos vienen cifrados (DATA_PASSPHRASE), pide la
// passphrase y descifra en el cliente; si no, muestra el panel directamente.
export function Dashboard({ gate }: { gate: Gate<FoodPayload> }) {
  const [food, setFood] = useState<FoodEntry[] | null>(
    gate.encrypted ? null : gate.payload.food,
  );
  // Mientras probamos la passphrase guardada no mostramos el modal (evita un
  // parpadeo si el desbloqueo silencioso va a funcionar).
  const [checking, setChecking] = useState(gate.encrypted);

  useEffect(() => {
    if (!gate.encrypted) return;
    let active = true;
    void (async () => {
      const cached = localStorage.getItem(PASSPHRASE_KEY);
      if (cached) {
        try {
          const payload = await decryptEnvelope<FoodPayload>(
            gate.envelope,
            cached,
          );
          if (active) setFood(payload.food);
        } catch {
          localStorage.removeItem(PASSPHRASE_KEY);
        }
      }
      if (active) setChecking(false);
    })();
    return () => {
      active = false;
    };
  }, [gate]);

  const showModal = gate.encrypted && food === null && !checking;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {food ? (
        <FoodPanel food={food} />
      ) : (
        <LockedPlaceholder checking={checking} />
      )}

      {showModal && gate.encrypted && (
        <UnlockModal
          envelope={gate.envelope}
          onUnlock={(payload) => setFood(payload.food)}
        />
      )}
    </main>
  );
}

function FoodPanel({ food }: { food: FoodEntry[] }) {
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
    <>
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
    </>
  );
}

function LockedPlaceholder({ checking }: { checking: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border)] bg-white/60 px-4 py-16 text-center">
      <div className="text-3xl" aria-hidden="true">
        {checking ? "⏳" : "🔒"}
      </div>
      <p className="text-sm text-zinc-500">
        {checking ? "Comprobando acceso…" : "Contenido protegido con passphrase."}
      </p>
    </div>
  );
}

function UnlockModal({
  envelope,
  onUnlock,
}: {
  envelope: Extract<Gate<FoodPayload>, { encrypted: true }>["envelope"];
  onUnlock: (payload: FoodPayload) => void;
}) {
  const [value, setValue] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!value) return;
    setBusy(true);
    setError("");
    try {
      const payload = await decryptEnvelope<FoodPayload>(envelope, value);
      if (remember) {
        localStorage.setItem(PASSPHRASE_KEY, value);
      } else {
        localStorage.removeItem(PASSPHRASE_KEY);
      }
      onUnlock(payload);
    } catch {
      setError("Passphrase incorrecta");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-2xl">
        <div className="mb-3 text-3xl" aria-hidden="true">
          🔒
        </div>
        <h2 className="text-lg font-semibold">Dashboard protegido</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Los datos están cifrados. Ingresa tu passphrase para desbloquear.
        </p>
        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          className="mt-5 flex flex-col gap-3 text-left"
        >
          <input
            type="password"
            autoComplete="current-password"
            spellCheck={false}
            placeholder="Passphrase"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            required
            className="rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-black/5"
          />
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-zinc-500">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>Recordar en este dispositivo</span>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-progress disabled:opacity-60"
          >
            {busy ? "Descifrando…" : "Desbloquear"}
          </button>
          <p className="min-h-[16px] text-center text-xs text-rose-500" role="alert">
            {error}
          </p>
        </form>
      </div>
    </div>
  );
}

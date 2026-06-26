"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber } from "@/lib/format";
import type { FoodDay, FoodEntry } from "@/lib/types";
import { SectionCard } from "./SectionCard";

// Rango referencial 0–1800 kcal/día (banda verde). Por encima se usan tonos
// suaves de la paleta Apple/Finance en vez de rojos/naranjas saturados.
const KCAL_TARGET = 1800; // tope del rango referencial
const KCAL_HIGH = 2500; // a partir de aquí, "muy por encima"

const COLOR_IN = "#5cc27e"; // dentro del rango — verde suave
const COLOR_OVER = "#e6b15c"; // por encima — ámbar suave
const COLOR_HIGH = "#e0816f"; // muy por encima — coral suave

function dayColor(kcal: number): string {
  if (kcal > KCAL_HIGH) return COLOR_HIGH;
  if (kcal > KCAL_TARGET) return COLOR_OVER;
  return COLOR_IN;
}

function shortDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(date);
}

export function FoodSection({
  days,
  entries,
}: {
  days: FoodDay[];
  entries: FoodEntry[];
}) {
  if (days.length === 0) {
    return (
      <SectionCard title="🍎 Alimentación" description="Registro de calorías por día">
        <p className="text-sm text-zinc-500">Aún no hay comidas registradas.</p>
      </SectionCard>
    );
  }

  const totalKcal = days.reduce((sum, d) => sum + d.totalCalories, 0);
  const avgKcal = totalKcal / days.length;
  const highest = days.reduce((max, d) => (d.totalCalories > max.totalCalories ? d : max), days[0]);
  const chartData = days.map((d) => ({ ...d, label: shortDay(d.date) }));

  return (
    <SectionCard
      title="🍎 Alimentación"
      description={`${entries.length} registros en ${days.length} día(s)`}
    >
      <div className="mb-5 grid grid-cols-3 gap-3">
        <FoodKpi label="Promedio diario" value={`${formatNumber(avgKcal, 0)}`} unit="kcal" />
        <FoodKpi
          label="Día más cargado"
          value={`${formatNumber(highest.totalCalories, 0)}`}
          unit={`kcal · ${shortDay(highest.date)}`}
        />
        <FoodKpi label="Días registrados" value={`${days.length}`} unit="días" />
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-black/10" />
          <ReferenceArea
            y1={0}
            y2={KCAL_TARGET}
            fill={COLOR_IN}
            fillOpacity={0.1}
            ifOverflow="extendDomain"
          />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={44} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            labelStyle={{ fontWeight: 600 }}
            formatter={(value) => [`${formatNumber(Number(value), 0)} kcal`, "Total"]}
          />
          <Bar dataKey="totalCalories" name="kcal" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.date} fill={dayColor(entry.totalCalories)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-zinc-400">
        Banda verde = rango referencial 0–{formatNumber(KCAL_TARGET, 0)} kcal/día.
      </p>

      <div className="mt-5 overflow-x-auto">
        <h3 className="mb-2 text-sm font-semibold text-zinc-500">Últimas comidas</h3>
        <table className="w-full min-w-[360px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-zinc-500">
              <th className="py-2 pr-4 font-medium">Fecha</th>
              <th className="py-2 pr-4 font-medium">Comida</th>
              <th className="py-2 pr-4 font-medium text-right">Calorías</th>
            </tr>
          </thead>
          <tbody>
            {entries.slice(0, 15).map((entry, i) => (
              <tr
                key={`${entry.date}-${entry.name}-${i}`}
                className="border-b border-black/5 last:border-0 transition-colors hover:bg-black/[0.03]"
              >
                <td className="py-2 pr-4 whitespace-nowrap">{shortDay(entry.date.slice(0, 10))}</td>
                <td className="py-2 pr-4">{entry.name || "—"}</td>
                <td className="py-2 pr-4 whitespace-nowrap text-right tabular-nums">
                  {entry.calories != null ? `${formatNumber(entry.calories, 0)} kcal` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function FoodKpi({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {value}
        <span className="ml-1 text-sm font-normal text-zinc-400">{unit}</span>
      </p>
    </div>
  );
}

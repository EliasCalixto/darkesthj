"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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

const COLOR_IN = "#7ed0a3"; // dentro del rango — verde ligero (paleta Finance)
const COLOR_OVER = "#f0d27a"; // por encima — amarillo sutil
const COLOR_HIGH = "#e6c050"; // muy por encima — amarillo/dorado sutil

// Día actual (en tiempo real): verde algo más intenso si aún voy dentro de la
// meta, rojo de la paleta de Finance si ya me pasé.
const COLOR_TODAY_IN = "#4cc27e"; // verde ligeramente más intenso que COLOR_IN
const COLOR_TODAY_OVER = "#ff453a"; // rojo de la paleta de Finance

function dayColor(kcal: number, isToday: boolean): string {
  if (isToday) return kcal > KCAL_TARGET ? COLOR_TODAY_OVER : COLOR_TODAY_IN;
  if (kcal > KCAL_HIGH) return COLOR_HIGH;
  if (kcal > KCAL_TARGET) return COLOR_OVER;
  return COLOR_IN;
}

function todayIso(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
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

  const today = todayIso();
  const totalKcal = days.reduce((sum, d) => sum + d.totalCalories, 0);
  const avgKcal = totalKcal / days.length;
  const highest = days.reduce((max, d) => (d.totalCalories > max.totalCalories ? d : max), days[0]);
  const chartData = days.map((d) => ({
    ...d,
    label: shortDay(d.date),
    isToday: d.date === today,
  }));

  // Etiqueta "Hoy" sobre la barra del día actual: cuánto falta para la meta o
  // cuánto me pasé. Recharts la invoca por cada barra; devolvemos null salvo hoy.
  const renderTodayLabel = (props: {
    x?: string | number;
    y?: string | number;
    width?: string | number;
    index?: number;
  }) => {
    const x = Number(props.x ?? 0);
    const y = Number(props.y ?? 0);
    const width = Number(props.width ?? 0);
    const index = props.index ?? 0;
    const d = chartData[index];
    if (!d || !d.isToday) return null;
    const remaining = KCAL_TARGET - d.totalCalories;
    const over = remaining < 0;
    const text = over
      ? `Hoy · +${formatNumber(-remaining, 0)}`
      : `Hoy · faltan ${formatNumber(remaining, 0)}`;
    return (
      <text
        x={x + width / 2}
        y={y - 7}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill={over ? COLOR_TODAY_OVER : "#2f9e63"}
      >
        {text}
      </text>
    );
  };

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
        <BarChart data={chartData} margin={{ top: 26, right: 12, bottom: 0, left: -8 }}>
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
            <LabelList dataKey="totalCalories" content={renderTodayLabel} />
            {chartData.map((entry) => (
              <Cell key={entry.date} fill={dayColor(entry.totalCalories, entry.isToday)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-zinc-400">
        Banda verde = rango referencial 0–{formatNumber(KCAL_TARGET, 0)} kcal/día. La barra
        de <strong className="font-semibold text-zinc-500">hoy</strong> va en verde si sigues
        dentro de la meta y en rojo si la superaste.
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

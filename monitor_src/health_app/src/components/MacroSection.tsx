"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber } from "@/lib/format";
import { KCAL_PER_GRAM } from "@/lib/stats";
import type { FoodDay, MacroSplit } from "@/lib/types";
import { KCAL_TARGET } from "./FoodSection";
import { SectionCard } from "./SectionCard";

// Paleta categórica de los tres macros. Validada con el validador de dataviz
// (banda de luminosidad, piso de croma, separación CVD y contraste sobre
// blanco): peor par adyacente ΔE 23.4 en protanopia / 26.4 en visión normal.
//
// El ámbar queda por debajo de 3:1 de contraste sobre la tarjeta blanca, lo que
// obliga a que los valores estén siempre escritos — de ahí las etiquetas
// directas bajo la barra y la tabla por día; no quitar esa lectura alternativa.
//
// Se evitó a propósito un coral/rojo para las grasas: en esta misma página el
// rojo ya significa "te pasaste del límite" en el gráfico de calorías, y
// reusarlo como identidad de un macro se leería como alerta.
const MACRO_COLORS = {
  protein: "#5b8fc9",
  carbs: "#dba032",
  fat: "#7d6ab8",
} as const;

// Metas diarias por macro. Notion no las guarda, así que se derivan de la meta
// de calorías (KCAL_TARGET) con un reparto equilibrado 25/45/30 — el rango
// habitual para una dieta general. Al colgar de KCAL_TARGET se recalculan solas
// si cambia la meta de kcal; si quieres otro reparto, se toca solo esto.
const MACRO_TARGET_PCT = { protein: 0.25, carbs: 0.45, fat: 0.3 } as const;

const FIBER_TARGET = 25; // g/día, referencia habitual para adultos

function macroTargetGrams(key: MacroKey): number {
  return (KCAL_TARGET * MACRO_TARGET_PCT[key]) / KCAL_PER_GRAM[key];
}

type MacroKey = keyof typeof MACRO_COLORS;

const MACROS: { key: MacroKey; label: string }[] = [
  { key: "protein", label: "Proteína" },
  { key: "carbs", label: "Carbohidratos" },
  { key: "fat", label: "Grasas" },
];

function shortDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(date);
}

export function MacroSection({
  split,
  days,
  totalMeals,
}: {
  split: MacroSplit | null;
  days: FoodDay[];
  totalMeals: number;
}) {
  if (!split) {
    return (
      <SectionCard
        title="🥗 Macronutrientes"
        description="Reparto de proteína, carbohidratos y grasas"
      >
        <p className="text-sm text-zinc-500">
          Ninguna comida del periodo tiene macros registrados. Rellena las columnas{" "}
          <strong className="font-medium text-zinc-700">Proteína (g)</strong>,{" "}
          <strong className="font-medium text-zinc-700">Carbohidratos (g)</strong> y{" "}
          <strong className="font-medium text-zinc-700">Grasas (g)</strong> en la base 🍎
          Alimentación de Notion y aparecerán aquí. Hacen falta los tres en una misma
          comida para que entre en el reparto.
        </p>
      </SectionCard>
    );
  }

  const grams: Record<MacroKey, number> = {
    protein: split.proteinGrams,
    carbs: split.carbsGrams,
    fat: split.fatGrams,
  };
  const pct: Record<MacroKey, number> = {
    protein: split.proteinPct,
    carbs: split.carbsPct,
    fat: split.fatPct,
  };

  // Solo los días que aportan al reparto; los que no tienen macros dejarían
  // huecos a cero que se leerían como "ese día no comí".
  const chartData = days
    .filter((d) => d.macroCount > 0)
    .map((d) => ({ ...d, label: shortDay(d.date) }));

  const coverage =
    totalMeals > 0 ? Math.round((split.meals / totalMeals) * 100) : 0;
  const perDay = (value: number) => (split.days > 0 ? value / split.days : 0);

  return (
    <SectionCard
      title="🥗 Macronutrientes"
      description={`${split.meals} de ${totalMeals} comida(s) con macros registrados · ${split.days} día(s)`}
    >
      {coverage < 100 && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Solo el <strong className="font-semibold">{coverage}%</strong> de las comidas del
          periodo tiene los tres macros anotados. El reparto describe esas{" "}
          {split.meals} comida(s), no todo lo que comiste.
        </p>
      )}

      <h3 className="mb-2 text-sm font-semibold text-zinc-500">Reparto de energía</h3>

      {/* Barra apilada horizontal: la composición es lo único que importa aquí,
          así que una sola barra al 100% se lee mejor que un donut. Los segmentos
          van separados 2px con el color de la tarjeta y solo los extremos llevan
          esquina redondeada. */}
      <div
        className="flex h-9 w-full gap-[2px] overflow-hidden rounded-md"
        role="img"
        aria-label={MACROS.map(
          (m) => `${m.label} ${Math.round(pct[m.key])}%`,
        ).join(", ")}
      >
        {MACROS.map(({ key, label }) => {
          if (pct[key] <= 0) return null;
          return (
            <div
              key={key}
              className="flex items-center justify-center first:rounded-l-md last:rounded-r-md"
              style={{ width: `${pct[key]}%`, background: MACRO_COLORS[key] }}
              title={`${label}: ${formatNumber(pct[key], 0)}%`}
            >
              {/* La cifra solo cabe si el segmento es ancho; si no, queda en la
                  leyenda de abajo, que siempre la muestra. */}
              {pct[key] >= 12 && (
                <span className="text-xs font-semibold text-white">
                  {formatNumber(pct[key], 0)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda con los valores escritos: es la lectura alternativa que exige
          el contraste del ámbar, y sirve para los dos gráficos de la tarjeta. */}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {MACROS.map(({ key, label }) => (
          <div key={key} className="flex items-baseline gap-2 text-sm">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 translate-y-[-1px] rounded-sm"
              style={{ background: MACRO_COLORS[key] }}
              aria-hidden="true"
            />
            <span className="text-zinc-600">{label}</span>
            <span className="font-semibold tabular-nums text-zinc-900">
              {formatNumber(pct[key], 0)}%
            </span>
            <span className="text-xs tabular-nums text-zinc-400">
              {formatNumber(grams[key], 0)} g · {formatNumber(perDay(grams[key]), 0)} g/día
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {MACROS.map(({ key, label }) => (
          <MacroKpi
            key={key}
            label={label}
            value={perDay(grams[key])}
            target={macroTargetGrams(key)}
            color={MACRO_COLORS[key]}
          />
        ))}
        <MacroKpi
          label="Fibra"
          value={perDay(split.fiberGrams)}
          target={FIBER_TARGET}
          // La fibra no es parte del reparto (es un carbohidrato y se
          // duplicaría), así que no lleva color de serie.
          color={null}
        />
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        Los porcentajes salen de convertir los gramos a energía ({KCAL_PER_GRAM.protein} kcal/g
        proteína y carbohidratos, {KCAL_PER_GRAM.fat} kcal/g grasas), que suman{" "}
        {formatNumber(split.macroKcal, 0)} kcal. La fibra se muestra aparte porque ya va
        contada dentro de los carbohidratos. Las metas por macro no vienen de Notion: se
        reparten los {formatNumber(KCAL_TARGET, 0)} kcal de la meta diaria en{" "}
        {Math.round(MACRO_TARGET_PCT.protein * 100)}% proteína,{" "}
        {Math.round(MACRO_TARGET_PCT.carbs * 100)}% carbohidratos y{" "}
        {Math.round(MACRO_TARGET_PCT.fat * 100)}% grasas.
      </p>

      {chartData.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-zinc-500">Gramos por día</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-black/10" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              {/* Sin sufijo "g" en los ticks: con width 40 se parten en dos
                  líneas. El encabezado ya dice que son gramos. */}
              <YAxis tick={{ fontSize: 11 }} width={40} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                labelStyle={{ fontWeight: 600 }}
                formatter={(value, name) => [`${formatNumber(Number(value), 0)} g`, name]}
              />
              {MACROS.map(({ key, label }, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={label}
                  stackId="macros"
                  fill={MACRO_COLORS[key]}
                  // Borde del color de la tarjeta: separa los segmentos apilados
                  // sin dibujar una línea de contorno visible.
                  stroke="#ffffff"
                  strokeWidth={2}
                  radius={index === MACROS.length - 1 ? [4, 4, 0, 0] : undefined}
                  // Con pocos días registrados recharts estira las barras a
                  // todo el ancho disponible y quedan enormes.
                  maxBarSize={72}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
}

// Promedio diario del nutriente contra su meta. La barra es un medidor simple
// (un solo valor frente a un tope), no una serie: por eso va del color del
// macro sobre una pista gris y no entra en la paleta categórica.
function MacroKpi({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string | null;
}) {
  const ratio = target > 0 ? value / target : 0;
  const diff = value - target;
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <p className="flex items-center gap-1.5 text-sm text-zinc-500">
        {color && (
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: color }}
            aria-hidden="true"
          />
        )}
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {formatNumber(value, 0)}
        <span className="ml-1 text-sm font-normal text-zinc-400">g/día</span>
      </p>

      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100"
        role="img"
        aria-label={`${formatNumber(value, 0)} de ${formatNumber(target, 0)} g/día`}
      >
        <div
          className="h-full rounded-full"
          // Se corta al 100%: pasado el tope la barra ya está llena y el exceso
          // lo dice la cifra de abajo.
          style={{
            width: `${Math.min(ratio, 1) * 100}%`,
            background: color ?? "#a1a1aa",
          }}
        />
      </div>

      <p className="mt-1.5 text-xs tabular-nums text-zinc-400">
        meta {formatNumber(target, 0)} g/día
        <span className="ml-1 text-zinc-500">
          ({diff >= 0 ? "+" : "−"}
          {formatNumber(Math.abs(diff), 0)})
        </span>
      </p>
    </div>
  );
}

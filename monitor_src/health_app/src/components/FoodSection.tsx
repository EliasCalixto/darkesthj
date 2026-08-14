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

// Tres bandas de calorías diarias: hasta la meta (verde), entre la meta y el
// límite alto (naranja) y por encima del límite (rojo).
export const KCAL_TARGET = 1650; // meta diaria
export const KCAL_HIGH = 1850; // a partir de aquí, "muy por encima"

// Verde → naranja → rojo es el patrón semáforo, el que peor se comporta en
// daltonismo: el naranja tiende a colapsar contra el rojo. Estos tres pasos se
// eligieron con el validador de dataviz para que el peor par adyacente quede en
// ΔE 8.2 con protanopia y 15.5 en visión normal, por encima de ambos pisos.
// Si se retoca alguno, hay que volver a validar el trío completo.
const COLOR_IN = "#7ed0a3"; // dentro de la meta — verde ligero (paleta Finance)
const COLOR_OVER = "#f0b460"; // pasada la meta — naranja suave
const COLOR_HIGH = "#e0776c"; // pasado el límite alto — rojo coral

// Día actual (en tiempo real): verde algo más intenso mientras siga dentro de
// la meta. Por encima no tiene color propio, usa las mismas bandas que el resto
// para que el umbral se lea igual en cualquier barra.
const COLOR_TODAY_IN = "#4cc27e"; // verde ligeramente más intenso que COLOR_IN

// Los rellenos son claros a propósito, pero como texto pequeño no contrastan
// sobre blanco; para las etiquetas usamos la versión oscura de cada tono
// (contraste 3.4:1 el verde, 5.4:1 el naranja, 5.3:1 el rojo).
const COLOR_IN_TEXT = "#2f9e63";
const COLOR_OVER_TEXT = "#9a5b12";
const COLOR_HIGH_TEXT = "#b5493c";

function dayColor(kcal: number, isToday: boolean): string {
  if (kcal > KCAL_HIGH) return COLOR_HIGH;
  if (kcal > KCAL_TARGET) return COLOR_OVER;
  return isToday ? COLOR_TODAY_IN : COLOR_IN;
}

function dayTextColor(kcal: number): string {
  if (kcal > KCAL_HIGH) return COLOR_HIGH_TEXT;
  if (kcal > KCAL_TARGET) return COLOR_OVER_TEXT;
  return COLOR_IN_TEXT;
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

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

function weekdayIndex(iso: string): number {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 0;
  return (date.getDay() + 6) % 7;
}

function weekdayStats(days: FoodDay[]) {
  const rows = WEEKDAYS.map((weekday) => ({
    weekday,
    totalCalories: 0,
    entries: 0,
    days: 0,
    avgCalories: 0,
  }));

  for (const day of days) {
    const row = rows[weekdayIndex(day.date)];
    row.totalCalories += day.totalCalories;
    row.entries += day.count;
    row.days += 1;
  }

  return rows.map((row) => ({
    ...row,
    avgCalories: row.days > 0 ? row.totalCalories / row.days : 0,
  }));
}

export function FoodSection({
  days,
  entries,
  selectedDay,
  onSelectDay,
}: {
  days: FoodDay[];
  entries: FoodEntry[];
  selectedDay: string | null;
  onSelectDay: (date: string) => void;
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
  const entriesWithCalories = entries.filter((entry) => entry.calories != null);
  // Cuánto me pasé de la meta en todo el periodo: los excesos suman y los
  // déficits restan, así un día flojo compensa a uno pasado. Solo entran días
  // con registro; contar los días sin comidas los tomaría como déficit entero.
  const deltaKcal = days.reduce((sum, d) => sum + (d.totalCalories - KCAL_TARGET), 0);
  const daysInTarget = days.filter((d) => d.totalCalories <= KCAL_TARGET).length;
  const targetRate = Math.round((daysInTarget / days.length) * 100);
  const weekdayData = weekdayStats(days);
  const topEntries = [...entriesWithCalories]
    .sort((a, b) => (b.calories ?? 0) - (a.calories ?? 0))
    .slice(0, 5);
  const chartData = days.map((d) => ({
    ...d,
    label: shortDay(d.date),
    isToday: d.date === today,
  }));

  // La tabla es lo único que acota el día elegido; KPIs y gráficos siguen
  // describiendo el periodo para poder comparar y saltar a otro día.
  const visibleEntries = selectedDay
    ? entries.filter((e) => e.date.slice(0, 10) === selectedDay)
    : entries;
  const selectedDayTotal = selectedDay
    ? (days.find((d) => d.date === selectedDay)?.totalCalories ?? 0)
    : 0;

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
        fill={dayTextColor(d.totalCalories)}
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
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <FoodKpi label="Promedio diario" value={`${formatNumber(avgKcal, 0)}`} unit="kcal" />
        <FoodKpi label="Total del periodo" value={`${formatNumber(totalKcal, 0)}`} unit="kcal" />
        <FoodKpi
          label="Balance vs meta"
          value={`${deltaKcal >= 0 ? "+" : "−"}${formatNumber(Math.abs(deltaKcal), 0)}`}
          unit={`kcal · ${days.length} día(s)`}
        />
        <FoodKpi
          label="Día más cargado"
          value={`${formatNumber(highest.totalCalories, 0)}`}
          unit={`kcal · ${shortDay(highest.date)}`}
        />
        <FoodKpi
          label="Días en meta"
          value={`${targetRate}`}
          unit={`% · ${daysInTarget}/${days.length}`}
        />
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
          <Bar
            dataKey="totalCalories"
            name="kcal"
            radius={[6, 6, 0, 0]}
            // Recharts entrega el punto en `payload`, no en la raíz del evento.
            onClick={(data) => {
              const date = (data?.payload as { date?: string } | undefined)?.date;
              if (date) onSelectDay(date);
            }}
            className="cursor-pointer"
          >
            <LabelList dataKey="totalCalories" content={renderTodayLabel} />
            {chartData.map((entry) => (
              <Cell
                key={entry.date}
                fill={dayColor(entry.totalCalories, entry.isToday)}
                // Con un día elegido el resto se atenúa; sin selección van todas
                // a opacidad plena.
                fillOpacity={selectedDay && entry.date !== selectedDay ? 0.28 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="mt-2 text-xs text-zinc-400">
        Banda verde = meta diaria de 0–{formatNumber(KCAL_TARGET, 0)} kcal. En{" "}
        <strong className="font-semibold text-[#9a5b12]">naranja</strong> los días que pasan
        la meta y en <strong className="font-semibold text-[#b5493c]">rojo</strong> los que
        superan {formatNumber(KCAL_HIGH, 0)} kcal. La barra de{" "}
        <strong className="font-semibold text-zinc-500">hoy</strong> va en un verde más
        intenso mientras sigas dentro de la meta.
      </p>

      {/* grid-cols-1 en móvil: una columna minmax(0,1fr) acotada al contenedor.
          Sin esto, la columna implícita 'auto' se estira al max-content de los
          nombres largos de "Comidas más calóricas" y arrastra al chart,
          desbordando la página. En laptop, items-stretch hace que ambas columnas
          compartan altura; la del chart es flex-col con el gráfico en flex-1,
          así que crece hasta igualar el contenedor de la derecha sin dejar
          hueco abajo. */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-stretch">
        <div className="flex min-w-0 flex-col bg-white lg:rounded-xl lg:border lg:border-black/10 lg:p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-500">
            Promedio por día de la semana
          </h3>
          <div className="h-[220px] w-full min-w-0 lg:h-auto lg:min-h-[220px] lg:flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayData} margin={{ top: 8, right: 10, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-black/10" />
                <XAxis dataKey="weekday" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={44} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  labelStyle={{ fontWeight: 600 }}
                  formatter={(value) => [`${formatNumber(Number(value), 0)} kcal`, "Promedio"]}
                />
                {/* Mismas bandas que el gráfico de arriba: estos también son
                    kcal de un día (promediadas), así que pintarlos siempre de
                    verde escondería los días de la semana que se pasan. */}
                <Bar dataKey="avgCalories" name="Promedio" radius={[6, 6, 0, 0]}>
                  {weekdayData.map((row) => (
                    <Cell key={row.weekday} fill={dayColor(row.avgCalories, false)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-500">Comidas más calóricas</h3>
          {topEntries.length === 0 ? (
            <p className="text-sm text-zinc-500">No hay comidas con calorías registradas.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {topEntries.map((entry, index) => (
                <li
                  key={`${entry.date}-${entry.name}-${index}`}
                  className="flex items-start justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-zinc-800">
                      {entry.name || "—"}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {shortDay(entry.date.slice(0, 10))}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-700">
                    {formatNumber(entry.calories, 0)} kcal
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-500">
            {selectedDay ? `Comidas del ${shortDay(selectedDay)}` : "Comidas del periodo"}{" "}
            <span className="font-normal text-zinc-400">({visibleEntries.length})</span>
          </h3>
          {selectedDay ? (
            <button
              type="button"
              onClick={() => onSelectDay(selectedDay)}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
            >
              {formatNumber(selectedDayTotal, 0)} kcal · quitar filtro ✕
            </button>
          ) : (
            <span className="text-xs text-zinc-400">
              Pulsa una barra de los gráficos para ver solo ese día
            </span>
          )}
        </div>
        {/* Se listan TODAS las comidas del periodo, pero dentro de un contenedor
            con scroll propio: con "Todo" seleccionado son cientos de filas y sin
            el tope empujarían la sección de macros fuera de la pantalla. El
            encabezado va sticky para no perder de vista las columnas. */}
        <div className="max-h-[460px] overflow-auto rounded-xl border border-black/10">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-black/10 text-zinc-500">
                <th className="py-2 pl-3 pr-3 font-medium">Fecha</th>
                <th className="py-2 pr-3 font-medium">Comida</th>
                <th className="py-2 pr-3 font-medium text-right whitespace-nowrap">Calorías</th>
                <th className="py-2 pr-3 font-medium text-right whitespace-nowrap">Prot.</th>
                <th className="py-2 pr-3 font-medium text-right whitespace-nowrap">Carbs</th>
                <th className="py-2 pr-3 font-medium text-right whitespace-nowrap">Grasas</th>
                <th className="py-2 pr-3 font-medium text-right whitespace-nowrap">Fibra</th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry, i) => (
                <tr
                  key={`${entry.date}-${entry.name}-${i}`}
                  className="border-b border-black/5 last:border-0 transition-colors hover:bg-black/[0.03]"
                >
                  <td className="py-2 pl-3 pr-3 whitespace-nowrap align-top">
                    {shortDay(entry.date.slice(0, 10))}
                  </td>
                  <td className="py-2 pr-3">{entry.name || "—"}</td>
                  <td className="py-2 pr-3 whitespace-nowrap text-right align-top tabular-nums">
                    {entry.calories != null ? `${formatNumber(entry.calories, 0)} kcal` : "—"}
                  </td>
                  <MacroCell grams={entry.protein} />
                  <MacroCell grams={entry.carbs} />
                  <MacroCell grams={entry.fat} />
                  <MacroCell grams={entry.fiber} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}

// Celda de macro en gramos. La mayoría del histórico no los tiene, así que el
// hueco se marca con un guion tenue en vez de un 0, que se leería como "comí
// cero gramos" en vez de "no lo anoté".
function MacroCell({ grams }: { grams: number | null }) {
  return (
    <td className="py-2 pr-3 whitespace-nowrap text-right align-top tabular-nums">
      {grams != null ? (
        `${formatNumber(grams, 0)} g`
      ) : (
        <span className="text-zinc-300">—</span>
      )}
    </td>
  );
}

function FoodKpi({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {value}
        <span className="ml-1 text-sm font-normal text-zinc-400">{unit}</span>
      </p>
    </div>
  );
}

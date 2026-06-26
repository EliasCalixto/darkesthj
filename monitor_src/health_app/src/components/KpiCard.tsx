import { formatNumber } from "@/lib/format";
import type { KpiSummary } from "@/lib/stats";

export function KpiCard({
  kpi,
  comparisonLabel,
  invert = false,
}: {
  kpi: KpiSummary;
  comparisonLabel: string;
  // En "Todo" evaluamos el mes actual (comparison) contra el promedio
  // histórico (value); en el resto, el periodo seleccionado contra el previo.
  invert?: boolean;
}) {
  const hasBoth = kpi.value != null && kpi.comparison != null;
  const subject = invert ? kpi.comparison : kpi.value;
  const reference = invert ? kpi.value : kpi.comparison;
  const diff = hasBoth ? (subject as number) - (reference as number) : null;
  const percent =
    diff != null && reference ? (diff / Math.abs(reference as number)) * 100 : null;

  // Verde = más saludable que la referencia, rojo = menos. Respeta que en FC
  // en reposo un valor más bajo es mejor.
  const status =
    diff == null || Math.abs(diff) < 0.05
      ? null
      : (kpi.higherIsBetter ? diff > 0 : diff < 0)
        ? "better"
        : "worse";

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <p className="flex items-center gap-1.5 text-sm text-zinc-500">
        <span aria-hidden="true">{kpi.icon}</span>
        {kpi.label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {formatNumber(kpi.value, kpi.decimals)}
        <span className="ml-1 text-sm font-normal text-zinc-400">
          {kpi.unit}
        </span>
      </p>
      {kpi.comparison != null && (
        <p className="mt-1 text-xs text-zinc-500">
          {comparisonLabel}: {formatNumber(kpi.comparison, kpi.decimals)} {kpi.unit}
          {status && percent != null && (
            <span
              className={
                status === "better"
                  ? "ml-1.5 font-medium text-emerald-500"
                  : "ml-1.5 font-medium text-rose-500"
              }
            >
              {status === "better" ? "▲" : "▼"} {formatNumber(Math.abs(percent), 0)}%
            </span>
          )}
        </p>
      )}
    </div>
  );
}

// Resumen general de alimentación. Tarjetas blancas con la paleta de Finance.

export type SummaryStatus = "good" | "warn" | "bad" | "neutral";

export type SummaryItem = {
  icon: string;
  title: string;
  value: string;
  unit: string;
  sub: string;
  status: SummaryStatus;
};

const DOT: Record<SummaryStatus, string> = {
  good: "#34c759",
  warn: "#ff9f0a",
  bad: "#ff453a",
  neutral: "#c9c9ce",
};

export function HealthSummary({ items }: { items: SummaryItem[] }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">
        Resumen <span className="font-normal text-zinc-400">Overview</span>
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <span className="text-base" aria-hidden="true">
                {item.icon}
              </span>
              {item.title}
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {item.value}
              <span className="ml-1.5 text-sm font-normal text-zinc-400">{item.unit}</span>
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: DOT[item.status] }}
                aria-hidden="true"
              />
              {item.sub}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

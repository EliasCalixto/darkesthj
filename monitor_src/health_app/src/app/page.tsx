import { NOTION_TOKEN } from "@/lib/config";
import { formatBuildTimestamp, formatNumber } from "@/lib/format";
import { getFood, getMonthlySummary, getWorkouts } from "@/lib/notion";
import { summarizeFoodByDay, summarizeWorkoutsByType } from "@/lib/stats";
import { FoodSection } from "@/components/FoodSection";
import { HealthSummary, type SummaryItem } from "@/components/HealthSummary";
import { HeartRateIcon } from "@/components/HeartRateIcon";
import { MonthlyDashboard } from "@/components/MonthlyDashboard";
import { ReloadButton } from "@/components/ReloadButton";
import { SectionCard } from "@/components/SectionCard";
import { WorkoutsTable } from "@/components/WorkoutsTable";
import { WorkoutTypeChart } from "@/components/WorkoutTypeChart";
import { WorkoutTypeSummaryTable } from "@/components/WorkoutTypeSummaryTable";

export default async function Home() {
  if (!NOTION_TOKEN) {
    return <SetupNotice />;
  }

  let months, workouts, food;
  try {
    [months, workouts, food] = await Promise.all([
      getMonthlySummary(),
      getWorkouts(),
      getFood(),
    ]);
  } catch (error) {
    return <ErrorNotice error={error} />;
  }

  const workoutTypes = summarizeWorkoutsByType(workouts);
  const foodDays = summarizeFoodByDay(food);
  const generatedAt = formatBuildTimestamp(new Date());

  // --- Resumen general de los 3 aspectos clave -----------------------------
  const avg = (values: number[]): number | null =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

  const avgSleep = avg(months.map((m) => m.sleepHours).filter((v): v is number => v != null));
  const avgKcal = avg(foodDays.map((d) => d.totalCalories));
  const totalWorkoutMin = workouts.reduce((s, w) => s + (w.durationMinutes ?? 0), 0);
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
      value: `${workouts.length}`,
      unit: "sesiones",
      sub: `${Math.round(totalWorkoutMin / 60)} h en total${topType ? ` · ${topType}` : ""}`,
      status: workouts.length > 0 ? "good" : "neutral",
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-white/95 px-8 py-[18px] backdrop-blur">
        <div className="flex items-center gap-3">
          <a
            href="/monitor/"
            aria-label="Volver a Monitor"
            title="Volver a Monitor"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M9.78 3.22a.75.75 0 0 1 0 1.06L6.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" />
            </svg>
          </a>
          <HeartRateIcon className="h-6 w-6 shrink-0" />
          <h1 className="text-[22px] font-semibold tracking-tight">Health</h1>
          <span className="ml-1 hidden text-xs text-zinc-400 sm:inline">
            Datos actualizados: {generatedAt}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="https://github.com/EliasCalixto/darkesthj/actions/workflows/deploy.yml"
            target="_blank"
            rel="noreferrer"
            title="Abre GitHub Actions en una pestaña nueva. Ahí pulsa 'Run workflow' para forzar una reconstrucción inmediata con los datos más recientes de Notion (normalmente ya corre solo cada 15 min)."
            className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-[var(--border)] bg-white px-3.5 text-[13px] font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="opacity-75">
              <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
            </svg>
            Sync from Notion
          </a>
          <ReloadButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <HealthSummary items={summaryItems} />

        <FoodSection days={foodDays} entries={food} />

        <SectionCard
          title="🏋️ Entrenamiento"
          description={`${workouts.length} sesiones registradas`}
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <WorkoutTypeChart data={workoutTypes} />
            <WorkoutTypeSummaryTable data={workoutTypes} />
          </div>
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-zinc-500">Últimas sesiones</h3>
            <WorkoutsTable workouts={workouts.slice(0, 15)} />
          </div>
        </SectionCard>

        <section>
          <h2 className="mb-1 text-base font-semibold">😴 Sueño y métricas detalladas</h2>
          <p className="mb-4 text-sm text-zinc-500">
            Pasos, sueño, corazón y más — promedios diarios por mes.
          </p>
          <MonthlyDashboard months={months} />
        </section>
      </main>
    </>
  );
}

function SetupNotice() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">🩺 Health Dashboard</h1>
      <p className="text-zinc-500 dark:text-zinc-400">
        Falta configurar la conexión con Notion. Define las variables de entorno{" "}
        <code className="rounded bg-black/10 px-1 py-0.5 dark:bg-white/10">NOTION_TOKEN</code> con
        el secreto de tu integración interna de Notion y opcionalmente{" "}
        <code className="rounded bg-black/10 px-1 py-0.5 dark:bg-white/10">NOTION_PAGE_ID</code> con
        el ID de tu página &quot;Health&quot;. Recuerda compartir la página y sus bases de datos con la
        integración desde Notion.
      </p>
    </div>
  );
}

function ErrorNotice({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">🩺 Health Dashboard</h1>
      <p className="text-zinc-500 dark:text-zinc-400">
        No se pudo cargar la información de Notion: {message}
      </p>
      <p className="text-sm text-zinc-400">
        Verifica que NOTION_TOKEN sea válido y que la integración tenga acceso a la página
        &quot;Health&quot; y a sus bases de datos (📅 Resumen Mensual, 🏃 Entrenamientos, 🧠 Terapia).
      </p>
    </div>
  );
}

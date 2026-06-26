import { NOTION_TOKEN } from "@/lib/config";
import { formatBuildTimestamp } from "@/lib/format";
import {
  getHealthPageIntro,
  getMonthlySummary,
  getTherapySessions,
  getWorkouts,
} from "@/lib/notion";
import { summarizeWorkoutsByType } from "@/lib/stats";
import { HeartRateIcon } from "@/components/HeartRateIcon";
import { InlineMarkdown } from "@/components/InlineMarkdown";
import { MonthlyDashboard } from "@/components/MonthlyDashboard";
import { SectionCard } from "@/components/SectionCard";
import { TherapyList } from "@/components/TherapyList";
import { WorkoutsTable } from "@/components/WorkoutsTable";
import { WorkoutTypeChart } from "@/components/WorkoutTypeChart";
import { WorkoutTypeSummaryTable } from "@/components/WorkoutTypeSummaryTable";

export default async function Home() {
  if (!NOTION_TOKEN) {
    return <SetupNotice />;
  }

  let months, workouts, therapy, intro;
  try {
    [months, workouts, therapy, intro] = await Promise.all([
      getMonthlySummary(),
      getWorkouts(),
      getTherapySessions(),
      getHealthPageIntro().catch(() => null),
    ]);
  } catch (error) {
    return <ErrorNotice error={error} />;
  }

  const workoutTypes = summarizeWorkoutsByType(workouts);
  const generatedAt = formatBuildTimestamp(new Date());
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <a
          href="/monitor/"
          aria-label="Volver a Monitor"
          title="Volver a Monitor"
          className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M9.78 3.22a.75.75 0 0 1 0 1.06L6.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" />
          </svg>
        </a>
        <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <HeartRateIcon className="h-7 w-7 sm:h-8 sm:w-8" />
          Health Dashboard
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Datos actualizados: {generatedAt}
        </p>
        {intro && (
          <p className="mt-2 max-w-3xl text-sm text-zinc-500 break-words">
            <InlineMarkdown text={intro} />
          </p>
        )}
      </header>

      <MonthlyDashboard months={months} />

      <SectionCard
        title="🏋️ Entrenamientos"
        description={`${workouts.length} sesiones registradas`}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <WorkoutTypeChart data={workoutTypes} />
          <WorkoutTypeSummaryTable data={workoutTypes} />
        </div>
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-zinc-500">
            Últimas sesiones
          </h3>
          <WorkoutsTable workouts={workouts.slice(0, 15)} />
        </div>
      </SectionCard>

      <SectionCard title="🧠 Terapia">
        <TherapyList sessions={therapy} />
      </SectionCard>
    </div>
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

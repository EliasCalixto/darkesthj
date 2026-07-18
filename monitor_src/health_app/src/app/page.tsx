import { NOTION_TOKEN } from "@/lib/config";
import { formatBuildTimestamp } from "@/lib/format";
import { getFood } from "@/lib/notion";
import type { FoodEntry } from "@/lib/types";
import { Dashboard } from "@/components/Dashboard";
import { PageSwitcher } from "@/components/PageSwitcher";
import { ReloadButton } from "@/components/ReloadButton";

export default async function Home() {
  if (!NOTION_TOKEN) {
    return <SetupNotice />;
  }

  let food: FoodEntry[];
  try {
    food = await getFood();
  } catch (error) {
    return <ErrorNotice error={error} />;
  }

  const generatedAt = formatBuildTimestamp(new Date());

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-white/95 px-4 py-3 backdrop-blur sm:px-8 sm:py-[18px]">
        <div className="flex min-w-0 items-center gap-3">
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
          <PageSwitcher generatedAt={generatedAt} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="https://github.com/EliasCalixto/darkesthj/actions/workflows/deploy.yml"
            target="_blank"
            rel="noreferrer"
            title="Abre GitHub Actions en una pestaña nueva. Ahí pulsa 'Run workflow' para forzar una reconstrucción inmediata con los datos más recientes de Notion (normalmente ya corre solo cada 15 min)."
            className="inline-flex h-8 w-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-[var(--border)] bg-white px-0 text-[13px] font-medium text-zinc-800 transition-colors hover:bg-zinc-50 sm:w-auto sm:px-3.5"
          >
            {/* Escritorio: flechas de sync + texto */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
              className="hidden opacity-75 sm:inline"
            >
              <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
            </svg>
            {/* Móvil: icono Notion (N) para distinguir que dispara el flujo */}
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              className="inline sm:hidden"
            >
              <path d="M4 3h4l8 12V3h4v18h-4L8 9v12H4z" />
            </svg>
            <span className="hidden sm:inline">Sync from Notion</span>
          </a>
          <ReloadButton />
        </div>
      </header>

      <Dashboard food={food} />

      <footer className="mx-auto w-full max-w-6xl px-4 pb-10 text-xs text-zinc-400 sm:px-6 lg:px-8">
        Alimentación sincronizada desde Notion vía GitHub Actions ·{" "}
        <a
          href="https://github.com/EliasCalixto/darkesthj"
          target="_blank"
          rel="noreferrer"
          className="text-zinc-500 underline-offset-2 hover:underline"
        >
          Repo
        </a>
      </footer>
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
        el ID de tu página &quot;Health&quot;. Recuerda compartir la página y la base de datos de
        alimentación con la integración desde Notion.
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
        &quot;Health&quot; y a la base de datos 🍎 Alimentación.
      </p>
    </div>
  );
}

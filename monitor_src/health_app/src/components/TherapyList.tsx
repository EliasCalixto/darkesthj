import { formatDate } from "@/lib/format";
import type { TherapySession } from "@/lib/types";

export function TherapyList({ sessions }: { sessions: TherapySession[] }) {
  if (sessions.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin sesiones registradas.</p>;
  }

  return (
    <div>
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        {sessions.length} sesiones registradas
      </p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {sessions.slice(0, 12).map((session, i) => (
          <li key={`${session.name}-${i}`}>
            <a
              href={session.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-black/10 px-3 py-2 text-sm transition-colors hover:border-black/30 hover:bg-black/5 dark:border-white/10 dark:hover:border-white/30 dark:hover:bg-white/5"
            >
              <p className="font-medium">{session.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(session.date)}</p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", Roboto, sans-serif';

// Icono de Finance (mismas barras que su logo) para el item del menú.
function FinanceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width="18" height="18" aria-hidden="true" className={className}>
      <rect x="8" y="36" width="12" height="20" rx="3" fill="#5DA3C8" />
      <rect x="26" y="22" width="12" height="34" rx="3" fill="#52B373" />
      <rect x="44" y="10" width="12" height="46" rx="3" fill="#E86868" />
    </svg>
  );
}

// Icono de Health: corazón con pulso, idéntico al favicon de la pestaña
// (src/app/icon.png). Reemplaza a la antigua "fruta" para que el logo del
// header coincida con el de la tab.
function HealthIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#4c9d63"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 20.5C12 20.5 3.5 15 3.5 8.75C3.5 6.13 5.4 4.5 7.75 4.5C9.4 4.5 10.9 5.4 12 6.9C13.1 5.4 14.6 4.5 16.25 4.5C18.6 4.5 20.5 6.13 20.5 8.75C20.5 15 12 20.5 12 20.5Z" />
      <path d="M4 12.5H9.5L11 9L12 15L13 9L14.5 12.5H20" />
    </svg>
  );
}

// Despliega un menú (Health ⇄ Finance) al pulsar el título, para saltar rápido
// de un panel al otro. El panel actual va primero.
export function PageSwitcher({ generatedAt }: { generatedAt: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0">
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={open}
        title="Cambiar de panel"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="-mx-1.5 flex min-w-0 cursor-pointer items-center gap-3 rounded-lg px-1.5 py-1 transition-colors hover:bg-zinc-100"
      >
        <HealthIcon className="h-6 w-6 shrink-0" />
        <div className="flex min-w-0 flex-col gap-px">
          <span className="flex items-center gap-[5px]">
            <h1
              className="text-[18px] font-semibold max-[420px]:text-[16px] min-[721px]:text-[22px]"
              style={{ fontFamily: SYSTEM_FONT, letterSpacing: "-0.02em", lineHeight: 1 }}
            >
              Health
            </h1>
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
              className={`shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
            >
              <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </span>
          <span
            className="truncate text-[11px] leading-[1.15] text-zinc-400 min-[721px]:text-[12px]"
            style={{ fontFamily: SYSTEM_FONT }}
          >
            Actualizado: {generatedAt}
          </span>
        </div>
      </div>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+8px)] z-50 flex min-w-[210px] flex-col gap-0.5 rounded-xl border border-[var(--border)] bg-white p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
        >
          <a
            role="menuitem"
            href="/monitor/health/"
            className="flex items-center gap-2.5 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-800"
          >
            <HealthIcon className="h-[18px] w-[18px] shrink-0" />
            <span>Health</span>
            <span className="ml-auto text-[13px] text-zinc-400">✓</span>
          </a>
          <a
            role="menuitem"
            href="/monitor/finance/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100"
          >
            <FinanceIcon />
            <span>Finance</span>
          </a>
        </div>
      )}
    </div>
  );
}

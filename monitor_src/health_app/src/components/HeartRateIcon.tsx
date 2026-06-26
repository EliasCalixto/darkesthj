// Mismo ícono que el favicon de la pestaña (src/app/icon.png): un corazón con
// línea de pulso. Inline como SVG para que escale y respete el basePath.
export function HeartRateIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M24 42 C 8 30 4 20 4 14 C 4 7 9 2 16 2 C 20 2 23 4 24 8 C 25 4 28 2 32 2 C 39 2 44 7 44 14 C 44 20 40 30 24 42 Z"
        stroke="#4F9D69"
        strokeWidth={3}
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M5 24 H15 L19 14 L25 33 L29 18 L33 24 H43"
        stroke="#4F9D69"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

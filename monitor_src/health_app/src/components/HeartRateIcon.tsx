// Ícono de Health: corazón ancho con la línea de pulso fina cruzándolo de lado
// a lado (el pulso sobresale del contorno a propósito).
//
// Fuente única del ícono en este app — PageSwitcher lo importa en vez de
// redibujarlo. Finance es un sitio estático aparte (sin build ni imports), así
// que allí el mismo SVG está duplicado a mano en monitor_src/finance/index.html;
// si cambias la geometría o el color aquí, cámbialo también allá o los dos
// paneles vuelven a mostrar corazones distintos.
export const HEALTH_GREEN = "#3d8557";

export function HeartRateIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={HEALTH_GREEN}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      <path d="M3.5 12.5h4l2-3 2.5 5 2-4 1.5 2h4" strokeWidth={1.6} />
    </svg>
  );
}

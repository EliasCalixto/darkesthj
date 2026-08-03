// Ícono de Health: corazón con la línea de pulso contenida en el centro.
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
      <path d="M12 20.5C12 20.5 3.5 15 3.5 8.75C3.5 6.13 5.4 4.5 7.75 4.5C9.4 4.5 10.9 5.4 12 6.9C13.1 5.4 14.6 4.5 16.25 4.5C18.6 4.5 20.5 6.13 20.5 8.75C20.5 15 12 20.5 12 20.5Z" />
      <path d="M4 12.5H9.5L11 9L12 15L13 9L14.5 12.5H20" />
    </svg>
  );
}

// Renderiza el contenido completo de la página "Health" de Notion (encabezados,
// párrafos, listas y tablas) ya convertido a HTML por `getHealthPageHtml()`.
// El contenido es la propia página del dueño, generada en build-time, por lo que
// no se necesita sanitización.
export function NotionContent({ html }: { html: string }) {
  return (
    <div
      className="notion-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

import { marked } from "marked";

// Renderiza el contenido completo de la página "Health" de Notion (encabezados,
// párrafos y tablas) tal como lo escribe el usuario. El markdown llega desde
// `getHealthPageMarkdown()` con tablas en HTML crudo (<table>…); `marked` las
// deja pasar y convierte el resto (encabezados, **negritas**, listas, ---).
// El contenido es la propia página del dueño, generada en build-time, por lo que
// no se necesita sanitización.
export function NotionContent({ markdown }: { markdown: string }) {
  const html = marked.parse(markdown, { async: false, gfm: true }) as string;

  return (
    <div
      className="notion-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

import { PLATFORM_THEME } from "@/lib/theming/paths";
import { ThemeStylesheet } from "@/lib/theming/theme-stylesheet";

export default function NotFound() {
  return (
    <main className="container">
      <ThemeStylesheet slug={PLATFORM_THEME} />
      <h1>Página no encontrada</h1>
      <p>La dirección que buscas no existe o ya no está disponible.</p>
    </main>
  );
}

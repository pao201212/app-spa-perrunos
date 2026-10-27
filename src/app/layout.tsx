import type { Metadata, Viewport } from "next";

import "@/styles/base.css";

export const metadata: Metadata = {
  title: "Prisma Lab · Pet Spa",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CO">
      <body>{children}</body>
    </html>
  );
}

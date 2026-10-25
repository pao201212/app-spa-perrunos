import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prisma Lab · Pet Spa",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CO">
      <body>{children}</body>
    </html>
  );
}

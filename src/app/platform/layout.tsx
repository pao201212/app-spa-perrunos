import type { Metadata } from "next";

import { PLATFORM_THEME, tenantFaviconHref } from "@/lib/theming/paths";
import { ThemeStylesheet } from "@/lib/theming/theme-stylesheet";

export const metadata: Metadata = {
  title: { default: "Consola Prisma Lab", template: "%s · Consola Prisma Lab" },
  icons: { icon: tenantFaviconHref(PLATFORM_THEME) },
};

export default function PlatformLayout({ children }: LayoutProps<"/platform">) {
  return (
    <>
      <ThemeStylesheet slug={PLATFORM_THEME} />
      {children}
    </>
  );
}

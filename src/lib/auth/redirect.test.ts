import { describe, expect, it } from "vitest";

import { callbackUrl, safeNextPath } from "./redirect";

describe("safeNextPath (evita open redirects)", () => {
  it.each(["/", "/reservar", "/admin/agenda?dia=2026-10-26", "/citas#proxima"])(
    "acepta la ruta interna %s",
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  it.each([
    ["vacío", null],
    ["URL absoluta", "https://evil.com"],
    ["protocol-relative", "//evil.com/robar"],
    ["barra invertida", "/\\evil.com"],
    ["javascript:", "javascript:alert(1)"],
    ["sin barra inicial", "reservar"],
    ["con saltos de línea", "/ok\r\nSet-Cookie: x=1"],
  ])("rechaza %s y vuelve al inicio", (_, next) => {
    expect(safeNextPath(next)).toBe("/");
  });
});

describe("callbackUrl", () => {
  it("apunta a /auth/callback del mismo host y conserva el destino", () => {
    expect(callbackUrl("http://demo.localhost:3000", "/reservar?paso=2")).toBe(
      "http://demo.localhost:3000/auth/callback?next=%2Freservar%3Fpaso%3D2",
    );
  });

  it("sanea el destino antes de construir la URL", () => {
    expect(callbackUrl("https://spa.prismalab.com.co", "//evil.com")).toBe(
      "https://spa.prismalab.com.co/auth/callback?next=%2F",
    );
  });
});

import { describe, expect, it } from "vitest";

import { requestOrigin } from "./origin";

describe("requestOrigin", () => {
  it("usa el host original detrás de un proxy (Vercel)", () => {
    const headers = new Headers({
      host: "interno:3000",
      "x-forwarded-host": "spaperrunosygatunos.prismalab.com.co",
      "x-forwarded-proto": "https",
    });
    expect(requestOrigin(headers)).toBe("https://spaperrunosygatunos.prismalab.com.co");
  });

  it("en local usa http y conserva el puerto", () => {
    expect(requestOrigin(new Headers({ host: "demo.localhost:3000" }))).toBe(
      "http://demo.localhost:3000",
    );
  });

  it("sin x-forwarded-proto asume https fuera de localhost", () => {
    expect(requestOrigin(new Headers({ host: "demo.prismalab.com.co" }))).toBe(
      "https://demo.prismalab.com.co",
    );
  });
});

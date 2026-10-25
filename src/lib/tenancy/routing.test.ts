import { describe, expect, it } from "vitest";

import { routeRequest } from "./routing";

const root = "localhost";
const exists = async (slug: string) => slug === "demo";

describe("routeRequest", () => {
  it("reescribe un spa existente a /s/{slug} conservando ruta y query", async () => {
    expect(
      await routeRequest(
        { host: "demo.localhost:3000", pathname: "/reservar", search: "?d=1" },
        root,
        exists,
      ),
    ).toEqual({ type: "rewrite", path: "/s/demo/reservar?d=1" });
  });

  it("reescribe la raíz del spa", async () => {
    expect(
      await routeRequest({ host: "demo.localhost", pathname: "/", search: "" }, root, exists),
    ).toEqual({
      type: "rewrite",
      path: "/s/demo",
    });
  });

  it("devuelve 404 si el slug es válido pero el spa no existe o está inactivo", async () => {
    expect(
      await routeRequest({ host: "otro.localhost", pathname: "/", search: "" }, root, exists),
    ).toEqual({
      type: "not-found",
    });
  });

  it("reescribe admin.* a la consola de plataforma", async () => {
    expect(
      await routeRequest(
        { host: "admin.localhost:3000", pathname: "/tenants", search: "" },
        root,
        exists,
      ),
    ).toEqual({ type: "rewrite", path: "/platform/tenants" });
  });

  it("devuelve 404 para hosts desconocidos", async () => {
    expect(
      await routeRequest({ host: "localhost:3000", pathname: "/", search: "" }, root, exists),
    ).toEqual({
      type: "not-found",
    });
  });

  it("no consulta la BD cuando el host no es un spa", async () => {
    let calls = 0;
    const spy = async () => {
      calls++;
      return true;
    };
    await routeRequest({ host: "admin.localhost", pathname: "/", search: "" }, root, spy);
    await routeRequest({ host: "localhost", pathname: "/", search: "" }, root, spy);
    expect(calls).toBe(0);
  });
});

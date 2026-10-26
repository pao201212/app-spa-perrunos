import { describe, expect, it } from "vitest";

import { parseExplainQuery } from "./explain-query";

const SERVICE = "6f1c2a59-2a7f-4f63-9a59-0d1c0f0e8b11";

describe("parseExplainQuery", () => {
  it("usa hoy y valores por defecto si solo llega el servicio", () => {
    expect(parseExplainQuery({ service: SERVICE }, "2026-11-02")).toEqual({
      date: "2026-11-02",
      query: { date: "2026-11-02", species: "dog", size: "M", coat: "short", service: SERVICE },
    });
  });

  it("ignora un corte vacío y lee el primer valor repetido", () => {
    const { query } = parseExplainQuery(
      { service: [SERVICE, "otro"], cut: "", size: "L", date: "2026-11-03" },
      "2026-11-02",
    );
    expect(query).toMatchObject({ service: SERVICE, size: "L", date: "2026-11-03" });
    expect(query?.cut).toBeUndefined();
  });

  it("conserva la fecha de la URL aunque falte el servicio", () => {
    expect(parseExplainQuery({ date: "2026-11-08" }, "2026-11-02")).toEqual({
      query: null,
      date: "2026-11-08",
    });
  });

  it("sin servicio válido no hay consulta", () => {
    expect(parseExplainQuery({ service: "x" }, "2026-11-02")).toEqual({
      query: null,
      date: "2026-11-02",
    });
  });
});

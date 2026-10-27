import { describe, expect, it } from "vitest";

import { petFormSchema, petPhotoError, profileSchema } from "./schema";

describe("profileSchema", () => {
  it("exige nombre y WhatsApp", () => {
    expect(
      profileSchema.parse({ full_name: " Ana Pérez ", whatsapp: " +57 300 123 4567 " }),
    ).toEqual({
      full_name: "Ana Pérez",
      whatsapp: "+57 300 123 4567",
    });
    expect(
      profileSchema
        .safeParse({ full_name: "", whatsapp: "123" })
        .error?.issues.map((i) => i.path[0])
        .sort(),
    ).toEqual(["full_name", "whatsapp"]);
  });
});

describe("petFormSchema", () => {
  const base = { name: " Max ", species: "dog", breed_id: "6f1c7a2e-1d2b-4c3d-8e9f-0a1b2c3d4e5f" };

  it("acepta una mascota de raza sin peso ni pelo", () => {
    expect(petFormSchema.parse(base)).toEqual({
      ...base,
      name: "Max",
      weight_kg: null,
      coat: null,
      gender: null,
    });
  });

  it("acepta peso con coma decimal, pelo y género", () => {
    expect(
      petFormSchema.parse({ ...base, weight_kg: "12,5", coat: "long", gender: "male" }),
    ).toMatchObject({
      weight_kg: 12.5,
      coat: "long",
      gender: "male",
    });
  });

  it("rechaza pesos fuera de rango y razas inválidas", () => {
    expect(petFormSchema.safeParse({ ...base, weight_kg: "0" }).success).toBe(false);
    expect(petFormSchema.safeParse({ ...base, weight_kg: "200" }).success).toBe(false);
    expect(petFormSchema.safeParse({ ...base, breed_id: "golden" }).success).toBe(false);
  });
});

describe("petPhotoError", () => {
  const file = (type: string, size: number) => new File([new Uint8Array(size)], "foto", { type });

  it("acepta JPG, PNG y WebP de hasta 3 MB", () => {
    expect(petPhotoError(file("image/jpeg", 1024))).toBeNull();
    expect(petPhotoError(file("image/webp", 3 * 1024 * 1024))).toBeNull();
  });

  it("rechaza otros formatos y archivos grandes", () => {
    expect(petPhotoError(file("application/pdf", 10))).toMatch(/JPG, PNG o WebP/);
    expect(petPhotoError(file("image/png", 3 * 1024 * 1024 + 1))).toMatch(/3 MB/);
  });
});

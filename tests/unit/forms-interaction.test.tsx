import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AdminNav } from "@/components/admin/AdminNav";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { DeleteBreedButton } from "@/features/breeds/components/DeleteBreedButton";
import { PetForm } from "@/features/customers/components/PetForm";
import { ApplyToAllForm } from "@/features/locations/components/ApplyToAllForm";
import { CapacityEditor } from "@/features/locations/components/CapacityEditor";
import { StationsEditor } from "@/features/locations/components/StationsEditor";
import type { LocationDetail } from "@/features/locations/queries";
import { BreedDangerZone } from "@/features/pet-catalog/components/BreedDangerZone";
import { CopyPricesButton } from "@/features/services/components/CopyPricesButton";
import { DurationMatrixForm } from "@/features/services/components/DurationMatrixForm";
import { PriceMatrixForm } from "@/features/services/components/PriceMatrixForm";

import { dataset, IDS } from "../fixtures/dataset";
import { server, withSupabase } from "../server-env";

// Interacción de formularios del panel: acordeones, errores, diálogos de confirmación.

const browser = vi.hoisted(() => ({ result: { error: null as unknown } }));
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signInWithOAuth: vi.fn(async () => browser.result) },
  }),
}));
const compress = vi.hoisted(() => ({ same: true }));
// La foto reducida no se puede asignar a input.files en jsdom: se prueba el caso sin cambio.
vi.mock("@/features/customers/compress-image", () => ({
  compressImage: async (file: File) =>
    compress.same ? file : new File(["x"], "foto.webp", { type: "image/webp" }),
}));

const slug = "spa";
const location = dataset().locations[0] as LocationDetail;
const user = () => userEvent.setup();

function desktop(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as never,
  );
}

describe("PetForm", () => {
  const breeds = [
    { id: IDS.breed, name: "Pug", species: "dog", is_mixed: false },
    { id: IDS.mixedBreed, name: "Criollo", species: "dog", is_mixed: true },
    { id: "gato", name: "Siamés", species: "cat", is_mixed: false },
  ] as never;

  it("el criollo pide peso y pelo; cambiar de especie limpia la raza", async () => {
    const action = vi.fn(async () => ({
      status: "error" as const,
      fieldErrors: { coat: "Elige el tipo de pelo" },
      values: { name: "Toby", species: "dog", breed_id: IDS.mixedBreed },
    }));
    render(<PetForm action={action} breeds={breeds} />);
    expect(screen.getByLabelText("Peso (kg, opcional)")).toBeInTheDocument();
    await user().selectOptions(screen.getByLabelText("Raza"), IDS.mixedBreed);
    expect(screen.getByLabelText("Peso (kg)")).toBeInTheDocument();
    expect(screen.getByLabelText("Pelo")).toBeInTheDocument();
    await user().selectOptions(screen.getByLabelText("Especie"), "cat");
    expect(screen.getByLabelText("Raza")).toHaveValue("");
    expect(screen.queryByLabelText("Pelo")).not.toBeInTheDocument();
    await user().selectOptions(screen.getByLabelText("Especie"), "dog");
    await user().click(screen.getByRole("button", { name: /Guardar/ }));
    expect(action).toHaveBeenCalled();
  });

  it("el staff fija talla y pelo a mano; edita una mascota existente", async () => {
    const pet = { ...dataset().pets[0], size_locked: true } as never;
    render(<PetForm action={vi.fn()} breeds={breeds} pet={pet} allowOverride />);
    expect(screen.getByLabelText("Nombre")).toHaveValue("Rocky");
    expect(screen.getByLabelText("Talla fija")).toHaveValue("M");
    await user().click(screen.getByRole("checkbox", { name: /Fijar talla/ }));
    expect(screen.queryByLabelText("Talla fija")).not.toBeInTheDocument();
  });

  it("si la foto no se puede reducir, se envía la original", async () => {
    render(<PetForm action={vi.fn()} breeds={breeds} />);
    const input = screen.getByLabelText("Foto") as HTMLInputElement;
    const original = new File(["a"], "a.jpg", { type: "image/jpeg" });
    await user().upload(input, original);
    expect(input.files?.[0]).toBe(original);
  });
});

describe("matrices con acordeón", () => {
  it("en móvil cada talla se abre y se cierra; con error queda abierta", async () => {
    desktop(false);
    withSupabase();
    render(<CapacityEditor slug={slug} location={location} />);
    const medium = screen.getByRole("button", { name: /Mediano \(M\)/ });
    expect(medium).toHaveAttribute("aria-expanded", "false");
    await user().click(medium);
    expect(medium).toHaveAttribute("aria-expanded", "true");
    await user().type(screen.getByLabelText("Gato · Mediano (M) · Largo"), "0");
    await user().click(medium);
    expect(medium).toHaveAttribute("aria-expanded", "false");
    await user().click(screen.getByRole("button", { name: "Guardar capacidad" }));
    await waitFor(() => expect(medium).toHaveAttribute("aria-expanded", "true"));
    expect(screen.getByText("Escribe un número entero (mínimo 1)")).toBeInTheDocument();
  });

  it("en escritorio todas las tallas están abiertas", async () => {
    desktop(true);
    render(
      <DurationMatrixForm
        slug={slug}
        serviceId={IDS.bath}
        kind="bath"
        durations={dataset().service_durations as never}
      />,
    );
    const medium = screen.getByRole("button", { name: /Mediano \(M\)/ });
    expect(medium).toHaveAttribute("aria-expanded", "true");
    await user().click(medium);
    expect(medium).toHaveAttribute("aria-expanded", "true");
  });

  it("duraciones en móvil: abre, marca la fila a medias y la deja abierta", async () => {
    desktop(false);
    withSupabase();
    render(<DurationMatrixForm slug={slug} serviceId={IDS.bath} kind="bath" durations={[]} />);
    const large = screen.getByRole("button", { name: /Grande \(L\)/ });
    await user().click(large);
    await user().type(screen.getByLabelText("Grande (L) · Corto · Baño"), "40");
    await user().click(large);
    await user().click(screen.getByRole("button", { name: "Guardar duraciones" }));
    await waitFor(() => expect(large).toHaveAttribute("aria-expanded", "true"));
  });

  it("precios: muestra lo guardado y marca errores", async () => {
    withSupabase({ dataset: dataset() });
    render(
      <PriceMatrixForm
        slug={slug}
        serviceId={IDS.bath}
        serviceName="Baño"
        locationId={IDS.location}
        offered={[{ size: "M", coat: "short" }]}
        extras={[{ id: IDS.extra, name: "Hidratación" }]}
        prices={{ service: [{ size: "M", coat: "short", price_cop: 45000 }], extras: [] }}
      />,
    );
    const cells = screen.getAllByLabelText("Mediano (M) · Corto");
    expect(cells[0]).toHaveValue("45.000");
    await user().clear(cells[0]);
    await user().type(cells[1], "10000");
    await user().click(screen.getByRole("button", { name: /Guardar precios/ }));
    expect(await screen.findByText(/el extra no se puede ofrecer/)).toBeInTheDocument();
  });
});

describe("estaciones", () => {
  it("la casilla de corte especial solo aparece para mesas; se edita en su panel", async () => {
    withSupabase({ dataset: dataset() });
    render(<StationsEditor slug={slug} location={location} />);
    const add = screen.getAllByRole("combobox", { name: "Tipo" }).at(-1)!;
    await user().selectOptions(add, "tub");
    expect(
      screen.queryAllByRole("checkbox", { name: "También sirve para corte especial" }),
    ).toHaveLength(0);
    await user().selectOptions(add, "table");
    expect(
      screen.getByRole("checkbox", { name: "También sirve para corte especial" }),
    ).toBeInTheDocument();
    const edit = screen.getByRole("button", { name: /Editar Mesa 1|EditarMesa 1/ });
    await user().click(edit);
    expect(edit).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByRole("button", { name: "Guardar estación" }).closest("form")!;
    await user().clear(within(panel).getByLabelText("Nombre"));
    await user().type(within(panel).getByLabelText("Nombre"), "Mesa grande");
    await user().click(within(panel).getByRole("button", { name: "Guardar estación" }));
    expect(await screen.findByText("Estación guardada")).toBeInTheDocument();
  });

  it("sin estaciones invita a agregarlas", () => {
    render(<StationsEditor slug={slug} location={{ ...location, stations: [] }} />);
    expect(screen.getByText(/Aún no hay estaciones/)).toBeInTheDocument();
  });
});

describe("diálogos de confirmación", () => {
  it("aplicar a todos los locales: cancelar o confirmar", async () => {
    withSupabase({ rpcs: { apply_location_settings: { data: 1, error: null } } });
    render(<ApplyToAllForm slug={slug} locationId={IDS.location} otherLocations={1} />);
    await user().click(screen.getByRole("button", { name: "Aplicar a todos los locales" }));
    const dialog = screen.getByRole("dialog", { name: "¿Aplicar a todos los locales?" });
    expect(dialog).toHaveTextContent("1 local más");
    await user().click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user().click(screen.getByRole("button", { name: "Aplicar a todos los locales" }));
    await user().click(screen.getByRole("button", { name: "Sí, aplicar" }));
    expect(await screen.findByText("Configuración aplicada a 1 local")).toBeInTheDocument();
  });

  it("copiar precios: cancelar o copiar", async () => {
    withSupabase({ rpcs: { copy_service_prices: { data: 3, error: null } } });
    render(
      <CopyPricesButton
        slug={slug}
        serviceId={IDS.bath}
        locationId={IDS.location}
        locationName="Norte"
        others={3}
      />,
    );
    await user().click(screen.getByRole("button", { name: "Copiar a los demás locales" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("3 locales más");
    await user().click(screen.getByRole("button", { name: "Cancelar" }));
    await user().click(screen.getByRole("button", { name: "Copiar a los demás locales" }));
    await user().click(screen.getByRole("button", { name: "Copiar" }));
    expect(await screen.findByText("Precios copiados a 3 locales")).toBeInTheDocument();
  });

  it("eliminar razas pide confirmación; las heredadas se restauran", async () => {
    const { unmount } = render(<DeleteBreedButton breedId={IDS.globalBreed} breedName="Pug" />);
    await user().click(screen.getByRole("button", { name: "Eliminar raza" }));
    expect(screen.getByRole("dialog", { name: "¿Eliminar Pug?" })).toBeInTheDocument();
    await user().click(screen.getByRole("button", { name: "Cancelar" }));
    unmount();

    const [inherited, own] = dataset().tenant_breeds as never[];
    const first = render(<BreedDangerZone slug={slug} breed={inherited} />);
    expect(
      screen.getByRole("button", { name: "Restaurar valores del catálogo" }),
    ).toBeInTheDocument();
    first.unmount();
    const plain = render(
      <BreedDangerZone
        slug={slug}
        breed={{ ...(inherited as object), is_customized: false } as never}
      />,
    );
    expect(plain.container).toBeEmptyDOMElement();
    plain.unmount();
    render(
      <BreedDangerZone slug={slug} breed={{ ...(own as object), name: "Criollo" } as never} />,
    );
    await user().click(screen.getByRole("button", { name: "Eliminar raza" }));
    expect(screen.getByRole("dialog", { name: "¿Eliminar Criollo?" })).toBeInTheDocument();
    await user().click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("navegación y acceso", () => {
  it("en móvil, las secciones extra se abren desde 'Más'", async () => {
    server.pathname = "/admin/locales/x";
    render(<AdminNav />);
    await user().click(screen.getByRole("button", { name: "Más" }));
    const sheet = screen.getByRole("dialog", { name: "Más" });
    await user().click(within(sheet).getByRole("link", { name: "Locales" }));
  });

  it("Google: muestra el error si no se pudo iniciar", async () => {
    browser.result = { error: { message: "x" } };
    render(<GoogleSignInButton next="/reservar" />);
    await user().click(screen.getByRole("button", { name: "Continuar con Google" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    browser.result = { error: null };
    await user().click(screen.getByRole("button", { name: "Continuar con Google" }));
    expect(screen.getByRole("button", { name: "Abriendo Google…" })).toBeInTheDocument();
  });
});

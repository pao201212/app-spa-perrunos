import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axeViolations } from "../../../../tests/axe";
import type { BookResult, SlotsResult } from "../actions";
import type { BookingCatalog, BookingPet } from "../pricing";
import { BookingWizard } from "./BookingWizard";

const NORTE = "11111111-1111-4111-8111-111111111111";
const SUR = "22222222-2222-4222-8222-222222222222";
const BANO = "33333333-3333-4333-8333-333333333333";
const CORTE = "44444444-4444-4444-8444-444444444444";
const HIDRA = "55555555-5555-4555-8555-555555555555";
const MONO = "66666666-6666-4666-8666-666666666666";
const MAX = "77777777-7777-4777-8777-777777777777";

const catalog: BookingCatalog = {
  services: [
    { id: BANO, name: "Baño", kind: "bath", species: "both", description: "Con shampoo neutro" },
    { id: CORTE, name: "Corte de raza", kind: "special_cut", species: "dog", description: null },
  ],
  extras: [{ id: HIDRA, service_id: BANO, name: "Hidratación", extra_minutes: 15 }],
  options: [{ id: MONO, service_id: BANO, name: "Moño", stage: "details" }],
  locations: [
    { id: NORTE, name: "Norte", address: "Calle 1", max_days_ahead: 30 },
    { id: SUR, name: "Sur", address: "Calle 2", max_days_ahead: 30 },
  ],
  servicePrices: [
    { location_id: NORTE, service_id: BANO, size: "M", coat: "short", price_cop: 40000 },
    { location_id: SUR, service_id: BANO, size: "M", coat: "short", price_cop: 35000 },
    { location_id: NORTE, service_id: CORTE, size: "M", coat: "short", price_cop: 30000 },
  ],
  extraPrices: [
    { location_id: NORTE, extra_id: HIDRA, size: "M", coat: "short", price_cop: 10000 },
  ],
};
const pets: BookingPet[] = [{ id: MAX, name: "Max", species: "dog", size: "M", coat: "short" }];
const SLOT = "2026-11-02T13:00:00.000Z";
const booked: BookResult = {
  ok: true,
  booking: { code: "ABC234", pending: false, ready: "10:45", total: 80000 },
};

function setup({
  slots = { ok: true, slots: [{ startsAt: SLOT, time: "08:00", ready: "10:45" }] } as SlotsResult,
  result = booked,
  staff = false,
} = {}) {
  const fetchSlots = vi.fn(async () => slots);
  const submitBooking = vi.fn(async () => result);
  render(
    <BookingWizard
      pets={pets}
      catalog={catalog}
      today="2026-10-26"
      fetchSlots={fetchSlots}
      submitBooking={submitBooking}
      staff={staff}
      addPetHref="/mascotas/nueva"
      done={{ href: "/citas", label: "Ver mis citas" }}
    />,
    // En la página, el asistente vive dentro de <main> (CustomerShell / AdminShell).
    { wrapper: ({ children }) => <main>{children}</main> },
  );
  return { fetchSlots, submitBooking, user: userEvent.setup() };
}

const next = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Continuar" }));

async function chooseUntilHours(user: ReturnType<typeof userEvent.setup>) {
  expect(screen.getByRole("checkbox", { name: /Max/ })).toBeChecked(); // única mascota
  await next(user);
  await user.click(screen.getByRole("radio", { name: /Baño/ }));
  await user.click(screen.getByRole("radio", { name: /Corte de raza/ }));
  await user.click(screen.getByRole("checkbox", { name: /Hidratación/ }));
  await user.click(screen.getByRole("checkbox", { name: /Moño/ }));
  await next(user);
  // Sur no tiene corte de raza ni hidratación: no se puede elegir.
  expect(screen.getByRole("radio", { name: /Sur/ })).toBeDisabled();
  expect(screen.getByText("No ofrece: Corte de raza (Max), Hidratación (Max)")).toBeInTheDocument();
  await user.click(screen.getByRole("radio", { name: /Norte/ }));
  expect(screen.getByText("$ 80.000")).toBeInTheDocument();
  await next(user);
}

describe("BookingWizard", () => {
  it("reserva en 5 pasos y envía lo elegido", async () => {
    const { fetchSlots, submitBooking, user } = setup();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
    await chooseUntilHours(user);

    const selection = {
      petId: MAX,
      serviceId: BANO,
      cutId: CORTE,
      extras: [HIDRA],
      options: [MONO],
    };
    expect(fetchSlots).toHaveBeenCalledWith({
      locationId: NORTE,
      date: "2026-10-26",
      selections: [selection],
    });
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
    await user.click(await screen.findByRole("radio", { name: /08:00.*entrega aprox\. 10:45/ }));
    await next(user);

    expect(screen.getByRole("heading", { level: 2, name: /Resumen/ })).toHaveFocus();
    expect(screen.getByText("Sin costo")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Notas para el spa (opcional)"), "Tímido");
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));

    expect(submitBooking).toHaveBeenCalledWith(
      { locationId: NORTE, startsAt: SLOT, selections: [selection], notes: "Tímido" },
      false,
    );
    expect(
      await screen.findByRole("heading", { name: "¡Reserva confirmada!" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ABC234")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver mis citas" })).toHaveAttribute("href", "/citas");
  });

  it("cambiar el día vuelve a pedir las horas; sin horas lo dice", async () => {
    const { fetchSlots, user } = setup({ slots: { ok: true, slots: [] } });
    await chooseUntilHours(user);
    expect(await screen.findByText(/No hay horas disponibles este día/)).toBeInTheDocument();
    const day = screen.getByLabelText("Día");
    await user.clear(day);
    await user.type(day, "2026-10-28");
    expect(fetchSlots).toHaveBeenLastCalledWith(expect.objectContaining({ date: "2026-10-28" }));
  });

  it("si el horario se ocupa al confirmar, vuelve a la hora con el aviso", async () => {
    const { fetchSlots, user } = setup({
      result: {
        ok: false,
        slotTaken: true,
        message: "Ese horario acaba de ocuparse. Elige otra hora.",
      },
    });
    await chooseUntilHours(user);
    await user.click(await screen.findByRole("radio", { name: /08:00/ }));
    await next(user);
    await user.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ese horario acaba de ocuparse");
    expect(screen.getByRole("heading", { level: 2, name: /Hora/ })).toBeInTheDocument();
    expect(fetchSlots).toHaveBeenCalledTimes(2);
  });

  it("el admin confirma el sobrecupo en un diálogo antes de crear la cita", async () => {
    const { submitBooking, user } = setup({
      staff: true,
      slots: {
        ok: true,
        slots: [
          {
            startsAt: SLOT,
            time: "08:00",
            ready: "10:45",
            overbook: { label: "Cupo lleno", message: "Día lleno: no queda cupo en 1 jornada" },
          },
        ],
      },
    });
    await chooseUntilHours(user);
    await user.click(await screen.findByRole("radio", { name: /08:00.*Sobrecupo · Cupo lleno/ }));
    await next(user);
    expect(screen.getByText(/Se creará con sobrecupo/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Crear cita" }));
    expect(submitBooking).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog", { name: "¿Crear con sobrecupo?" });
    await user.click(within(dialog).getByRole("button", { name: "Sí, crear con sobrecupo" }));
    expect(submitBooking).toHaveBeenCalledWith(expect.anything(), true);
    expect(await screen.findByRole("heading", { name: "Cita creada" })).toBeInTheDocument();
  });

  it("sin mascotas invita a registrarlas y no deja continuar", () => {
    render(
      <BookingWizard
        pets={[]}
        catalog={catalog}
        today="2026-10-26"
        fetchSlots={vi.fn()}
        submitBooking={vi.fn()}
        addPetHref="/mascotas/nueva"
        done={{ href: "/citas", label: "Ver mis citas" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Agregar mascota" })).toHaveAttribute(
      "href",
      "/mascotas/nueva",
    );
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });

  it("no tiene violaciones de accesibilidad en el paso de servicios", async () => {
    const { user } = setup();
    await next(user);
    await user.click(screen.getByRole("radio", { name: /Baño/ }));
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

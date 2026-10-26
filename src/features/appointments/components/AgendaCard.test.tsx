import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axeViolations } from "../../../../tests/axe";
import type { AgendaAppointment } from "../queries";

const changeStatusAction = vi.fn(async () => ({
  status: "success" as const,
  message: "Estado: Recibida",
}));
const adjustReadyAction = vi.fn(async () => ({ status: "idle" as const }));
const confirmReceptionAction = vi.fn(async () => ({
  status: "success" as const,
  message: "¡Gracias!",
}));
vi.mock("../admin-actions", () => ({ changeStatusAction, adjustReadyAction }));
vi.mock("../actions", () => ({ confirmReceptionAction }));

const { AgendaCard } = await import("./AgendaCard");
const { ConfirmReceptionForm } = await import("./ConfirmReceptionForm");

const appointment = (status: AgendaAppointment["status"], more: Partial<AgendaAppointment> = {}) =>
  ({
    id: "a1",
    code: "ABC234",
    status,
    starts_at: "2026-11-02T13:00:00+00:00",
    estimated_ready_at: "2026-11-02T14:30:00+00:00",
    total_cop: 45000,
    overbooked: false,
    notes: null,
    source: "web",
    client_confirmed_at: null,
    customers: { id: "c1", full_name: "Lucía Gómez", whatsapp: "+57 300 000 0000" },
    appointment_pets: [
      {
        pet_id: "p1",
        size: "M",
        coat: "short",
        pets: { name: "Rocky" },
        appointment_items: [
          { item_type: "service", name: "Baño" },
          { item_type: "option", name: "Moño" },
        ],
      },
    ],
    ...more,
  }) as AgendaAppointment;

const renderCard = (a: AgendaAppointment) =>
  render(
    <main>
      <AgendaCard slug="spa" appointment={a} date="2026-11-02" starts="08:00" ready="09:30" />
    </main>,
  );

describe("AgendaCard", () => {
  it("muestra la cita y los pasos posibles según su estado", async () => {
    renderCard(appointment("scheduled", { overbooked: true, notes: "Tímido" }));
    expect(screen.getByText("08:00 → 09:30")).toBeInTheDocument();
    expect(screen.getByText("Rocky (M)")).toBeInTheDocument();
    expect(screen.getByText("Baño")).toBeInTheDocument();
    expect(screen.getByText("Sobrecupo")).toBeInTheDocument();
    expect(screen.getByText("“Tímido”")).toBeInTheDocument();
    // jsdom une el texto oculto sin espacio al calcular el nombre; se compara el texto visible.
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Recibir la cita de las 08:00",
      "No asistió la cita de las 08:00",
      "Cancelar la cita de las 08:00",
      "Ajustar entrega de la cita de las 08:00",
    ]);

    await userEvent.click(screen.getByRole("button", { name: /^Recibir/ }));
    expect(changeStatusAction).toHaveBeenCalled();
    expect(await screen.findByText("Estado: Recibida")).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("permite ajustar la entrega", async () => {
    renderCard(appointment("in_progress", { client_confirmed_at: "2026-11-02T13:05:00Z" }));
    expect(screen.getByText("El cliente confirmó la recepción")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /^Ajustar entrega/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(screen.getByLabelText("Nueva hora de entrega")).toHaveValue("09:30");
    await userEvent.click(screen.getByRole("button", { name: "Guardar entrega" }));
    expect(adjustReadyAction).toHaveBeenCalled();
  });

  it("una cita entregada ya no tiene acciones", () => {
    renderCard(appointment("delivered"));
    expect(screen.queryAllByRole("button")).toEqual([]);
  });
});

describe("ConfirmReceptionForm", () => {
  it("envía la confirmación", async () => {
    render(<ConfirmReceptionForm slug="spa" appointmentId="a1" petNames="Rocky" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Confirmar que el spa recibió a Rocky" }),
    );
    expect(confirmReceptionAction).toHaveBeenCalled();
    expect(await screen.findByText("¡Gracias!")).toBeInTheDocument();
  });
});

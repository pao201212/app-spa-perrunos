import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { axeViolations } from "../../../tests/axe";

import { Badge, Button, Card, Dialog, Input, Select, Sheet, Tabs } from ".";

describe("Button", () => {
  it("dispara onClick y respeta disabled", async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Reservar</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Reservar" }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        Reservar
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reservar" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("es type=button por defecto para no enviar formularios por accidente", () => {
    render(<Button>Ok</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("en estado loading queda deshabilitado y anuncia aria-busy", () => {
    render(<Button loading>Guardar</Button>);
    const button = screen.getByRole("button", { name: /Guardar/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});

describe("Input", () => {
  it("asocia label, ayuda y error accesibles", () => {
    render(<Input label="WhatsApp" type="tel" hint="Con indicativo" error="Número inválido" />);
    const input = screen.getByLabelText("WhatsApp");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/Con indicativo/);
    expect(input).toHaveAccessibleDescription(/Número inválido/);
  });

  it("sin error no marca aria-invalid", () => {
    render(<Input label="Nombre" />);
    expect(screen.getByLabelText("Nombre")).not.toHaveAttribute("aria-invalid");
  });
});

describe("Select", () => {
  it("es un select nativo con label (mejor experiencia en móvil)", async () => {
    render(
      <Select label="Talla" defaultValue="">
        <option value="" disabled>
          Elige una talla
        </option>
        <option value="M">Mediano</option>
      </Select>,
    );
    const select = screen.getByLabelText("Talla");
    await userEvent.selectOptions(select, "M");
    expect(select).toHaveValue("M");
  });
});

describe("Dialog y Sheet", () => {
  function Demo({ variant }: { variant: "dialog" | "sheet" }) {
    const [open, setOpen] = useState(false);
    const Component = variant === "dialog" ? Dialog : Sheet;
    return (
      <>
        <Button onClick={() => setOpen(true)}>Abrir</Button>
        <Component open={open} onClose={() => setOpen(false)} title="Confirmar cita">
          <p>¿Confirmas la cita?</p>
        </Component>
      </>
    );
  }

  it.each(["dialog", "sheet"] as const)(
    "%s se abre con título accesible y se cierra",
    async (variant) => {
      render(<Demo variant={variant} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
      expect(screen.getByRole("dialog", { name: "Confirmar cita" })).toBeVisible();

      await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    },
  );
});

describe("Tabs", () => {
  const tabs = [
    { id: "dia", label: "Día", content: <p>Vista día</p> },
    { id: "semana", label: "Semana", content: <p>Vista semana</p> },
    { id: "estacion", label: "Por estación", content: <p>Vista estación</p> },
  ];

  it("muestra el panel activo y cambia con clic", async () => {
    render(<Tabs label="Vista de agenda" tabs={tabs} />);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Vista día");
    await userEvent.click(screen.getByRole("tab", { name: "Semana" }));
    expect(screen.getByRole("tab", { name: "Semana" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Vista semana");
  });

  it("navega con flechas, Home y End (patrón ARIA)", async () => {
    render(<Tabs label="Vista de agenda" tabs={tabs} />);
    screen.getByRole("tab", { name: "Día" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Semana" })).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Por estación" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Día" })).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Por estación" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("accesibilidad (axe)", () => {
  it("no tiene violaciones en un formulario típico", async () => {
    const { container } = render(
      <main>
        <Card>
          <h2>Datos de la mascota</h2>
          <Badge tone="success">Confirmada</Badge>
          <Input label="Nombre" />
          <Input label="Peso (kg)" inputMode="decimal" error="Obligatorio" />
          <Select label="Especie">
            <option value="dog">Perro</option>
            <option value="cat">Gato</option>
          </Select>
          <Button>Guardar</Button>
        </Card>
        <Tabs
          label="Vista"
          tabs={[
            { id: "a", label: "A", content: <p>Panel A</p> },
            { id: "b", label: "B", content: <p>Panel B</p> },
          ]}
        />
      </main>,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

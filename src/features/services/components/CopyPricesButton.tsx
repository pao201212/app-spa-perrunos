"use client";

import { useActionState, useState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Dialog } from "@/components/ui";

import { copyServicePricesAction } from "../actions";

type Props = {
  slug: string;
  serviceId: string;
  locationId: string;
  locationName: string;
  others: number;
};

export function CopyPricesButton({ slug, serviceId, locationId, locationName, others }: Props) {
  const [state, action, pending] = useActionState(
    copyServicePricesAction.bind(null, slug, serviceId, locationId),
    initialFormState,
  );
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button variant="secondary" loading={pending} onClick={() => setOpen(true)}>
        Copiar a los demás locales
      </Button>
      <FormStatus state={state} />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="¿Copiar estos precios?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <form action={action} onSubmit={() => setOpen(false)}>
              <Button type="submit">Copiar</Button>
            </form>
          </>
        }
      >
        <p>
          Los precios de {locationName} (servicio y extras) reemplazarán los de {others}{" "}
          {others === 1 ? "local más" : "locales más"}.
        </p>
      </Dialog>
    </div>
  );
}

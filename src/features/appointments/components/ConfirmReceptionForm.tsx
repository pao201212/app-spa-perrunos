"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button } from "@/components/ui";

import { confirmReceptionAction } from "../actions";

export function ConfirmReceptionForm({
  slug,
  appointmentId,
  petNames,
}: {
  slug: string;
  appointmentId: string;
  petNames: string;
}) {
  const [state, action, pending] = useActionState(
    confirmReceptionAction.bind(null, slug, appointmentId),
    initialFormState,
  );
  return (
    <form action={action}>
      <Button type="submit" loading={pending}>
        Confirmar que el spa recibió a {petNames}
      </Button>
      <FormStatus state={state} />
    </form>
  );
}

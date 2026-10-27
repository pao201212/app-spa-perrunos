"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Input } from "@/components/ui";

import { createStaffAction, updateStaffAction } from "../actions";
import type { StaffDetail } from "../queries";
import { skillLabel, STAFF_SKILLS } from "../schema";
import styles from "./staff.module.css";

export function StaffForm({ slug, member }: { slug: string; member?: StaffDetail }) {
  const action = member
    ? updateStaffAction.bind(null, slug, member.id)
    : createStaffAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const hasSkill = (skill: string) => member?.staff_skills.some((s) => s.skill === skill) ?? false;

  return (
    <form action={formAction} className={formStyles.form} noValidate>
      <Input
        label="Nombre"
        name="name"
        required
        autoComplete="off"
        defaultValue={state.values?.name ?? member?.name ?? ""}
        error={state.fieldErrors?.name}
      />
      <fieldset
        className={styles.fieldset}
        aria-describedby={state.fieldErrors?.skills ? "skills-error" : undefined}
      >
        <legend className={styles.legend}>Habilidades</legend>
        <div className={styles.skills}>
          {STAFF_SKILLS.map((skill) => (
            <label key={skill} className={styles.checkbox}>
              <input type="checkbox" name="skills" value={skill} defaultChecked={hasSkill(skill)} />
              {skillLabel[skill]}
            </label>
          ))}
        </div>
        {state.fieldErrors?.skills && (
          <p id="skills-error" className={formStyles.error}>
            {state.fieldErrors.skills}
          </p>
        )}
      </fieldset>
      {member && (
        <label className={styles.checkbox}>
          <input type="checkbox" name="is_active" defaultChecked={member.is_active} />
          Activa (se le asignan citas)
        </label>
      )}
      <FormStatus state={state} />
      <Button type="submit" loading={pending}>
        {member ? "Guardar datos" : "Crear integrante"}
      </Button>
    </form>
  );
}

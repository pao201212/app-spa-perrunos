/** Estado que devuelven las Server Actions de formularios (useActionState). */
export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
  /** Valores enviados, para no perder lo escrito cuando hay errores. */
  values?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };

export function formValues(formData: FormData, fields: readonly string[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field, String(formData.get(field) ?? "")]));
}

export function fieldErrorsFrom(
  issues: { path: PropertyKey[]; message: string }[],
): FormState["fieldErrors"] {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0]);
    errors[field] ??= issue.message;
  }
  return errors;
}

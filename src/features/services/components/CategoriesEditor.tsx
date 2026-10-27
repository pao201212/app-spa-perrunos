"use client";

import { useActionState } from "react";

import { initialFormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Input } from "@/components/ui";

import { createCategoryAction, deleteCategoryAction } from "../actions";
import type { Category } from "../queries";
import styles from "./services.module.css";

export function CategoriesEditor({ slug, categories }: { slug: string; categories: Category[] }) {
  const [state, action, pending] = useActionState(
    createCategoryAction.bind(null, slug),
    initialFormState,
  );

  return (
    <div className={formStyles.form}>
      {categories.length > 0 && (
        <ul className={styles.list}>
          {categories.map((category) => (
            <li key={category.id} className={styles.row}>
              <strong className={styles.grow}>{category.name}</strong>
              <form action={deleteCategoryAction.bind(null, slug, category.id)}>
                <Button type="submit" variant="ghost">
                  Quitar<span className="visually-hidden"> categoría {category.name}</span>
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className={styles.inline} key={categories.length}>
        <Input
          label="Nueva categoría"
          name="name"
          placeholder="Higiene, Estilo…"
          error={state.fieldErrors?.name}
        />
        <Button type="submit" variant="ghost" loading={pending}>
          Agregar categoría
        </Button>
      </form>
      <FormStatus state={state} />
    </div>
  );
}

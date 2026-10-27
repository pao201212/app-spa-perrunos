"use client";

import { useActionState, useMemo, useState, type ChangeEvent } from "react";

import { initialFormState, type FormState } from "@/components/forms/form-state";
import formStyles from "@/components/forms/forms.module.css";
import { FormStatus } from "@/components/forms/FormStatus";
import { Button, Input, Select } from "@/components/ui";
import {
  COAT_TYPES,
  coatLabel,
  PET_SIZES,
  sizeLabel,
  SPECIES,
  speciesLabel,
  type Species,
} from "@/lib/pets/labels";

import { compressImage } from "../compress-image";
import type { BreedOption, OwnPet } from "../queries";
import styles from "./customers.module.css";

type Props = {
  /** Server Action ya enlazada (cliente o staff). */
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  breeds: BreedOption[];
  pet?: OwnPet;
  /** Solo staff: permite fijar talla y pelo a mano. */
  allowOverride?: boolean;
};

export function PetForm({ action, breeds, pet, allowOverride = false }: Props) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [species, setSpecies] = useState<Species>(
    (state.values?.species as Species) ?? pet?.species ?? "dog",
  );
  const [breedId, setBreedId] = useState(state.values?.breed_id ?? pet?.breed_id ?? "");
  const [locked, setLocked] = useState(pet?.size_locked ?? false);

  const options = useMemo(() => breeds.filter((b) => b.species === species), [breeds, species]);
  const isMixed = options.find((b) => b.id === breedId)?.is_mixed ?? false;
  const value = (field: string, fallback = "") => state.values?.[field] ?? fallback;

  // Las fotos de celular pesan varios MB: se reducen antes de enviarlas.
  async function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const smaller = await compressImage(file);
    if (smaller === file) return;
    const transfer = new DataTransfer();
    transfer.items.add(smaller);
    input.files = transfer.files;
  }

  return (
    <form action={formAction} className={formStyles.form} noValidate>
      <Input
        label="Nombre"
        name="name"
        required
        autoComplete="off"
        defaultValue={value("name", pet?.name)}
        error={state.fieldErrors?.name}
      />
      <div className={styles.grid2}>
        <Select
          label="Especie"
          name="species"
          value={species}
          onChange={(event) => {
            setSpecies(event.target.value as Species);
            setBreedId("");
          }}
        >
          {SPECIES.map((value) => (
            <option key={value} value={value}>
              {speciesLabel[value]}
            </option>
          ))}
        </Select>
        <Select
          label="Raza"
          name="breed_id"
          required
          value={breedId}
          onChange={(event) => setBreedId(event.target.value)}
          error={state.fieldErrors?.breed_id}
        >
          <option value="" disabled>
            Elige la raza
          </option>
          {options.map((breed) => (
            <option key={breed.id} value={breed.id}>
              {breed.name}
            </option>
          ))}
        </Select>
      </div>
      <div className={styles.grid2}>
        <Input
          label={isMixed ? "Peso (kg)" : "Peso (kg, opcional)"}
          name="weight_kg"
          inputMode="decimal"
          hint={
            isMixed ? "Con el peso calculamos la talla." : "Si lo indicas, la talla sale del peso."
          }
          defaultValue={value("weight_kg", pet?.weight_kg?.toString())}
          error={state.fieldErrors?.weight_kg}
        />
        {isMixed && (
          <Select
            label="Pelo"
            name="coat"
            defaultValue={value("coat", pet?.coat ?? "")}
            error={state.fieldErrors?.coat}
          >
            <option value="" disabled>
              Elige el tipo de pelo
            </option>
            {COAT_TYPES.map((coat) => (
              <option key={coat} value={coat}>
                {coatLabel[coat]}
              </option>
            ))}
          </Select>
        )}
        <Select label="Género" name="gender" defaultValue={value("gender", pet?.gender ?? "")}>
          <option value="">Prefiero no decir</option>
          <option value="female">Hembra</option>
          <option value="male">Macho</option>
        </Select>
      </div>

      {allowOverride && (
        <fieldset className={styles.override}>
          <legend className="visually-hidden">Talla y pelo manuales</legend>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              name="size_locked"
              checked={locked}
              onChange={(event) => setLocked(event.target.checked)}
            />
            Fijar talla y pelo a mano (ignora raza y peso)
          </label>
          {locked && (
            <div className={styles.grid2}>
              <Select label="Talla fija" name="locked_size" defaultValue={pet?.size ?? "M"}>
                {PET_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {sizeLabel[size]}
                  </option>
                ))}
              </Select>
              <Select label="Pelo fijo" name="locked_coat" defaultValue={pet?.coat ?? "short"}>
                {COAT_TYPES.map((coat) => (
                  <option key={coat} value={coat}>
                    {coatLabel[coat]}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </fieldset>
      )}

      <Input
        label="Foto"
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onPhotoChange}
        hint="Opcional. JPG, PNG o WebP."
        error={state.fieldErrors?.photo}
      />
      <FormStatus state={state} />
      <Button type="submit" size="lg" loading={pending}>
        Guardar mascota
      </Button>
    </form>
  );
}

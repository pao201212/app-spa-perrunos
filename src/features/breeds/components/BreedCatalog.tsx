"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge, Input, Select } from "@/components/ui";
import { coatLabel, sizeLabel, SPECIES, speciesLabel, type Species } from "@/lib/pets/labels";

import type { GlobalBreed } from "../queries";
import styles from "./breeds.module.css";

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function BreedCatalog({ breeds }: { breeds: GlobalBreed[] }) {
  const [query, setQuery] = useState("");
  const [species, setSpecies] = useState<Species | "all">("all");

  const visible = useMemo(() => {
    const term = normalize(query.trim());
    return breeds.filter(
      (breed) =>
        (species === "all" || breed.species === species) && normalize(breed.name).includes(term),
    );
  }, [breeds, query, species]);

  return (
    <div className={styles.catalog}>
      <div className={styles.filters}>
        <Input
          label="Buscar raza"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
        <Select
          label="Especie"
          value={species}
          onChange={(event) => setSpecies(event.target.value as Species | "all")}
        >
          <option value="all">Todas</option>
          {SPECIES.map((value) => (
            <option key={value} value={value}>
              {speciesLabel[value]}
            </option>
          ))}
        </Select>
      </div>

      <p className={styles.count} aria-live="polite">
        {visible.length} {visible.length === 1 ? "raza" : "razas"}
      </p>

      <ul className={styles.list}>
        {visible.map((breed) => (
          <li key={breed.id} className={styles.row}>
            <div className={styles.main}>
              <strong>{breed.name}</strong>
              <span className={styles.meta}>
                {speciesLabel[breed.species]} · {sizeLabel[breed.default_size]} ·{" "}
                {coatLabel[breed.default_coat]}
              </span>
            </div>
            {breed.is_mixed && <Badge tone="primary">Criollo</Badge>}
            <Link href={`/razas/${breed.id}`} className={styles.edit}>
              Editar
              <span className="visually-hidden"> {breed.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

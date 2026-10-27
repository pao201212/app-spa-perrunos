"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge, Input, Select } from "@/components/ui";
import { coatLabel, sizeLabel, SPECIES, speciesLabel, type Species } from "@/lib/pets/labels";
import { normalizeForSearch } from "@/lib/text";

import type { TenantBreed } from "../queries";
import styles from "./pet-catalog.module.css";

export function TenantBreedList({ breeds }: { breeds: TenantBreed[] }) {
  const [query, setQuery] = useState("");
  const [species, setSpecies] = useState<Species | "all">("all");

  const visible = useMemo(() => {
    const term = normalizeForSearch(query.trim());
    return breeds.filter(
      (breed) =>
        (species === "all" || breed.species === species) &&
        normalizeForSearch(breed.name).includes(term),
    );
  }, [breeds, query, species]);

  return (
    <div className={styles.catalog}>
      <div className={styles.filters}>
        <Input
          label="Buscar raza"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          label="Especie"
          value={species}
          onChange={(e) => setSpecies(e.target.value as Species | "all")}
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
                {speciesLabel[breed.species]} · {sizeLabel[breed.size]} · {coatLabel[breed.coat]}
              </span>
            </div>
            <span className={styles.badges}>
              {breed.is_mixed && <Badge tone="primary">Criollo</Badge>}
              {!breed.global_breed_id && <Badge tone="primary">Propia</Badge>}
              {breed.global_breed_id && breed.is_customized && (
                <Badge tone="warning">Ajustada</Badge>
              )}
              {!breed.is_active && <Badge tone="neutral">Oculta</Badge>}
            </span>
            <Link href={`/admin/razas/${breed.id}`} className={styles.edit}>
              Editar<span className="visually-hidden"> {breed.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

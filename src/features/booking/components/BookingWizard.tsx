"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button, buttonClassName, Card, Input } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { longDate } from "@/lib/dates";
import { formatCop } from "@/lib/money";
import { coatLabel, sizeLabel } from "@/lib/pets/labels";

import { bookAction, loadSlotsAction, type BookResult, type Slot } from "../actions";
import {
  chooseService,
  emptySelection,
  extrasFor,
  optionsFor,
  quote,
  servicesFor,
  type BookingCatalog,
  type BookingPet,
  type PetSelection,
} from "../pricing";
import styles from "./booking.module.css";

const STEPS = ["Mascotas", "Servicios", "Local", "Hora", "Resumen"] as const;

type Props = { slug: string; pets: BookingPet[]; catalog: BookingCatalog; today: string };

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

/**
 * Reserva en 5 pasos: mascota(s) → servicios → local → hora con entrega → resumen.
 * Los precios mostrados son orientativos; capacity.book confirma la hora y congela el total.
 */
export function BookingWizard({ slug, pets, catalog, today }: Props) {
  const [step, setStep] = useState(0);
  const [petIds, setPetIds] = useState<string[]>(pets.length === 1 ? [pets[0].id] : []);
  const [selections, setSelections] = useState<Record<string, PetSelection>>({});
  const [locationId, setLocationId] = useState<string | null>(
    catalog.locations.length === 1 ? catalog.locations[0].id : null,
  );
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsMessage, setSlotsMessage] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [bookError, setBookError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<BookResult, { ok: true }>["booking"] | null>(null);
  const [loadingSlots, startLoadingSlots] = useTransition();
  const [booking, startBooking] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Al cambiar de paso, el foco va al título para que lectores de pantalla anuncien el paso.
  useEffect(() => {
    if (step > 0 || result) headingRef.current?.focus();
  }, [step, result]);

  const chosenPets = pets.filter((pet) => petIds.includes(pet.id));
  const chosenSelections = chosenPets.map((pet) => selections[pet.id] ?? emptySelection(pet.id));
  const location = catalog.locations.find((l) => l.id === locationId);
  const currentQuote = location ? quote(catalog, location.id, chosenPets, chosenSelections) : null;
  const slot = slots?.find((s) => s.startsAt === startsAt);

  const canContinue = [
    chosenPets.length > 0,
    chosenSelections.every((s) => s.serviceId),
    !!currentQuote && currentQuote.missing.length === 0,
    !!slot,
    true,
  ][step];

  function loadSlots(forDate: string) {
    if (!locationId) return;
    setStartsAt(null);
    setSlotsMessage(null);
    startLoadingSlots(async () => {
      const response = await loadSlotsAction(slug, {
        locationId,
        date: forDate,
        selections: chosenSelections.map((s) => ({ ...s, serviceId: s.serviceId! })),
      });
      if (response.ok) setSlots(response.slots);
      else {
        setSlots([]);
        setSlotsMessage(response.message);
      }
    });
  }

  function next() {
    if (step === 2) loadSlots(date);
    setBookError(null);
    setStep(step + 1);
  }

  function confirm() {
    if (!locationId || !startsAt) return;
    setBookError(null);
    startBooking(async () => {
      const response = await bookAction(slug, {
        locationId,
        startsAt,
        selections: chosenSelections.map((s) => ({ ...s, serviceId: s.serviceId! })),
        notes,
      });
      if (response.ok) {
        setResult(response.booking);
        return;
      }
      setBookError(response.message);
      if (response.slotTaken) {
        setStep(3);
        loadSlots(date);
      }
    });
  }

  const updateSelection = (petId: string, change: (s: PetSelection) => PetSelection) =>
    setSelections((current) => ({
      ...current,
      [petId]: change(current[petId] ?? emptySelection(petId)),
    }));

  if (result) {
    return (
      <Card className={styles.wizard}>
        <h2 ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
          {result.pending ? "Reserva enviada" : "¡Reserva confirmada!"}
        </h2>
        <p role="status">
          {result.pending
            ? "El spa la confirmará pronto. Te avisaremos."
            : `Te esperamos el ${longDate(date)} a las ${slot?.time}.`}{" "}
          Entrega aprox. {result.ready}. Total {formatCop(result.total)}.
        </p>
        <p>
          Código de tu cita: <span className={styles.code}>{result.code}</span>
        </p>
        <Link href="/" className={buttonClassName({ variant: "ghost" })}>
          Volver al inicio
        </Link>
      </Card>
    );
  }

  return (
    <div className={styles.wizard}>
      <ol className={styles.progress} aria-hidden="true">
        {STEPS.map((name, index) => (
          <li key={name} className={cx(index <= step && styles.done)} />
        ))}
      </ol>
      <h2 ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
        <span className={styles.stepCount}>
          Paso {step + 1} de {STEPS.length}
        </span>
        {STEPS[step]}
      </h2>

      {step === 0 && (
        <PetsStep pets={pets} petIds={petIds} onToggle={(id) => setPetIds(toggle(petIds, id))} />
      )}

      {step === 1 &&
        chosenPets.map((pet) => (
          <ServicesStep
            key={pet.id}
            catalog={catalog}
            pet={pet}
            selection={selections[pet.id] ?? emptySelection(pet.id)}
            onChange={(change) => updateSelection(pet.id, change)}
          />
        ))}

      {step === 2 && (
        <fieldset className={styles.group}>
          <legend>¿En qué local?</legend>
          <div className={styles.choices}>
            {catalog.locations.map((l) => {
              const q = quote(catalog, l.id, chosenPets, chosenSelections);
              const unavailable = q.missing.length > 0;
              return (
                <label key={l.id} className={styles.choice}>
                  <input
                    type="radio"
                    name="location"
                    checked={locationId === l.id}
                    disabled={unavailable}
                    onChange={() => setLocationId(l.id)}
                  />
                  <span className={styles.choiceText}>
                    <strong>{l.name}</strong>
                    <span className={styles.muted}>
                      {unavailable ? `No ofrece: ${q.missing.join(", ")}` : l.address}
                    </span>
                  </span>
                  {!unavailable && <span className={styles.price}>{formatCop(q.total)}</span>}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {step === 3 && (
        <>
          <Input
            label="Día"
            type="date"
            value={date}
            min={today}
            max={addDays(today, location?.max_days_ahead ?? 30)}
            onChange={(event) => {
              setDate(event.target.value);
              if (event.target.value) loadSlots(event.target.value);
            }}
          />
          {bookError && (
            <p role="alert" className={styles.muted}>
              {bookError}
            </p>
          )}
          {loadingSlots ? (
            <p role="status">Buscando horas…</p>
          ) : slots && slots.length > 0 ? (
            <fieldset className={styles.group}>
              <legend>Horas disponibles el {longDate(date)}</legend>
              <div className={styles.slots}>
                {slots.map((s) => (
                  <label key={s.startsAt} className={styles.choice}>
                    <input
                      type="radio"
                      name="slot"
                      checked={startsAt === s.startsAt}
                      onChange={() => setStartsAt(s.startsAt)}
                    />
                    <span className={styles.choiceText}>
                      <strong>{s.time}</strong>
                      <span className={styles.muted}>entrega aprox. {s.ready}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <p role="status">
              {slotsMessage ?? "No hay horas disponibles este día. Prueba con otro día."}
            </p>
          )}
        </>
      )}

      {step === 4 && location && slot && currentQuote && (
        <Card className={styles.petCard}>
          <ul className={styles.summary}>
            <li className={styles.line}>
              <span>Local</span>
              <strong>{location.name}</strong>
            </li>
            <li className={styles.line}>
              <span>Llegada</span>
              <strong>
                {longDate(date)}, {slot.time}
              </strong>
            </li>
            <li className={styles.line}>
              <span>Entrega aprox.</span>
              <strong>{slot.ready}</strong>
            </li>
          </ul>
          {chosenPets.map((pet) => (
            <div key={pet.id}>
              <strong>{pet.name}</strong>
              <ul className={styles.summary}>
                {currentQuote.lines
                  .filter((line) => line.petId === pet.id)
                  .map((line) => (
                    <li key={line.name} className={styles.line}>
                      <span>{line.name}</span>
                      <span className={styles.price}>{formatCop(line.price)}</span>
                    </li>
                  ))}
                {optionsFor(catalog, selections[pet.id])
                  .filter((o) => selections[pet.id].options.includes(o.id))
                  .map((o) => (
                    <li key={o.id} className={styles.line}>
                      <span>{o.name}</span>
                      <span className={styles.muted}>Sin costo</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
          <p className={styles.total}>
            <span>Total</span>
            <span className={styles.price}>{formatCop(currentQuote.total)}</span>
          </p>
          <label className={styles.group}>
            <span>Notas para el spa (opcional)</span>
            <textarea
              className={styles.textarea}
              maxLength={500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          {bookError && <p role="alert">{bookError}</p>}
        </Card>
      )}

      <div className={styles.actions}>
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            Atrás
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <Button onClick={next} disabled={!canContinue}>
            Continuar
          </Button>
        ) : (
          <Button onClick={confirm} loading={booking} size="lg">
            Confirmar reserva
          </Button>
        )}
      </div>
    </div>
  );
}

function PetsStep({
  pets,
  petIds,
  onToggle,
}: {
  pets: BookingPet[];
  petIds: string[];
  onToggle: (id: string) => void;
}) {
  if (pets.length === 0) {
    return (
      <Card>
        <p>
          Primero registra a tu mascota. <Link href="/mascotas/nueva">Agregar mascota</Link>
        </p>
      </Card>
    );
  }
  return (
    <fieldset className={styles.group}>
      <legend>¿Quiénes vienen? Las que vienen juntas se atienden a la vez.</legend>
      <div className={styles.choices}>
        {pets.map((pet) => (
          <label key={pet.id} className={styles.choice}>
            <input
              type="checkbox"
              checked={petIds.includes(pet.id)}
              onChange={() => onToggle(pet.id)}
            />
            <span className={styles.choiceText}>
              <strong>{pet.name}</strong>
              <span className={styles.muted}>
                {sizeLabel[pet.size]} · pelo {coatLabel[pet.coat].toLowerCase()}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ServicesStep({
  catalog,
  pet,
  selection,
  onChange,
}: {
  catalog: BookingCatalog;
  pet: BookingPet;
  selection: PetSelection;
  onChange: (change: (s: PetSelection) => PetSelection) => void;
}) {
  const main = servicesFor(catalog, pet, ["bath", "other"]);
  const isBath = catalog.services.find((s) => s.id === selection.serviceId)?.kind === "bath";
  const cuts = isBath ? servicesFor(catalog, pet, ["special_cut"]) : [];
  const extras = extrasFor(catalog, pet, selection);
  const options = optionsFor(catalog, selection);
  const name = (field: string) => `${field}-${pet.id}`;

  return (
    <Card className={styles.petCard}>
      <h3>{pet.name}</h3>
      {main.length === 0 && (
        <p className={styles.muted}>Por ahora no hay servicios para su talla y pelo.</p>
      )}
      <fieldset className={styles.group}>
        <legend>Servicio para {pet.name}</legend>
        <div className={styles.choices}>
          {main.map((s) => (
            <label key={s.id} className={styles.choice}>
              <input
                type="radio"
                name={name("service")}
                checked={selection.serviceId === s.id}
                onChange={() => onChange((current) => chooseService(catalog, current, s.id))}
              />
              <span className={styles.choiceText}>
                <strong>{s.name}</strong>
                {s.description && <span className={styles.muted}>{s.description}</span>}
              </span>
              <span className={styles.price}>desde {formatCop(s.fromPrice)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {cuts.length > 0 && (
        <fieldset className={styles.group}>
          <legend>Corte especial (opcional)</legend>
          <div className={styles.choices}>
            <label className={styles.choice}>
              <input
                type="radio"
                name={name("cut")}
                checked={!selection.cutId}
                onChange={() => onChange((current) => ({ ...current, cutId: null }))}
              />
              <span className={styles.choiceText}>
                <strong>Sin corte especial</strong>
                <span className={styles.muted}>El baño incluye un corte básico</span>
              </span>
            </label>
            {cuts.map((s) => (
              <label key={s.id} className={styles.choice}>
                <input
                  type="radio"
                  name={name("cut")}
                  checked={selection.cutId === s.id}
                  onChange={() => onChange((current) => ({ ...current, cutId: s.id }))}
                />
                <span className={styles.choiceText}>
                  <strong>{s.name}</strong>
                </span>
                <span className={styles.price}>desde {formatCop(s.fromPrice)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {extras.length > 0 && (
        <fieldset className={styles.group}>
          <legend>Adicionales</legend>
          <div className={styles.choices}>
            {extras.map((e) => (
              <label key={e.id} className={styles.choice}>
                <input
                  type="checkbox"
                  checked={selection.extras.includes(e.id)}
                  onChange={() =>
                    onChange((current) => ({ ...current, extras: toggle(current.extras, e.id) }))
                  }
                />
                <span className={styles.choiceText}>
                  <strong>{e.name}</strong>
                </span>
                <span className={styles.price}>desde {formatCop(e.fromPrice)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {options.length > 0 && (
        <fieldset className={styles.group}>
          <legend>Opcionales sin costo</legend>
          <div className={styles.choices}>
            {options.map((o) => (
              <label key={o.id} className={styles.choice}>
                <input
                  type="checkbox"
                  checked={selection.options.includes(o.id)}
                  onChange={() =>
                    onChange((current) => ({ ...current, options: toggle(current.options, o.id) }))
                  }
                />
                <span className={styles.choiceText}>
                  <strong>{o.name}</strong>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </Card>
  );
}

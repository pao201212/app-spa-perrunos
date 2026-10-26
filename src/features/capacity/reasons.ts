import { longDate } from "@/lib/dates";
import {
  coatLabel,
  sizeLabel,
  speciesLabel,
  type CoatType,
  type PetSize,
  type Species,
} from "@/lib/pets/labels";
import { timeInZone } from "@/lib/timezone";

// Motivos de capacity.evaluate (docs/capacidad.md §2 y §3.4). Las reglas viven en SQL; aquí solo
// se traducen a texto para el admin.

export const REASON_CODES = [
  "PASADO",
  "MUY_LEJOS",
  "CERRADO",
  "SIN_PRECIO",
  "SIN_DURACION",
  "SIN_EMPLEADOS",
  "SIN_CAPACIDAD",
  "CUPO_LLENO",
  "SIN_ESPACIO",
  "FUERA_DE_HORARIO",
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

/** Motivos que el admin puede pasar por alto con sobrecupo (igual que capacity.overridable). */
export const OVERRIDABLE_CODES: readonly ReasonCode[] = [
  "PASADO",
  "SIN_EMPLEADOS",
  "SIN_CAPACIDAD",
  "CUPO_LLENO",
  "SIN_ESPACIO",
  "FUERA_DE_HORARIO",
];

export const isOverridable = (code: ReasonCode) => OVERRIDABLE_CODES.includes(code);

export const reasonLabel: Record<ReasonCode, string> = {
  PASADO: "Ya pasó",
  MUY_LEJOS: "Muy lejos",
  CERRADO: "Cerrado",
  SIN_PRECIO: "Sin precio",
  SIN_DURACION: "Sin duración",
  SIN_EMPLEADOS: "Sin empleados",
  SIN_CAPACIDAD: "Sin capacidad",
  CUPO_LLENO: "Cupo lleno",
  SIN_ESPACIO: "Sin espacio",
  FUERA_DE_HORARIO: "Fuera de horario",
};

type Fraction = { num: number; den: number };
type Detail = {
  max_date?: string;
  reason?: string | null;
  pet?: number;
  service?: string;
  extra?: string;
  species?: Species;
  size?: PetSize;
  coat?: CoatType;
  jornadas?: Fraction;
  remaining?: Fraction;
  needed?: Fraction;
  at?: string;
  present?: number;
  max?: number;
  ready_at?: string;
  closes_at?: string;
};

const GLYPHS: Record<string, string> = {
  "1/2": "½",
  "1/3": "⅓",
  "2/3": "⅔",
  "1/4": "¼",
  "3/4": "¾",
  "1/5": "⅕",
  "2/5": "⅖",
  "3/5": "⅗",
  "4/5": "⅘",
  "1/6": "⅙",
  "5/6": "⅚",
  "1/8": "⅛",
  "3/8": "⅜",
  "5/8": "⅝",
  "7/8": "⅞",
};

/** {num: 3, den: 2} → "1½"; {num: 1, den: 7} → "1/7". La fracción llega reducida desde SQL. */
export function formatFraction({ num, den }: Fraction): string {
  const whole = Math.floor(num / den);
  const rest = num % den;
  if (rest === 0) return String(whole);
  const part = GLYPHS[`${rest}/${den}`] ?? `${rest}/${den}`;
  return whole > 0 ? `${whole}${part.length > 1 ? ` ${part}` : part}` : part;
}

/** ⅙ de jornada · 1 jornada · 1½ jornadas */
const jornadas = (f: Fraction) =>
  f.num < f.den
    ? `${formatFraction(f)} de jornada`
    : `${formatFraction(f)} ${f.num === f.den ? "jornada" : "jornadas"}`;
const pets = (n: number) => `${n} ${n === 1 ? "mascota" : "mascotas"}`;

/** Texto del motivo para el admin, p. ej. "A las 10:00 ya hay 6 mascotas (máximo 6)". */
export function reasonMessage(code: ReasonCode, detail: unknown, timeZone: string): string {
  const d = (detail ?? {}) as Detail;
  const time = (iso: string) => timeInZone(iso, timeZone);
  switch (code) {
    case "PASADO":
      return "Este horario ya pasó";
    case "MUY_LEJOS":
      return d.max_date ? `Solo se reserva hasta el ${longDate(d.max_date)}` : "Fecha muy lejana";
    case "CERRADO":
      return d.reason ? `El local cierra este día (${d.reason})` : "El local no abre este día";
    case "SIN_PRECIO":
      return `${d.service ?? d.extra} no tiene precio en este local para esa talla y pelo`;
    case "SIN_DURACION":
      return `${d.service} no tiene duración para esa talla y pelo (Servicios → Duraciones)`;
    case "SIN_EMPLEADOS":
      return "Ese día nadie que bañe tiene turno en este local (Personal → Turnos)";
    case "SIN_CAPACIDAD":
      return d.species && d.size && d.coat
        ? `${speciesLabel[d.species]} ${sizeLabel[d.size]} de pelo ${coatLabel[d.coat].toLowerCase()} no se atiende en este local`
        : "Esa combinación no se atiende en este local";
    case "CUPO_LLENO":
      return d.remaining && d.needed
        ? d.remaining.num === 0
          ? `Día lleno: no queda cupo en ${jornadas(d.jornadas ?? { num: 0, den: 1 })}`
          : `Quedan ${jornadas(d.remaining)} y se necesita ${formatFraction(d.needed)}`
        : "No queda cupo ese día";
    case "SIN_ESPACIO":
      return d.at
        ? `A las ${time(d.at)} ya hay ${pets(d.present ?? 0)} (máximo ${d.max})`
        : "El local está lleno a esa hora";
    case "FUERA_DE_HORARIO":
      return d.ready_at && d.closes_at
        ? `Entregaría ${time(d.ready_at)} y el local cierra ${time(d.closes_at)}`
        : "Terminaría después del cierre";
  }
}

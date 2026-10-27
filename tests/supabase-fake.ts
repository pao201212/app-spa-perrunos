import { vi } from "vitest";

export type Result = { data: unknown; error: unknown; count?: number | null };
type Op = { method: string; args: unknown[] };
/** Resultado fijo o calculado según las operaciones encadenadas (insert, update, eq…). */
type TableResult = Result | ((ops: Op[]) => Result);

/**
 * Cliente de Supabase simulado para pruebas unitarias de acciones, consultas y páginas: cada tabla
 * y cada RPC devuelve el resultado indicado, y se registran las llamadas encadenadas.
 */
export function fakeSupabase({
  tables = {},
  rpcs = {},
  user = null,
  dataset = {},
  writeError = null,
  rpcError = null,
}: {
  tables?: Record<string, TableResult>;
  rpcs?: Record<string, Result>;
  user?: { id: string; email?: string } | null;
  /** Filas por tabla: con single/maybeSingle se devuelve la primera; con `count`, el total. */
  dataset?: Record<string, unknown[]>;
  /** Error de toda escritura (insert, update, upsert, delete), p. ej. { code: "23505" }. */
  writeError?: { code?: string; message?: string } | null;
  /** Error de toda RPC sin resultado definido en `rpcs`. */
  rpcError?: { code?: string; message?: string; hint?: string } | null;
} = {}) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const chain = (table: string, ops: Op[]): unknown =>
    new Proxy(
      {},
      {
        get(_, method) {
          if (method === "then") {
            const entry = tables[table];
            const result =
              typeof entry === "function"
                ? entry(ops)
                : (entry ??
                  (writeError && WRITES.some((w) => has(ops, w))
                    ? { data: null, error: writeError }
                    : fromDataset(dataset[table] ?? [], ops)));
            return (resolve: (value: Result) => unknown) => resolve(result);
          }
          return (...args: unknown[]) => {
            calls.push({ table, method: String(method), args });
            return chain(table, [...ops, { method: String(method), args }]);
          };
        },
      },
    );
  const storageBucket = {
    upload: vi.fn(async () => ({ data: { path: "p" }, error: null })),
    remove: vi.fn(async () => ({ data: [], error: null })),
    createSignedUrls: vi.fn(async (paths: string[]) => ({
      data: paths.map((path) => ({ path, signedUrl: `https://signed/${path}` })),
      error: null,
    })),
  };
  const client = {
    from: vi.fn((table: string) => chain(table, [])),
    rpc: vi.fn(async (name: string) => rpcs[name] ?? { data: null, error: rpcError }),
    auth: {
      getUser: vi.fn(async () => ({ data: { user }, error: null })),
      signInWithOAuth: vi.fn(async () => ({
        data: { url: "https://accounts.google.com/o" },
        error: null,
      })),
      signOut: vi.fn(async () => ({ error: null })),
      exchangeCodeForSession: vi.fn(async () => ({ data: {}, error: null })),
    },
    storage: { from: vi.fn(() => storageBucket) },
  };
  return { client, calls, storageBucket };
}

const WRITES = ["insert", "update", "upsert", "delete"];

function fromDataset(rows: unknown[], ops: Op[]): Result {
  const count = ops.some(
    (op) => op.method === "select" && (op.args[1] as { count?: string } | undefined)?.count,
  );
  if (count) return { data: null, error: null, count: rows.length };
  if (has(ops, "single") || has(ops, "maybeSingle")) return { data: rows[0] ?? null, error: null };
  return { data: rows, error: null };
}

/** Las operaciones incluyen `method` (p. ej. insert, update, delete, select). */
export const has = (ops: Op[], method: string) => ops.some((op) => op.method === method);

import { vi } from "vitest";

type Result = { data: unknown; error: unknown };

/**
 * Cliente de Supabase simulado para pruebas unitarias de acciones y consultas: cada tabla y cada
 * RPC devuelve el resultado indicado, y se registran las llamadas encadenadas (select, eq, in…).
 */
export function fakeSupabase({
  tables = {},
  rpcs = {},
}: {
  tables?: Record<string, Result>;
  rpcs?: Record<string, Result>;
} = {}) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const chain = (table: string): unknown =>
    new Proxy(
      {},
      {
        get(_, method) {
          if (method === "then") {
            const result = tables[table] ?? { data: [], error: null };
            return (resolve: (value: Result) => unknown) => resolve(result);
          }
          return (...args: unknown[]) => {
            calls.push({ table, method: String(method), args });
            return chain(table);
          };
        },
      },
    );
  const client = {
    from: vi.fn((table: string) => chain(table)),
    rpc: vi.fn(async (name: string) => rpcs[name] ?? { data: null, error: null }),
  };
  return { client, calls };
}

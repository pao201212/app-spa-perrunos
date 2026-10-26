import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminClient,
  asRole,
  createTestUser,
  deleteTestUsers,
  sqlClient,
  uniqueSuffix,
  type TestUser,
} from "./helpers";

// BLOQUEANTE EN CI (SPEC §9): aislamiento entre spas para TODAS las tablas, presentes y futuras.

const sql = sqlClient();
const admin = adminClient();
const suffix = uniqueSuffix();

/** Tablas sin tenant_id por diseño: datos de plataforma. Agregar aquí requiere justificarlo. */
const PLATFORM_TABLES = new Set(["tenants", "platform_admins", "global_breeds"]);

/**
 * Tablas por tenant con lectura pública (lo que el cliente ve al reservar). Se excluyen de las pruebas
 * de lectura, pero siguen sujetas a las de escritura. Agregar aquí requiere justificarlo.
 */
const PUBLIC_TENANT_TABLES = new Set([
  "locations",
  "location_hours",
  "location_closures",
  "tenant_breeds",
  "size_thresholds",
]);

let tenantA: string;
let tenantB: string;
let staffA: TestUser;
let staffB: TestUser;
let customer: TestUser;
let tenantTables: string[];

beforeAll(async () => {
  const { data, error } = await admin
    .from("tenants")
    .insert([
      { slug: `iso-a-${suffix}`, name: "Aislamiento A", is_active: true },
      { slug: `iso-b-${suffix}`, name: "Aislamiento B", is_active: true },
    ])
    .select("id, slug");
  if (error) throw error;
  tenantA = data.find((t) => t.slug.startsWith("iso-a"))!.id;
  tenantB = data.find((t) => t.slug.startsWith("iso-b"))!.id;

  [staffA, staffB, customer] = await Promise.all([
    createTestUser("staff-a"),
    createTestUser("staff-b"),
    createTestUser("cliente"),
  ]);
  const { error: mError } = await admin.from("memberships").insert([
    { tenant_id: tenantA, user_id: staffA.id, role: "admin" },
    { tenant_id: tenantB, user_id: staffB.id, role: "admin" },
  ]);
  if (mError) throw mError;
  await seedTenantData(tenantA);
  await seedTenantData(tenantB);

  const rows = await sql<{ table_name: string }[]>`
    select c.table_name from information_schema.columns c
    join information_schema.tables t using (table_schema, table_name)
    where c.table_schema = 'public' and c.column_name = 'tenant_id' and t.table_type = 'BASE TABLE'
    order by 1`;
  tenantTables = rows.map((r) => r.table_name);
});

/** Al menos una fila por tabla con tenant_id, para que las pruebas genéricas tengan qué filtrar. */
async function seedTenantData(tenantId: string) {
  const { data: location, error } = await admin
    .from("locations")
    .insert({ tenant_id: tenantId, name: "Sede aislamiento" })
    .select("id")
    .single();
  if (error) throw error;
  const base = { tenant_id: tenantId, location_id: location.id };
  for (const [table, row] of [
    ["location_stations", { ...base, station: "bath", count: 1 }],
    ["location_hours", { ...base, weekday: 1, opens_at: "08:00", closes_at: "12:00" }],
    ["location_closures", { ...base, date: "2026-12-25" }],
    ["tenant_invites", { tenant_id: tenantId, email: `invitado-${tenantId}@test.prismalab.local` }],
  ] as const) {
    const { error: insertError } = await admin.from(table).insert(row);
    if (insertError) throw insertError;
  }
}

afterAll(async () => {
  await admin
    .from("tenants")
    .delete()
    .in("slug", [`iso-a-${suffix}`, `iso-b-${suffix}`]);
  await deleteTestUsers([staffA, staffB, customer].filter(Boolean));
  await sql.end();
});

describe("contrato de esquema", () => {
  it("todas las tablas de public tienen RLS activado", async () => {
    const rows = await sql<{ relname: string }[]>`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`;
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it("toda tabla de public tiene tenant_id, salvo las de plataforma declaradas", async () => {
    const rows = await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'`;
    const missing = rows
      .map((r) => r.table_name)
      .filter((t) => !PLATFORM_TABLES.has(t) && !tenantTables.includes(t));
    expect(missing).toEqual([]);
  });

  it("hay al menos una tabla por tenant para verificar", () => {
    expect(tenantTables).toContain("memberships");
  });
});

describe("aislamiento por tenant (todas las tablas con tenant_id)", () => {
  it("el staff de A no ve filas internas de B", async () => {
    const leaks = await asRole(sql, { role: "authenticated", sub: staffA.id }, async (tx) => {
      const found: string[] = [];
      for (const table of tenantTables.filter((t) => !PUBLIC_TENANT_TABLES.has(t))) {
        const [{ count }] = await tx.unsafe(
          `select count(*)::int as count from public.${table} where tenant_id = $1`,
          [tenantB],
        );
        if (count > 0) found.push(`${table}: ${count}`);
      }
      return found;
    });
    expect(leaks).toEqual([]);
  });

  it("el staff de A no puede modificar ni borrar filas de B en ninguna tabla", async () => {
    const touched = await asRole(sql, { role: "authenticated", sub: staffA.id }, async (tx) => {
      const found: string[] = [];
      for (const table of tenantTables) {
        const updated = await tx.unsafe(
          `update public.${table} set tenant_id = tenant_id where tenant_id = $1 returning 1`,
          [tenantB],
        );
        const deleted = await tx.unsafe(
          `delete from public.${table} where tenant_id = $1 returning 1`,
          [tenantB],
        );
        if (updated.length + deleted.length > 0)
          found.push(`${table}: ${updated.length}/${deleted.length}`);
      }
      return found;
    }).catch((error: Error) => [`error inesperado: ${error.message}`]);
    expect(touched).toEqual([]);
  });

  it("todas las tablas por tenant tienen filas en A y B (la prueba no es trivial)", async () => {
    const empty: string[] = [];
    for (const table of tenantTables) {
      const [{ count }] = await sql.unsafe(
        `select count(distinct tenant_id)::int as count from public.${table} where tenant_id in ($1, $2)`,
        [tenantA, tenantB],
      );
      if (count < 2) empty.push(table);
    }
    expect(empty).toEqual([]);
  });

  it("un cliente sin membresías no ve filas de ningún spa en tablas internas", async () => {
    const leaks = await asRole(sql, { role: "authenticated", sub: customer.id }, async (tx) => {
      const found: string[] = [];
      for (const table of tenantTables.filter((t) => !PUBLIC_TENANT_TABLES.has(t))) {
        const [{ count }] = await tx.unsafe(
          `select count(*)::int as count from public.${table} where tenant_id in ($1, $2)`,
          [tenantA, tenantB],
        );
        if (count > 0) found.push(`${table}: ${count}`);
      }
      return found;
    });
    // Excepción futura: tablas de catálogo público (servicios, precios…) se declararán explícitamente.
    expect(leaks).toEqual([]);
  });
});

describe("anti-escalada de roles (trigger, defensa en profundidad)", () => {
  it("aunque exista una política permisiva por error, un usuario normal no puede darse membresías", async () => {
    const attempt = asRole(sql, { role: "authenticated", sub: customer.id }, async (tx) => {
      await tx.unsafe(`reset role`);
      await tx.unsafe(
        `create policy "permisiva_por_error" on public.memberships for insert to authenticated with check (true)`,
      );
      await tx.unsafe(`set local role authenticated`);
      await tx`insert into public.memberships (tenant_id, user_id, role) values (${tenantA}, ${customer.id}, 'admin')`;
    });
    await expect(attempt).rejects.toThrow(/super admin/i);
  });

  it("aunque exista una política permisiva por error, nadie se convierte en super admin desde la API", async () => {
    const attempt = asRole(sql, { role: "authenticated", sub: customer.id }, async (tx) => {
      await tx.unsafe(`reset role`);
      await tx.unsafe(
        `create policy "permisiva_por_error" on public.platform_admins for insert to authenticated with check (true)`,
      );
      await tx.unsafe(`grant insert on public.platform_admins to authenticated`);
      await tx.unsafe(`set local role authenticated`);
      await tx`insert into public.platform_admins (user_id) values (${customer.id})`;
    });
    await expect(attempt).rejects.toThrow(/secret key/i);
  });

  it("el staff de un spa no puede cambiar su propio rol", async () => {
    const attempt = asRole(sql, { role: "authenticated", sub: staffA.id }, async (tx) => {
      await tx.unsafe(`reset role`);
      await tx.unsafe(
        `create policy "permisiva_por_error" on public.memberships for update to authenticated using (true)`,
      );
      await tx.unsafe(`set local role authenticated`);
      await tx`update public.memberships set role = 'owner' where user_id = ${staffA.id}`;
    });
    await expect(attempt).rejects.toThrow(/super admin/i);
  });

  it("la secret key (service_role) sí puede gestionar super admins", async () => {
    const { error } = await admin.from("platform_admins").insert({ user_id: customer.id });
    expect(error).toBeNull();
    await admin.from("platform_admins").delete().eq("user_id", customer.id);
  });
});

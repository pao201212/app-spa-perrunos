# Spec: Plataforma White-Label Multi-Tenant para Pet Spas

> Estado: **APROBADO v3** (2026-10-25)
> Primer tenant: **Spa Perrunos y Gatunos** (`spaperrunosygatunos`)
> Base de referencia: repo legado `PetSpa-main` (React + Vite + Supabase, mono-tenant)
> Fecha: 2026-10-25

---

## 0. Decisiones

### Confirmadas por Prisma Lab
| # | Decisión |
|---|---|
| D1 | **Multi-tenant, 1 BD, 1 proyecto Vercel.** Cada spa se identifica por subdominio `{slug}.prismalab.com.co`, sin `www.` |
| D2 | **Next.js + Supabase**, zona horaria `America/Bogota`, moneda **COP**, interfaz en **es-CO** |
| D3 | Tenant → **Locales** (1..N) → **Estaciones** (tinas y mesas, una por una, D27), configurables por local |
| D4 | Cada local configura su horario, estaciones, modo de confirmación (por defecto **confirmada**), ventana de cancelación (por defecto **4 h**) y reserva máxima (por defecto **30 días**, sin anticipación mínima). Hay un botón **"aplicar a todos los locales"** |
| D5 | **Personal** con habilidades (baña, seca, corta, corte especial), locales asignados y horario semanal propio. El cliente **no** elige al personal |
| D6 | El **Baño** es el servicio principal, con 3 etapas: **baño → secado → detalles** (D25). El secado empieza **justo** al terminar el baño; los detalles **pueden esperar** (la mascota sigue en su mesa). El **corte especial** lo hace el groomer y es un servicio adicional. Hay **extras** (subservicios) |
| D7 | La **duración** depende de **tamaño × pelo**, es igual en todos los locales y es **por tenant** |
| D8 | El **precio** depende de **local × servicio × tamaño × pelo** |
| D9 | **Razas:** hay un catálogo global de Prisma Lab y cada spa ajusta el tamaño o el pelo. Se pide **raza + peso**; el peso puede reasignar el tamaño. Para criollos, el cliente elige pelo y peso |
| D10 | El admin marca **mascotas que se bañan juntas** (hermanas, del mismo dueño) |
| D11 | Cada local decide si **quien baña continúa con el secado** o pasa a otro baño |
| D12 | **Login solo con Google** para todos los roles. Un login central redirige según el rol: super admin → consola; admin → panel de su spa; cliente → su spa |
| D13 | El cliente da su **WhatsApp**. El admin puede inscribir clientes con **correo + WhatsApp**; al entrar después con Google usando ese correo, la cuenta se **vincula** sola |
| D14 | **Convenios:** precios especiales por cliente, sobre todo en el baño, pero aplicables a cualquier servicio |
| D15 | **Pagos (sin cobro en línea):** se registra el método (efectivo, Nequi, Daviplata, Bre-B o datáfono) y, si es digital, una **evidencia** adjunta. **Sin pagos parciales.** Apple Pay y otros, en la v2 |
| D16 | Roles internos del spa (dueño, recepción) en la v2, pero el esquema de roles queda listo desde la v1 |
| D17 | Temas en el **repo** (`tenants/{slug}/`) |
| D18 | El **corte especial es un servicio adicional** al baño: se hace **después** de los detalles, en la misma mesa (D27); no los reemplaza |
| D19 | **Convenio = precio fijo por servicio**, y puede cubrir **varias mascotas** del cliente juntas (p. ej., 3 mascotas → $X en total) |
| D20 | Las **mascotas que se bañan juntas** necesitan **1 persona por mascota** en baño y en secado (2 mascotas = 2 personas en cada etapa) |
| D21 | **No se migran** datos del legado |
| D22 | **Sin licencia de Achiko:** se reemplaza por **Fredoka** (Google Fonts, licencia OFL; era la fuente de respaldo del legado). Los logos quedan en **PNG** (no hay SVG) |
| D23 | Las mascotas que se bañan juntas **comparten 1 tina**, pero **cada una tiene su propia mesa de secado**. Al terminar el baño deben estar libres **todas** las mesas que necesita el grupo |
| D25 | (2026-10-26) **La mesa de secado es la misma de los detalles.** Estaciones: **tina** (baño), **mesa** (secado → detalles, sin cambiar de mesa) y **estación de corte** (corte especial del groomer). La etapa "terminado" se llama **detalles**: limpiar orejas, cortar uñas, corte higiénico, perfume, tijera en patas, etc. |
| D27 | (2026-10-26) **Solo hay dos tipos de estación: tina y mesa.** Cada estación se registra una por una (nombre, tipo). La tina sirve para el baño; la mesa para secado y detalles, y el admin marca las mesas que **también sirven para corte especial**. El corte especial se hace **en la misma mesa** de los detalles: una mascota con corte necesita, desde el secado, una mesa marcada para corte. Reemplaza la "estación de corte" de D25 |
| D28 | (2026-10-26) **Dos modos de capacidad por local: simple y avanzada.** La **simple** (por defecto) reemplaza el cupo fijo por talla de D24: el admin indica cuántas mascotas de cada talla atiende **un empleado** en un día y cuántos empleados hay cada día de la semana (con cambios por fecha). Cada mascota usa 1/N de una jornada; el día tiene tantas jornadas como empleados. La **avanzada** es el motor por etapas (§5.1–5.2) y solo se activa si el local tiene estaciones, personal con habilidades y turnos, y duraciones. `capacity_mode` pasa a `enum('simple','advanced')` default `'simple'` |
| D29 | (2026-10-26) En **los dos modos** el cliente ve las **horas disponibles** con su **hora de entrega**. En la capacidad simple la entrega es **aproximada** (llegada + duración del servicio según talla y pelo, sin contar el almuerzo) y no se ofrecen horas cuya entrega quedaría después del cierre |
| D26 | (2026-10-26) **Opcionales sin costo del baño:** el admin crea y quita opcionales por servicio (p. ej. corte higiénico, shampoo especial) e indica si se hacen en la etapa de **baño** o de **detalles**. Al reservar un baño, el cliente llena el listado de opcionales. No cambian el precio |
| D30 | (2026-10-26) **Entrega 1 solo habilita la capacidad simple.** La avanzada (§5.2) aparece en Locales → Capacidad como **"Próximamente"** y se definirá con el spa. Ya decidido para ella: tras el secado la mascota baja a un **área de descanso** y la mesa se libera; espera máx. **30 min** para detalles; primera persona libre; a veces **2 personas secan** a una mascota; el groomer normalmente no hace detalles |
| D31 | (2026-10-26) **Capacidad por empleado por especie × talla × pelo**, configurada por el admin en cada local. Una combinación vacía no se ofrece en ese local (`SIN_CAPACIDAD`) |
| D32 | (2026-10-26) **Las jornadas del día salen del módulo Personal** (reemplaza los empleados escritos a mano de D28): cada empleado con habilidad `bath`, con turno ese día en el local, aporta `horas de turno (menos ausencias) / horas que abre el local`, máximo 1 |
| D33 | (2026-10-26) **Zonas de espera por local** (nombre, puestos; puede no tener). A ninguna hora puede haber más mascotas en el local (de la llegada a la entrega aproximada) que empleados `bath` en turno a esa hora + puestos de las zonas (`SIN_ESPACIO`). Los servicios solos (sin baño) no usan cupo ni espacio. Baño + corte especial cuenta como 1 baño de su talla |
| D24 | **Toda la lógica de capacidad vive en un único lugar**, parametrizada en tablas, explicable y fácil de revisar con los dueños de los spas (§5). Debe permitir cambiar, por local, a un modelo simple (ver D28, que reemplaza el cupo fijo local × talla × día) |

### Supuestos (corrígelos antes de aprobar)
| # | Supuesto |
|---|---|
| S1 | El **corte especial** se hace en una mesa marcada para corte especial (D27) y requiere personal con la habilidad `special_cut`. Su duración depende de talla × pelo y puede esperar turno después de los detalles |
| S2 | Los **extras** no añaden tiempo por defecto; opcionalmente pueden sumar minutos a la etapa de detalles |
| S4 | **Toda etapa requiere personal.** El personal atiende una sola mascota a la vez |
| S6 | El **cliente es por tenant**: la misma cuenta Google puede ser cliente de dos spas distintos, con perfiles separados |
| S7 | La **lealtad** (puntos + tarjeta de 10 baños, como en el legado) es **por tenant** y se comparte entre locales |

---

## 1. Hallazgos del repo legado (`PetSpa-main`)

### ✅ Se reutiliza
- **Marca de Spa Perrunos y Gatunos:** `logo-principal.png` (ilustración sobre azul rey), `logo-claro.png` (texto amarillo y azul, para fondos claros), `logo-oscuro.png` (texto amarillo y blanco, para fondos oscuros), Manrope y Plus Jakarta Sans para textos (Achiko se descarta por licencia, D22), y los colores `#4DAAF8` (azul), `#F8DB52` (amarillo) y `#2744C8` (azul rey del fondo).
- **Catálogo de ~150 razas** (perro y gato) con tamaño y pelo: será la semilla del catálogo global.
- **Tallas XS–XXL** con umbrales de peso por especie (perro: 5/10/20/30/40/100 kg; gato: 2/4/6/8/10 kg) y **pelo** corto, mediano o largo.
- **Flujo de estados:** Agendado → Recibido → Atendiendo → Listo → Entregado, más Cancelado. Al recibir la mascota, el cliente **confirma la recepción**.
- **Patrones de producto:** categorías de servicio (Higiene, Estilo…), extras por servicio, registro de cliente invitado con vinculación posterior por correo, pago con foto o pantallazo del comprobante, ingresos del día en la agenda, censo de mascotas, días de cierre y lealtad (puntos por COP gastado, servicios canjeables con su costo en puntos y tarjeta de 10 baños = 1 gratis).
- **Seguridad que vale la pena conservar:** trigger anti-escalada de rol, límite de reservas (5 en 5 min y máximo 10 activas por cliente) y `SET search_path` en las funciones `SECURITY DEFINER`.
- **Patrones de UI:** bottom nav móvil (Agenda / Mascotas / Puntos / Perfil para el cliente; Agenda / Mascotas / Servicios / Ajustes para el admin) y wizard de reserva (mascota → servicios → día → hora).

### 🚫 No se replica (defectos encontrados)
| Problema en el legado | Riesgo | En la v3 |
|---|---|---|
| La disponibilidad se calcula **en el navegador** leyendo `reservations`, pero RLS solo le deja ver **sus propias** citas al cliente | **Doble reserva:** el cliente ve como libres horarios ya ocupados por otros | Función SQL transaccional con bloqueo (§5) |
| 1 cita por franja fija, sin estaciones, personal ni duración | No modela la operación real | Motor por etapas, estaciones y personal |
| Bucket `petspa-storage` **público**, y cualquier usuario autenticado puede borrar o sobrescribir **cualquier** archivo | Los comprobantes de pago quedan expuestos y son manipulables | Bucket privado, rutas `{tenant}/{appointment}/`, URLs firmadas y RLS por rol |
| Precios en **18 columnas** (`price_xs_corto`…) | Rígido; no soporta locales | Tabla de tarifas normalizada |
| **226 colores hex** hardcodeados en `App.tsx`; marca repartida entre `index.html`, `branding.ts`, `branding.css` e `index.css` | No es white-label real | Un solo `theme.css` por tenant, con lint que lo obliga |
| Un `App.tsx` de 4.865 líneas, `session: any` | Inmantenible | Features modulares y tipos estrictos |
| Login con email y contraseña; el admin se eleva editando la tabla a mano | Fricción y riesgo operativo | Google OAuth; roles asignados desde la consola |
| `Toast`/`alert`, sin tests | Regresiones silenciosas | Suite de tests (§9) |

---

## 2. Objetivo y alcance

Construir una plataforma SaaS **mobile-first** para pet spas sobre **un solo despliegue y una sola BD**. Cada spa tiene subdominio propio, datos aislados, varios locales y su identidad visual **solo en su `theme.css`**.

### Usuarios
- **Cliente:** entra con Google, registra sus mascotas y reserva desde el celular.
- **Admin del spa:** opera la agenda y configura locales, estaciones, personal, servicios, precios y clientes.
- **Super admin (Prisma Lab):** crea tenants, asigna admins y mantiene el catálogo global de razas.

### Mapa de capacidades y entregas

| Módulo id | Responsabilidad | Depende de | Entrega |
|---|---|---|---|
| `tenancy` | `tenants`, subdominio → tenant, contexto en el servidor | — | 1 |
| `theming` | Contrato de tokens, carga del `theme.css` del tenant, UI base | `tenancy` | 1 |
| `auth` | Google OAuth, cookie en `.prismalab.com.co`, membresías, super admin, redirección por rol | `tenancy` | 1 |
| `platform-console` | CRUD de tenants, asignar admins, catálogo global de razas | `auth` | 1 |
| `locations` | Locales, estaciones, horarios, cierres, ajustes por local + "aplicar a todos" | `auth` | 1 |
| `staff` | Personal, habilidades, locales y turnos semanales, ausencias | `locations` | 1 |
| `pet-catalog` | Razas (global + ajustes del tenant), tallas por peso y tipos de pelo | `auth` | 1 |
| `customers` | Clientes, mascotas, alta por el admin, vinculación con Google, grupos "se bañan juntas" | `pet-catalog` | 1 |
| `services` | Servicios, categorías, etapas, extras, duración por talla×pelo, precio por local×talla×pelo | `locations`, `pet-catalog` | 1 |
| `capacity` | Motor de disponibilidad (estaciones + personal + etapas) | `staff`, `services` | 1 |
| `booking` | Wizard del cliente, cita del admin, agenda, estados, confirmación de recepción | `capacity`, `customers` | 1 |
| `agreements` | Convenios por cliente (fijo o %) | `services`, `customers` | 2 |
| `self-service` | El cliente cancela o reprograma dentro de la ventana del local | `booking` | 2 |
| `payments` | Registro de pago al entregar y evidencia en storage privado | `booking` | 2 |
| `loyalty` | Puntos por COP, servicios canjeables y tarjeta de baños | `payments` | 2 |

Orden de construcción, **Entrega 1:** `tenancy` → `theming`, `auth` → `platform-console`, `locations`, `pet-catalog` → `staff`, `customers`, `services` → `capacity` → `booking`

Orden de construcción, **Entrega 2:** `agreements`, `self-service`, `payments` → `loyalty`

### Historias de usuario y criterios de aceptación

**`tenancy`**
- Un subdominio válido carga su tenant; uno inexistente o inactivo muestra una 404 genérica. `{slug}.localhost:3000` funciona en desarrollo.

**`theming`**
- Al cambiar solo `tenants/{slug}/theme.css` (y sus assets) cambia toda la identidad visual de ese spa.
  - CA: el lint falla si hay colores o `font-family` fuera de `tenants/*/theme.css`.
  - CA: un test de contrato exige todos los tokens de `_template`.
  - CA: E2E con 2 tenants con marcas distintas.

**`auth`**
- HU-A1: el usuario entra con Google desde cualquier host y es redirigido según su rol: super admin → `admin.prismalab.com.co`; admin de 1 spa → `{slug}…/admin`; admin de varios → selector; cliente → `/` de su spa.
- HU-A2: un usuario no puede cambiar su propio rol; solo el super admin asigna membresías.
  - CA: el test de aislamiento verifica que el admin A no lee ni escribe datos de B, y que el cliente X no ve mascotas ni citas de Y. Es **bloqueante en CI**.

**`platform-console`**
- El super admin crea tenants (slug validado, sin palabras reservadas), asigna admins por correo y edita el catálogo global de razas.

**`locations`**
- El admin crea locales (nombre, dirección, WhatsApp) y configura, por local: tinas y mesas (marcando las que sirven para corte especial); horario semanal; días de cierre; modo de confirmación; ventana de cancelación; días máximos de reserva; y si "quien baña sigue secando".
- El botón **"Aplicar a todos los locales"** copia la configuración elegida a los demás locales, con confirmación previa.

**`staff`**
- El admin registra personal (nombre, habilidades, locales) con turnos semanales por local y ausencias (vacaciones o incapacidad).
- Los empleados **no** necesitan usuario en la v1.

**`pet-catalog`**
- Cada tenant hereda el catálogo global y puede sobrescribir la talla o el pelo de una raza, o crear razas propias.
- El admin edita los umbrales de talla por peso y por especie.
- **Regla de talla:** si hay peso, la talla sale del peso; si no, de la raza. El admin puede fijar manualmente la talla y el pelo de una mascota.

**`customers`**
- El cliente completa su perfil (nombre y WhatsApp obligatorios) y registra mascotas: especie, raza o criollo, peso, pelo (solo si es criollo), género y foto opcional.
- El admin busca clientes por nombre o teléfono, los inscribe con correo + WhatsApp y les crea mascotas.
- Cuando el cliente entra con Google usando ese correo, el perfil se vincula al usuario y conserva mascotas e historial.
- El admin agrupa mascotas del mismo dueño como "se bañan juntas".

**`services`**
- El admin gestiona categorías y servicios (nombre, descripción, especie, activo).
  - Un servicio de tipo **baño** tiene 3 etapas fijas.
  - Un servicio de tipo **corte especial** se agrega al baño y se ejecuta después de los detalles (D18).
  - Los **extras** se asocian a servicios.
- **Matriz de duración** (por tenant): servicio × talla × pelo → minutos de cada etapa.
- **Matriz de precio** (por local): servicio o extra × talla × pelo → COP. Se puede copiar a otros locales.
  - CA: no se puede activar un servicio en un local sin precio para todas las combinaciones habilitadas.
  - CA: un servicio con citas futuras no se borra, solo se desactiva.

**`capacity`**
- Dada una mascota (o un grupo), un servicio, unos extras, un local y una fecha, el sistema devuelve las horas de inicio factibles según el **modo de capacidad del local** (§5).
- HU-C1: en **Locales → Capacidad** el admin llena cuántas mascotas atiende un empleado al día por especie × talla × pelo (D31) y las zonas de espera (D33). La capacidad **avanzada** se ve como "Próximamente" (D30).
- HU-C2: **calendario de ocupación** por local: el % ocupado de cada día, desglosado por talla (simple) o por estación y personal (avanzada).
- HU-C3: **"¿Por qué no hay cupo?"**: para una fecha y hora, el admin (o Prisma Lab, junto con el dueño) ve qué regla bloqueó cada horario. Por ejemplo: "sin mesa de secado libre a las 10:40", "sin groomer en turno" o "cupo de talla L agotado".
  - CA: los dos modos comparten la misma interfaz SQL; cambiar de modo es un ajuste del local, sin deploy.

**`booking`**
- HU-B1 (cliente): mascota → servicio y extras (con precio de su talla y pelo en ese local) → **local** → fecha → hora → resumen → reserva. El estado inicial es `scheduled` o `pending`, según el local.
  - CA: dos reservas concurrentes por el último cupo producen **1** cita y **1** error amable.
  - CA: se aplican los límites anti-abuso: máximo 5 reservas en 5 min y máximo 10 activas por cliente.
  - CA: una mascota con cita activa no puede tener otra que se solape.
- HU-B2 (admin): crea citas para clientes inscritos o nuevos, con las mismas validaciones. Puede forzar un sobrecupo con confirmación, y queda registrado.
- HU-B3 (admin): agenda por local en vista de día (móvil) y por estación o personal (escritorio). Cada cita muestra el personal asignado a sus etapas y la **hora estimada de entrega**.
- HU-B4: estados `pending → scheduled → received → in_progress → ready → delivered`, o `cancelled` / `no_show`. El admin puede reasignar el personal de una etapa.
- HU-B5 (cliente): ve sus citas activas y su historial, y confirma la recepción de su mascota al entregarla.

**Entrega 2** (se especifica en detalle antes de construirla)
- `agreements`: convenio por cliente × servicio con **precio fijo**, que cubre 1 o varias mascotas (p. ej., 3 mascotas → $X en total), con vigencia opcional. Se aplica cuando se reservan esas mascotas juntas, se refleja en el precio mostrado y queda congelado en la cita.
- `self-service`: el cliente cancela o reprograma hasta *N* horas antes (configurable por local); la reprogramación revalida la capacidad.
- `payments`: para pasar a `delivered` se exige el pago: total congelado, método, y evidencia obligatoria si el pago es digital (foto o pantallazo). Incluye el total de ingresos del día por método.
- `loyalty`: puntos = total pagado / COP por punto; servicios canjeables con su costo en puntos; tarjeta de baños (10 = 1 gratis), activable por tenant.

---

## 3. Arquitectura

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript estricto** | El proxy (`src/proxy.ts`) resuelve el subdominio; Server Components y Server Actions |
| BD, auth y storage | **Supabase** (Postgres, Auth con Google, RLS, Storage privado) — **1 proyecto** | D1; RLS como frontera de aislamiento; RPC transaccionales |
| Estilos | **CSS nativo**: `tenants/{slug}/theme.css` + `base.css` + CSS Modules | Contrato white-label verificable; sin Tailwind |
| Íconos | **lucide-react** | Ya se usaba en el legado; SVG que heredan `currentColor` |
| Validación | **Zod** | Esquema compartido entre formulario y servidor |
| Fechas | **date-fns + @date-fns/tz** | Malla horaria en la zona del tenant |
| Tests | Vitest, Testing Library, Playwright, @axe-core/playwright | |
| Hosting | **Vercel**, 1 proyecto, dominios `*.prismalab.com.co` + `admin.prismalab.com.co` | 1 deploy actualiza a todos los tenants |

### Flujo de una petición
```
{slug}.prismalab.com.co/reservar
 └─ src/proxy.ts (Next 16: antes "middleware"): host → slug (admin.* → /platform) · verifica que el tenant exista (404 real) · rewrite a /s/[slug]/… · refresca la sesión
     └─ app/s/[slug]/layout.tsx: getTenant(slug) ("use cache") → datos y tema del tenant
         ├─ <link rel="stylesheet" href="/tenants/{slug}/theme.css">   (render-blocking, sin FOUC)
         └─ Server Components / Actions → Supabase con la sesión del usuario → RLS por tenant_id
```
- **Sesión y callback OAuth:** cada host tiene su `/auth/callback` (el verificador PKCE vive en una cookie del host donde empezó el login; en local los navegadores no comparten cookies entre `*.localhost`). Supabase solo acepta redirects de la allowlist (`https://*.prismalab.com.co/auth/callback**`) y `next` solo admite rutas internas (`safeNextPath`), lo que evita open redirects. En producción la cookie de sesión se emite para `.prismalab.com.co` (`NEXT_PUBLIC_COOKIE_DOMAIN`), así que la sesión se comparte entre subdominios. Las credenciales de Google van en `supabase/.env.local`.

### Contrato white-label
- `tenants/{slug}/theme.css` es el único archivo visual. Contiene `@font-face`, colores, tipografía, radios, sombras y las URLs del logo.
- `tenants/{slug}/assets/` guarda los logos, las fuentes y el favicon. El build lo copia a `public/tenants/{slug}/`.
- `tenants/_template/theme.css` define los tokens obligatorios.
- El espaciado y los breakpoints son estructurales (`base.css`) y no pertenecen al tema.
- Los textos del negocio (nombre, WhatsApp, direcciones) van en la BD.

```css
/* tenants/spaperrunosygatunos/theme.css — basado en el legado */
@import url("https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&family=Manrope:wght@400;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap");

:root {
  /* Logos planos en PNG (pesan menos que en WebP); ilustración en WebP. No hay SVG (D22) */
  --brand-logo: url("/tenants/spaperrunosygatunos/assets/logo-claro.png");          /* sobre fondos claros */
  --brand-logo-on-dark: url("/tenants/spaperrunosygatunos/assets/logo-oscuro.png"); /* sobre fondos oscuros */
  --brand-hero: url("/tenants/spaperrunosygatunos/assets/logo-principal.webp");      /* ilustración de landing / login */
  --brand-logo-ratio: 1160 / 727;

  --color-primary: #4daaf8;          /* azul del logo */
  --color-primary-strong: #2744c8;   /* azul rey de la ilustración */
  --color-primary-contrast: #ffffff;
  --color-secondary: #f8db52;        /* amarillo del logo */
  --color-secondary-contrast: #241a00;
  --color-bg: #f8fafb;
  --color-surface: #ffffff;
  --color-surface-muted: #f2f4f5;
  --color-text: #191c1d;
  --color-text-muted: #3e4850;
  --color-border: #bdc8d1;
  --color-success: #2e7d32;
  --color-warning: #8a6d00;
  --color-danger: #ba1a1a;
  --color-focus: var(--color-primary-strong);

  --font-brand: "Fredoka", "Plus Jakarta Sans", system-ui, sans-serif; /* títulos de marca (D22) */
  --font-heading: "Plus Jakarta Sans", system-ui, sans-serif;
  --font-body: "Manrope", system-ui, sans-serif;

  --radius-sm: 0.75rem;
  --radius-md: 1.5rem;
  --radius-lg: 2rem;
  --radius-pill: 999px;
  --shadow-card: 0 10px 40px rgb(25 28 29 / 0.06);
}
```
> `#4DAAF8` con texto blanco **no** alcanza el contraste AA en texto normal. En botones con texto se usa `--color-primary-strong`. El test de contrato lo verifica.

---

## 4. Modelo de datos (1 BD; toda tabla de negocio lleva `tenant_id`)

```
-- Plataforma
tenants              id, slug unique, name, is_active, timezone, currency, created_at
platform_admins      user_id PK → auth.users
memberships          tenant_id, user_id, role enum('owner','admin','reception') -- v1 usa 'admin'
global_breeds        id, species enum('dog','cat'), name, default_size, default_coat

-- Locales y operación
locations            id, tenant_id, name, address, whatsapp, is_active,
                     confirmation_mode enum('auto','manual') default 'auto',
                     cancel_window_hours int default 4, max_days_ahead int default 30,
                     bather_continues_drying bool, slot_step_min int default 15,
                     capacity_mode enum('simple','advanced') default 'simple'   (D24, D28)
location_pet_capacity tenant_id, location_id, species, size, coat, pets_per_staff > 0  -- simple (D31)
location_waiting_zones tenant_id, location_id, name, seats > 0                 -- simple (D33)
stations             id, tenant_id, location_id, name, kind enum('tub','table'), for_special_cut bool,
                     sort_order                                                 -- D27
                     -- tub = tina (baño) · table = mesa (secado + detalles; + corte si for_special_cut)
location_hours       tenant_id, location_id, weekday, opens_at, closes_at
location_closures    id, tenant_id, location_id, date, reason

staff                id, tenant_id, name, is_active
staff_skills         tenant_id, staff_id, skill enum('bath','dry','details','special_cut')
staff_shifts         id, tenant_id, staff_id, location_id, weekday, starts_at, ends_at
staff_absences       id, tenant_id, staff_id, starts_at, ends_at, reason

-- Catálogo de mascotas
size_thresholds      tenant_id, species, size enum('XS','S','M','L','XL','XXL'), max_kg
tenant_breeds        id, tenant_id, global_breed_id null, name, species, size, coat  -- override o propia

-- Clientes
customers            id, tenant_id, user_id null → auth.users, full_name, whatsapp, email,
                     unique (tenant_id, lower(email)), unique (tenant_id, whatsapp)
pets                 id, tenant_id, customer_id, name, species, gender, breed_id null,
                     weight_kg, size, coat, size_locked bool, photo_path
pet_groups           id, tenant_id, customer_id            -- "se bañan juntas"
pet_group_members    tenant_id, group_id, pet_id

-- Servicios
service_categories   id, tenant_id, name, sort_order
services             id, tenant_id, category_id, kind enum('bath','special_cut','other'),
                     name, description, species enum('dog','cat','both'), is_active, sort_order
extras               id, tenant_id, service_id, name, extra_minutes default 0, is_active   -- con precio
service_options      id, tenant_id, service_id, name, stage enum('bath','details'), is_active, sort_order
                     -- opcionales sin costo del baño (D26)
service_durations    tenant_id, service_id, size, coat, bath_min, dry_min, details_min, cut_min
                     -- kind 'bath' usa bath/dry/details; 'special_cut' solo cut_min; 'other' solo details_min
location_prices      tenant_id, location_id, item_type enum('service','extra'), item_id,
                     size, coat, price_cop int ≥ 0                       PK compuesta

-- Citas
appointments         id, tenant_id, location_id, customer_id, pet_group_id null, code,
                     status enum('pending','scheduled','received','in_progress','ready',
                                 'delivered','cancelled','no_show'),
                     starts_at, estimated_ready_at, total_cop (congelado), source enum('web','admin'),
                     overbooked bool, client_confirmed_at, created_by, created_at
appointment_pets     tenant_id, appointment_id, pet_id, size, coat           -- congelados
appointment_items    tenant_id, appointment_id, pet_id, item_type, item_id, price_cop
appointment_segments id, tenant_id, appointment_id, stage, station_id, staff_id, starts_at, ends_at
                     index (tenant_id, station_id, starts_at)
                     index (tenant_id, staff_id, starts_at)

-- Entrega 2
customer_agreements  id, tenant_id, customer_id, service_id, price_cop (total fijo), valid_until null
agreement_pets       tenant_id, agreement_id, pet_id            -- 1..N mascotas cubiertas (D19)
payments             id, tenant_id, appointment_id unique, method enum('cash','nequi','daviplata','breb','card_terminal'),
                     amount_cop, evidence_path, recorded_by, recorded_at
loyalty_settings     tenant_id PK, cop_per_point, punchcard_enabled, punchcard_size default 10
loyalty_ledger       id, tenant_id, customer_id, appointment_id, kind enum('earn','redeem_points','redeem_punch'), points
```

**Seguridad**
- **RLS** en todas las tablas:
  - `is_super_admin()`: acceso total.
  - `is_tenant_staff(tenant_id)`: CRUD dentro de su tenant.
  - Cliente: solo sus filas, vía `customers.user_id = auth.uid()`.
  - `anon`: solo lectura del catálogo público (tenant, locales, servicios, precios, razas).
- **FKs compuestas** con `tenant_id`, para que no se pueda referenciar otro tenant.
- Las citas se crean **solo** mediante la interfaz del schema `capacity` (§5.1): `capacity.available_slots` y `capacity.book` (con un modo admin que permite el sobrecupo con confirmación).
- Los triggers del legado se adaptan: protección de rol, límite de 5 reservas en 5 min, máximo 10 activas y no reservar en el pasado.
- **Storage privado** `tenant-files/{tenant_id}/…`: fotos de mascotas y evidencias de pago. Se leen con URLs firmadas; solo el staff del tenant escribe evidencias.

---

## 5. Motor de disponibilidad (`capacity`)

### 5.1 Un único lugar, explicable (D24)
- **Toda** la lógica vive en un schema SQL dedicado, **`capacity`**, en una sola migración de cabecera y con funciones pequeñas y nombradas por regla. Ni la UI ni las Server Actions contienen reglas de capacidad: solo llaman a la interfaz pública.
- **Interfaz pública** (igual en los dos modos):
  - `capacity.available_slots(location, date, pets[], service, extras[])` → horas de inicio factibles y hora estimada de entrega.
  - `capacity.explain(location, date, pets[], service, extras[])` → **cada** hora de la malla con `ok` o el **motivo** de rechazo (código de regla + detalle legible).
  - `capacity.book(...)` → revalida con bloqueo transaccional y crea la cita con sus segmentos.
  - `capacity.occupancy(location, from, to)` → % de ocupación por día para el calendario.
- **Sin constantes ocultas:** todo umbral, duración o conteo sale de tablas de configuración. Un cambio que pidan los dueños es un cambio de datos, no de código.
- **`docs/capacidad.md`** describe cada regla en lenguaje de negocio, con escenarios del tipo "dado / cuando / entonces" para revisarlos con los dueños. **Los mismos escenarios** son fixtures de `tests/db/capacity.*`, así que el documento y el comportamiento no pueden divergir.

### 5.2 Capacidad avanzada — Próximamente (D30; no se construye en la Entrega 1)

```
Entrada: local L, fecha F, mascotas P (1, o un grupo "se bañan juntas"), servicio de baño,
         corte especial opcional, extras
1. Para cada mascota → (talla, pelo) → minutos de bath, dry y details desde service_durations
   + minutos de los extras; cut_min si lleva corte especial.
   En grupo: bath y dry del grupo = el máximo entre sus mascotas.
2. Para cada hora de inicio t en la malla de slot_step_min dentro de location_hours(L, F):
   a. BAÑO     [t, t+bath)       → 1 tina libre (1 tina compartida por el grupo, D23)
                                   + 1 persona con 'bath' POR MASCOTA (D20), en turno y libre
   b. SECADO   [t+bath, +dry)    → 1 mesa libre POR MASCOTA (D23): todas libres a la vez;
                                   si la mascota lleva corte especial, una mesa con for_special_cut
                                   + 1 persona POR MASCOTA:
                                   si bather_continues_drying → las MISMAS personas de (a)
                                   si no → cualquiera con 'dry', en turno y libre
                                   (empieza exactamente al terminar el baño, D6)
   c. DETALLES (por mascota, D25): el primer inicio u ≥ fin del secado, antes del cierre, con
                 persona con 'details'. Se hacen en la MISMA mesa del secado: la mesa queda ocupada
                 desde el inicio del secado hasta el fin de los detalles (incluida la espera).
   d. CORTE ESPECIAL (por mascota, si aplica, D18, D27): el primer inicio v ≥ fin de (c), antes
                 del cierre, en la MISMA mesa + persona con 'special_cut' (groomer). Puede esperar;
                 la mesa sigue ocupada hasta el fin del corte.
   e. t es válido si existen todas las etapas para todas las mascotas.
      estimated_ready_at = el fin más tardío de (c)/(d).
3. Se descartan t < ahora, t > hoy + max_days_ahead, días de cierre, y personal ausente.
```
- "Libre" significa que esa tina o mesa no tiene segmentos no cancelados que se solapen, y que el personal no tiene otro segmento solapado. Cada segmento guarda la estación exacta asignada (D27).
- `capacity.book` repite el cálculo en una transacción con `pg_advisory_xact_lock(hash(location_id, F))`, **asigna** el personal y las estaciones, e inserta los segmentos de forma atómica.
- La asignación de personal es **greedy** (el primero disponible por orden estable). El admin puede reasignar después; la reasignación se valida con las mismas reglas.
- La fuente de verdad es SQL (schema `capacity`). La UI no replica reglas.

### 5.3 Capacidad simple (D28–D33) — la única activa en la Entrega 1
```
Jornadas(L, F)  = Σ por staff con skill 'bath' y turno en L el weekday(F):
                  min(1, (horas de turno − horas de ausencia) / horas que abre L ese día)
Uso(mascota)    = 1 / location_pet_capacity(L, especie, talla, pelo)   -- null → SIN_CAPACIDAD
Usado(L, F)     = Σ Uso de las mascotas con baño en citas no canceladas de L en F
Cupo:     Usado + Σ Uso(nuevas) ≤ Jornadas(L, F)                         -- si no, CUPO_LLENO
Estadía:  [t, estimated_ready_at)
Espacio:  ∀ instante de la estadía, mascotas presentes + nuevas ≤
          staff 'bath' en turno en ese instante + Σ seats de location_waiting_zones(L) -- SIN_ESPACIO
Entrega:  estimated_ready_at = t + duración, sin contar los cierres entre tramos;
          ≤ cierre del día                                                -- FUERA_DE_HORARIO
duración = Σ etapas de service_durations (talla × pelo) + corte especial + extras
```
- Aritmética exacta con fracciones (sin redondeo).
- No se asignan estaciones ni personal. La entrega es aproximada (sin margen, D29); el admin puede ajustarla.
- Servicios solos (sin baño): no usan cupo ni espacio; solo deben terminar antes del cierre.
- `capacity.explain` devuelve `SIN_EMPLEADOS`, `SIN_CAPACIDAD`, `CUPO_LLENO`, `SIN_ESPACIO` o `FUERA_DE_HORARIO` con el detalle, p. ej. "quedan ⅙ de jornada".
- Ocupación(F) = Usado / Jornadas, también desglosada por talla.

---

## 6. Comandos

```bash
npm install
npm run dev                # http://spaperrunosygatunos.localhost:3000 · http://admin.localhost:3000
npm run build              # copia tenants/*/ → public/tenants/ + next build
npm run lint               # ESLint + stylelint (sin colores ni fuentes fuera de tenants/*/theme.css)
npm run typecheck          # tsc --noEmit
npm test                   # Vitest: unit + contrato de temas
npm run test:db            # Vitest contra Supabase local: RLS, capacidad, concurrencia
npm run test:e2e           # Playwright: Pixel 7 + Desktop 1280, 2 tenants
npx supabase start         # Supabase local (Docker)
npx supabase db reset      # migraciones + seed (catálogo global de razas, spaperrunosygatunos, demo)
npx supabase gen types typescript --local > src/lib/db/types.ts
```

---

## 7. Estructura del proyecto

```
src/proxy.ts                    → host → slug / platform, 404 de tenant inexistente, rewrite, sesión
src/app/
  s/[slug]/auth/callback, platform/auth/callback → callback OAuth por host (allowlist + safeNextPath)
  platform/                     → consola super admin: tenants, admins, razas globales
  s/[slug]/                     → solo accesible vía rewrite del proxy
    layout.tsx                  → tenant + <link> al theme.css
    page.tsx                    → landing del spa (locales, servicios, WhatsApp)
    (cliente)/                  → bottom nav: Agenda · Mascotas · Puntos(E2) · Perfil
      reservar/  mascotas/  perfil/  citas/
    admin/                      → bottom nav (móvil) / sidebar (desktop)
      agenda/  clientes/  mascotas/  servicios/  precios/  personal/  locales/  razas/  ajustes/
src/components/ui/              → Button, Input, Select, Card, Sheet, Dialog, Badge, Tabs, Matrix…
src/features/<módulo>/          → queries, actions, schemas zod y componentes por módulo del §2
src/lib/  supabase/  tenant.ts  auth.ts  money.ts (COP)  copy.ts (es-CO)
src/styles/base.css             → reset, espaciado, breakpoints, layout — solo var(--…)
tenants/
  _template/theme.css
  platform/theme.css + assets/  → tema de Prisma Lab: consola y páginas sin tenant (404). "platform" es slug reservado
  spaperrunosygatunos/theme.css + assets/ (logos del legado: PNG + ilustración WebP)
  demo/theme.css + assets/
supabase/migrations/  supabase/seed.sql (≈150 razas del legado + tallas por defecto)
  …_capacity.sql                → schema `capacity`: única fuente de reglas (D24)
docs/capacidad.md               → reglas en lenguaje de negocio + escenarios (= fixtures de test)
tests/  tests/db/  e2e/
```

---

## 8. Estilo de código

- TypeScript `strict`, sin `any`. Carpetas por feature. Server Components por defecto.
- El `tenant` **siempre** sale del contexto del servidor, nunca de un input del cliente.
- Las mutaciones van por Server Action → Zod → Supabase con la sesión del usuario. `service_role` solo en scripts de seed y administración.
- Los montos se manejan como **enteros COP**, y las fechas en UTC (`timestamptz`); se muestran en la zona del tenant.

```ts
// src/features/services/actions.ts
"use server";
export async function upsertLocationPrices(input: unknown) {
  const { tenant, supabase } = await requireTenantStaff();
  const { locationId, rows } = locationPricesSchema.parse(input);
  const { error } = await supabase
    .from("location_prices")
    .upsert(rows.map((r) => ({ ...r, tenant_id: tenant.id, location_id: locationId })));
  if (error) throw new ActionError("No pudimos guardar los precios");
  revalidatePath("/admin/precios");
}
```

```css
/* src/components/ui/Button.module.css */
.button {
  min-height: 44px;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-pill);
  font: 700 1rem / 1.2 var(--font-body);
  background: var(--color-primary-strong);
  color: var(--color-primary-contrast);
}
.button:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 2px; }
```

---

## 9. Estrategia de testing

| Nivel | Herramienta | Qué cubre |
|---|---|---|
| Unit | Vitest | host → slug, talla por peso o raza, malla horaria, esquemas Zod, formato COP |
| Contrato de temas | Vitest | Tokens obligatorios y contraste AA de los pares texto/fondo |
| BD | Vitest + Supabase local | **Aislamiento** entre tenants y entre clientes (bloqueante). **Capacidad**, a partir de los escenarios de `docs/capacidad.md`: etapas contiguas baño→secado, espera de detalles en la misma mesa, estaciones, turnos, ausencias, `bather_continues_drying`, grupos (1 tina y N mesas), corte especial en la misma mesa (solo mesas marcadas), cierres, capacidad simple (jornadas por empleado, cambios por fecha, fracciones exactas), y que `explain` coincida con `available_slots`. **Concurrencia:** 10 reservas paralelas al último cupo dan 1 éxito. Vinculación de un cliente invitado al entrar con Google. Triggers anti-abuso |
| Componentes | Testing Library | Wizard de reserva, matrices de duración y precio, errores accesibles |
| E2E | Playwright (Pixel 7 + Desktop) | Login (con OAuth simulado en local), reserva completa, cita del admin, cambio de estados, 2 tenants con temas distintos |
| A11y | axe | 0 violaciones serias o críticas |

Cobertura: **90 %** en `capacity` y `booking`, 70 % global.

---

## 10. Límites

### ✅ Always do (UI/UX responsivo)
- Diseñar **mobile-first** (360px base; `min-width` a 768px y 1024px). El cliente usa bottom nav en móvil; el admin, bottom nav en móvil y sidebar en desktop.
- Usar **solo `var(--…)`** para color, tipografía, radios y sombras.
- Usar objetivos táctiles ≥ 44×44px, inputs ≥ 16px, y `type="tel"`, `inputmode` y `autocomplete` correctos.
- Que no haya scroll horizontal entre 320 y 1920px. Las matrices (talla × pelo) se ven como tabla en desktop y como **acordeón por talla** en móvil.
- Usar bottom sheets en móvil y un CTA fijo inferior en el wizard. Subir la evidencia de pago con cámara o galería (`accept="image/*" capture`).
- Usar `clamp()` para la tipografía y `dvh`/`svh` en lugar de `vh`. Respetar `prefers-reduced-motion`.
- Mantener contraste WCAG AA, `:focus-visible`, labels asociados y errores con `aria-describedby`.
- Dar estados de carga, de vacío y de error a cada vista con datos.
- Guardar en UTC y mostrar en la zona del tenant; mostrar montos en formato `es-CO` (COP sin decimales).
- Filtrar por `tenant_id` en el servidor **y** garantizarlo con RLS.
- Verificar cada historia en el viewport móvil y en el de desktop.

### ⚠️ Ask first
- Añadir dependencias fuera del stack.
- Cambiar el esquema después de la primera migración aplicada.
- Añadir o renombrar tokens en `_template/theme.css`.
- Cambiar las reglas del motor de capacidad (§5). Todo cambio actualiza primero `docs/capacidad.md` y sus escenarios.
- Integrar pagos, notificaciones o terceros.
- Desplegar a producción o tocar el DNS.

### 🚫 Never do
- Hardcodear colores, fuentes, sombras o radios fuera de `tenants/*/theme.css` (el defecto nº 1 del legado).
- Poner nombres, textos o logos de un tenant en el código.
- Calcular la disponibilidad en el navegador o insertar citas sin la RPC (el defecto nº 2 del legado).
- Poner reglas o constantes de capacidad fuera del schema `capacity` (ni en TypeScript ni en la UI).
- Hacer público un bucket con datos de clientes o comprobantes.
- Crear tablas sin `tenant_id` y sin RLS; confiar en un `tenant_id` del cliente.
- Usar `service_role` en el navegador o en flujos de usuario.
- Permitir que un usuario modifique su propio rol o membresía.
- Diseñar desktop-first, ocultar funcionalidad en móvil o usar `hover` como único acceso.
- Commitear secretos; borrar o saltar tests que fallan.

---

## 11. Criterios de éxito (Entrega 1)

1. Un cliente entra con Google, registra una mascota (con raza o como criollo) y reserva un baño desde un móvil en ≤ 5 pasos.
2. Las horas ofrecidas respetan la capacidad simple (jornadas del Personal, espacio en el local y entrega antes del cierre) según los escenarios de `docs/capacidad.md`. El test de concurrencia pasa.
3. El admin configura 2 locales con precios distintos y lo verifica en el wizard.
4. Dos tenants con temas distintos funcionan en paralelo con datos 100 % aislados (tests RLS en verde).
5. Lighthouse móvil en `/` y `/reservar`: Performance ≥ 90 y Accessibility ≥ 95.
6. `lint`, `typecheck`, `test`, `test:db` y `test:e2e` en verde.

---

## 12. Preguntas abiertas

Todas resueltas el 2026-10-25 (D18–D24); D25–D33 agregadas el 2026-10-26 con las respuestas del spa (`docs/capacidad.md` §5). Los supuestos S1, S2, S4, S6 y S7 siguen vigentes y se validarán con Spa Perrunos y Gatunos usando `docs/capacidad.md` y la vista "¿Por qué no hay cupo?".

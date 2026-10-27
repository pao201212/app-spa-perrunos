# Capacidad: cómo decide el sistema qué horarios ofrecer

> **Estado: v6, con las respuestas de Spa Perrunos y Gatunos** (T34, 2026-10-26)
> En la Entrega 1 solo se habilita la **Capacidad simple**. La **Capacidad avanzada** queda como
> **"Próximamente"** y se definirá con el spa más adelante (SPEC D30–D33).
>
> Cada escenario se convertirá en una prueba automática: si una regla cambia, primero se cambia
> aquí (SPEC §5, D24).

---

## 1. Los dos modos

| | **Capacidad simple** (disponible) | **Capacidad avanzada** (próximamente) |
|---|---|---|
| **Idea** | "Cada empleado atiende tantas mascotas por día" | Agenda minuto a minuto: tinas, mesas, personas y etapas |
| **Qué decide** | Si **ese día** hay cupo, si **a esa hora** cabe una mascota más en el local, y si se entrega antes del cierre | Si **a esa hora** hay tina, mesa y personas libres |
| **Hora de entrega** | **Aproximada:** llegada + duración del servicio | Calculada con las esperas reales |

En **Locales → Capacidad** la avanzada aparece deshabilitada con la etiqueta "Próximamente".

## 2. Reglas para los dos modos

| Código | Regla | Ejemplo del motivo que verá el admin |
|---|---|---|
| `PASADO` | No se ofrecen horarios que ya pasaron. No hay anticipación mínima. | "Este horario ya pasó" |
| `MUY_LEJOS` | No más de *N* días a futuro (por defecto 30). | "Solo se reserva hasta el 25 nov" |
| `CERRADO` | El local no abre ese día o está marcado como cierre. | "El local cierra el 25 dic (Navidad)" |
| `SIN_PRECIO` | El local no tiene precio para esa talla y pelo. | "No disponible en Sede Norte" |
| `SIN_DURACION` | El servicio no tiene duración para esa talla y pelo. | "Baño no disponible para Gigante · Largo" |

- **Al reservar, el cliente ve las horas disponibles del día y, en cada una, la hora de
  entrega**, por ejemplo: "08:00 · entrega aprox. 09:30". Las horas van **cada 15 minutos**
  (configurable por local).
- **La duración del servicio** sale de **Servicios → Duraciones** (talla × pelo): baño + secado +
  detalles, más el corte especial y los extras con costo que sumen minutos. Los **opcionales sin
  costo no suman tiempo**.
- **El cierre del mediodía no cuenta:** si el trabajo lo cruza, se sigue después del almuerzo.
- **Mascotas que vienen juntas** (hermanas del mismo dueño): se aceptan **todas o ninguna**.
- **Sobrecupo:** el admin puede crear una cita aunque no haya cupo, confirmándolo; queda marcada.
- **Dos reservas a la vez por el último cupo:** solo una se confirma; la otra persona ve "Ese
  horario acaba de ocuparse".
- **"¿Por qué no hay cupo?":** para cualquier día y hora, el admin ve el código y el motivo.

---

## 3. Capacidad simple

### 3.1 Qué configura el spa

| Dónde | Qué | Ejemplo |
|---|---|---|
| Locales → Capacidad | **Mascotas que atiende un empleado en un día**, por **especie × talla × pelo** | Perro mediano de pelo corto: 6 |
| Locales → Capacidad | **Zonas de espera** del local y cuántas mascotas caben en cada una (puede no tener) | Sala de espera: 4 |
| Personal | Empleados que **bañan**, sus **turnos** en el local y sus **ausencias** (ya existe) | Ana L–S todo el día |
| Locales → Horario y Días de cierre | Lo mismo de siempre | L–V 08:00–12:00 y 13:00–17:00 |
| Servicios → Duraciones | Lo mismo de siempre (para la hora de entrega) | Baño mediano corto: 40 / 30 / 20 |

No hace falta registrar tinas ni mesas.

### 3.2 El cupo del día

Piensa en la **jornada de un empleado**: en un día atiende, por ejemplo, **4 perros grandes** de
pelo corto, **o 6 medianos**, **o 8 pequeños**, o una mezcla. Cada mascota usa una parte de esa
jornada, según lo que el admin escribió para su especie, talla y pelo:

| Perro | Pelo corto | Pelo medio | Pelo largo |
|---|---|---|---|
| Pequeño | 8 (usa ⅛) | 7 | 6 |
| Mediano | 6 (usa ⅙) | 5 | 4 (usa ¼) |
| Grande | 4 (usa ¼) | 3 | 3 |

(Igual para gatos y para las demás tallas. Si una combinación queda vacía, no se ofrece en ese
local.)

**Las jornadas del día salen del módulo Personal:** cuenta cada empleado que **baña** y tiene
turno ese día en el local, menos sus ausencias. Un turno completo es **1 jornada**; un turno de
medio día, **½ jornada**. El groomer que solo hace corte especial no cuenta.

**Una reserva cabe si, sumando lo que usan las mascotas ya reservadas y las nuevas, no se pasa de
las jornadas del día.** El cálculo es exacto: no se redondea.

| Lunes con 2 empleados | Usa | Queda | Todavía caben |
|---|---|---|---|
| Nada reservado | 0 | 2 jornadas | 8 grandes cortos, o 12 medianos cortos, o 16 pequeños cortos |
| 2 grandes cortos + 3 medianos cortos | ½ + ½ = 1 | 1 jornada | 4 grandes cortos, o 6 medianos cortos… |
| 4 grandes cortos + 6 medianos cortos | 1 + 1 = 2 | 0 | Nada: día lleno |

### 3.3 Mascotas al mismo tiempo en el local

Una mascota está en el local desde que llega hasta su entrega aproximada. **A ninguna hora puede
haber más mascotas que los empleados en turno a esa hora más los puestos de las zonas de
espera.** En el almuerzo no hay empleados en turno, así que solo cuentan las zonas de espera.

> Sede con 2 empleados y una sala de espera de 4 → hasta **6** mascotas a la vez. Una sede sin
> zonas de espera → hasta **2** (las que se están atendiendo).

### 3.4 Horas disponibles y entrega

Se ofrecen las horas del horario en las que (1) el día tiene cupo, (2) cabe una mascota más en el
local durante toda su estadía y (3) la entrega aproximada queda antes del cierre. La entrega es
**aproximada** (sin margen): no mira el orden de las demás mascotas; el spa puede ajustarla en la
cita.

| Código | Regla | Ejemplo del motivo |
|---|---|---|
| `SIN_EMPLEADOS` | Ese día nadie que bañe tiene turno en el local. | "No hay bañadores el domingo" |
| `SIN_CAPACIDAD` | No hay capacidad configurada para esa especie, talla y pelo. | "Gato gigante de pelo largo no se atiende aquí" |
| `CUPO_LLENO` | Las mascotas nuevas no caben en las jornadas que quedan. | "Quedan ⅙ de jornada: cabe 1 mediano corto, no 1 grande" |
| `SIN_ESPACIO` | A alguna hora de la estadía ya está lleno el local. | "A las 12:15 ya hay 6 mascotas (máximo 6)" |
| `FUERA_DE_HORARIO` | La entrega aproximada quedaría después del cierre. | "Entregaría 17:15 y el local cierra 17:00" |

**Servicios solos** (p. ej. solo corte de uñas): **no usan cupo** del día ni espacio en el local;
solo deben terminar antes del cierre.

Supuestos de la implementación (T37), a confirmar con el spa:
- **Mascotas que vienen juntas** se atienden a la par: la entrega es la de la más larga y todas
  ocupan espacio hasta esa hora.
- Las citas **canceladas** o de **no asistió** no usan cupo; las **entregadas** liberan su espacio.

### 3.5 Escenarios

**Local de ejemplo — "Sede principal"**
- Horario: L–V **08:00–12:00** y **13:00–17:00**; sábado **08:00–13:00**; domingo cerrado.
- Personal: **Ana** (baña; L–S todo el horario) · **Beto** (baña; L–V todo el horario) ·
  **Caro** (solo corte especial; sábados).
- Capacidad por empleado (perro): la tabla de 3.2. Zona de espera: **Sala de espera, 4**.
- Baño de un perro mediano corto: 40 + 30 + 20 = **90 min**. Corte de raza mediano: **60 min**.

| # | Dado | Cuando | Entonces |
|---|---|---|---|
| S1 | Lunes sin reservas (Ana y Beto: 2 jornadas) | Max (mediano corto) pide Baño a las 08:00 | Disponible. Entrega aprox. **09:30** |
| S2 | Lunes con 4 grandes cortos y 6 medianos cortos | Piden 1 pequeño corto | **No:** `CUPO_LLENO` (2 jornadas usadas) |
| S3 | Lunes con 1 jornada usada | Piden 4 medianos de pelo largo | Disponibles (4 × ¼ = 1). El 5.º: `CUPO_LLENO` |
| S4 | Beto ausente el lunes | Piden el 5.º grande corto del día | **No:** `CUPO_LLENO` (solo 1 jornada) |
| S5 | Beto solo trabaja el lunes de 08:00 a 12:00 (½ jornada) | Piden grandes cortos | Caben **6** (1½ jornadas) |
| S6 | Domingo | Cualquier reserva | **No:** `CERRADO` |
| S7 | Sábado: Ana (1 jornada) y Caro (no baña) | Piden grandes cortos | Caben **4**: Caro no cuenta |
| S8 | Lunes: queda ⅙ de jornada | Lola y Pepa (2 medianos cortos, juntas) piden | **No** ninguna: juntas usan ⅓ |
| S9 | Queda ⅙ de jornada y dos clientes piden 1 mediano corto a la vez | Ambos confirman | Solo una cita se crea |
| S10 | Lunes con cupo | Max mira las horas para Baño | 08:00 · entrega **09:30**; 08:15 · **09:45**; … última 15:30 · **17:00** |
| S11 | Lunes con cupo | Max quiere llegar a las 15:45 | **No:** `FUERA_DE_HORARIO` (entregaría 17:15) |
| S12 | Lunes con cupo | Max llega a las 11:30 | Disponible: 30 min antes del almuerzo + 60 después. Entrega **14:00** |
| S13 | Lunes: 6 mascotas en el local entre 10:00 y 11:30 | Max pide 10:00 | **No:** `SIN_ESPACIO` "a las 10:00 ya hay 6 (máximo 6)". Primera hora posible: la que deje toda su estadía con espacio |
| S14 | 12:00–13:00 (almuerzo): 4 mascotas esperando | Max pide 11:00 (estaría hasta 13:30) | **No:** `SIN_ESPACIO` "a las 12:00 ya hay 4 (máximo 4)" |
| S15 | Sábado con cupo | Max pide Baño + Corte de raza a las 08:00 | Disponible. Cuenta como **1 baño** de su talla. Entrega **10:30** (90 + 60) |
| S16 | Lunes con el día lleno | Piden solo Corte de uñas a las 09:00 | Disponible: no usa cupo ni espacio |

---

## 4. Capacidad avanzada — Próximamente

Se construirá después de definirla con el spa. Lo que ya está decidido:

- **Estaciones:** tinas y mesas, una por una; las mesas marcadas "corte especial" sirven además
  para el corte (ya está en Locales → Estaciones).
- Un baño es **baño → secado → detalles**. El secado empieza justo al terminar el baño.
- **Baño y secado no pueden terminar después del cierre** de un tramo.
- **Al terminar el secado, la mascota baja a un área de descanso** (una habitación) y la mesa queda
  libre. Espera **máximo 30 minutos** para los detalles.
- **Asignación:** la primera persona libre.
- **Secado:** al menos una persona por mascota; **a veces dos personas secan a una mascota** y el
  secado es más rápido.
- **El groomer normalmente no hace detalles:** solo el corte especial.
- Los **opcionales sin costo** no suman tiempo.

Pendiente de definir con el spa: cuántas mascotas caben en el área de descanso, en qué mesa se
hacen los detalles y el corte después del descanso, y cuánto se acorta el secado con dos personas.

## 5. Respuestas del spa (2026-10-26)

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Con qué modo empiezan? | Solo capacidad simple; la avanzada, "Próximamente" |
| 2 | Opcionales de "elegir uno" | Se marcan libremente. La descripción del baño indica el shampoo; el shampoo especial u otros se agregan como adicionales con costo |
| 3 | ¿Capacidad por empleado o total? | Por empleado, y el admin la llena por **especie, talla y pelo** |
| 4 | ¿Límite de llegadas a la misma hora? | Sí: **zonas de espera** configurables por local y cuántas mascotas caben |
| 5 | ¿El corte especial cuenta más? | Todos los baños incluyen un corte básico; el corte especial es un servicio adicional al baño (como en el sistema anterior) |
| 6 | ¿Servicios solos usan cupo? | No |
| 7 | ¿Empleados por día? | Del **módulo Personal** y la disponibilidad (turnos y ausencias) de cada persona |
| 8 | ¿Margen en la entrega? | Sin margen por ahora |
| 9 | ¿Baño o secado después del cierre? | No |
| 10 | ¿Opcionales suman tiempo? | No |
| 11 | ¿Mientras espera detalles sigue en la mesa? | No: baja a un área de descanso (habitación) |
| 12 | ¿Espera máxima para detalles? | 30 minutos |
| 13 | ¿Cómo se reparte el trabajo? | Primera persona libre |
| 14 | ¿Una persona vigila dos secados? | No; a veces dos personas secan a una mascota |
| 15 | ¿El groomer hace detalles? | Usualmente no; solo corte especial |
| 16 | Intervalo de horarios | Cada 15 minutos |

**Para confirmar** (se usará el supuesto si no hay respuesta):

- **Zonas de espera:** el máximo de mascotas a la vez = empleados en turno a esa hora + puestos
  de las zonas de espera (3.3). ¿Es así?
- **Baño + corte especial** cuenta como 1 baño de su talla en el cupo del día (S15).

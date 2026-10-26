# Capacidad y disponibilidad de horarios

> **Estado: BORRADOR v2 para validar con Spa Perrunos y Gatunos** (T34, 2026-10-26)
> v2: la mesa de secado es la misma de los detalles; "terminado" pasa a llamarse **detalles**;
> opcionales sin costo del baño (SPEC D25, D26).
>
> Este documento explica, en lenguaje de negocio, **cómo decide el sistema qué horarios ofrecer**.
> Cada escenario de la sección 4 se convertirá en una prueba automática: si una regla cambia,
> primero se cambia aquí (SPEC §5, D24).

---

## 1. Ideas clave

1. **Un baño es una cadena de 3 etapas:** baño → secado → detalles.
   - **Detalles** = limpiar orejas, cortar uñas, corte higiénico, perfume, tijera en las patas, etc.
   - El **secado empieza justo al terminar el baño**: una mascota mojada no puede esperar.
     Por eso solo se empieza a bañar si al terminar habrá una mesa libre.
   - Los **detalles se hacen en la misma mesa del secado**. Pueden **esperar** a que haya una
     persona libre, pero mientras tanto la mascota **sigue ocupando su mesa**.
2. **Hay tres tipos de estación:**

   | Estación | Para qué |
   |---|---|
   | **Tina** | Baño |
   | **Mesa** | Secado y detalles (la misma mesa) |
   | **Estación de corte** | Corte especial del groomer |

3. **Cada etapa necesita una persona** con la habilidad correcta (baña, seca, detalles o corte
   especial), que esté en turno y no esté atendiendo a otra mascota.
4. **La duración depende de la talla y el pelo** de la mascota (matriz del servicio). Los
   **extras con costo** pueden sumar minutos a los detalles.
5. **Opcionales sin costo** (p. ej. shampoo hipoalergénico, corte higiénico): el cliente los marca
   al reservar el baño. Cada uno indica si se hace **en el baño** o **en los detalles**, para que el
   personal lo sepa. **No cambian el precio ni el tiempo.** ⚠️ Pregunta 2
6. **El corte especial** (groomer) es un servicio adicional: se hace **después de los detalles**, en
   la **estación de corte**.
7. **Mascotas que se bañan juntas** (hermanas del mismo dueño): comparten **una tina**, pero cada
   una necesita **su propia persona** en baño y secado, y **su propia mesa**.
   Los detalles y el corte van mascota por mascota.
8. Cada local puede usar el modo **detallado** (todo lo anterior) o el modo **cupo diario**
   (un máximo de mascotas por talla y por día, sin estaciones ni personal). Ver sección 5.

## 2. Qué configura cada spa

| Dónde | Qué | Ejemplo |
|---|---|---|
| Locales → Estaciones | Tinas, mesas (secado y detalles) y estaciones de corte | 2 · 2 · 1 |
| Locales → Horario | Tramos de atención por día | L–V 08:00–12:30 y 13:00–18:00 |
| Locales → Días de cierre | Festivos, vacaciones | 25 de diciembre |
| Locales → Reservas | Intervalo de horarios, días máximos, quién baña seca | cada 15 min · 30 días · sí |
| Personal | Habilidades, turnos por local y ausencias | Groomer solo sábados |
| Servicios → Duraciones | Minutos por etapa según talla × pelo | Mediano corto: 40/30/20 |
| Servicios → Opcionales | Opcionales sin costo y su etapa | Corte higiénico · detalles |

## 3. Reglas, una por una

Cada regla tiene un **código**. Cuando un horario no está disponible, la vista
**"¿Por qué no hay cupo?"** muestra el código y una explicación (HU-C3).

| Código | Regla | Ejemplo del motivo que verá el admin |
|---|---|---|
| `PASADO` | No se ofrecen horarios que ya pasaron. No hay anticipación mínima (D4). | "Este horario ya pasó" |
| `MUY_LEJOS` | No más de *N* días a futuro (por defecto 30). | "Solo se reserva hasta el 25 nov" |
| `CERRADO` | El local no abre ese día o está marcado como cierre. | "El local cierra el 25 dic (Navidad)" |
| `FUERA_DE_HORARIO` | El baño y el secado deben quedar completos dentro de un tramo de atención. ⚠️ Pregunta 1 | "El secado terminaría 12:55 y el local cierra 12:30" |
| `SIN_TINA` | No hay tina libre durante el baño. | "Sin tina libre de 10:00 a 10:40" |
| `SIN_BANADOR` | No hay persona con "baña" en turno y libre. | "Sin bañador libre de 10:00 a 10:40" |
| `SIN_MESA` | No hay mesa libre **justo** al terminar el baño. La mesa queda ocupada hasta que terminen los detalles. | "Sin mesa libre a las 10:40" |
| `SIN_SECADOR` | No hay persona con "seca" libre para el secado. | "Sin persona libre para secar a las 10:40" |
| `SIN_DETALLES` | En lo que queda del día no hay persona con "detalles" libre. | "Nadie libre para los detalles antes del cierre" |
| `SIN_ESTACION_CORTE` | No hay estación de corte libre para el corte especial. | "Estación de corte ocupada hasta el cierre" |
| `SIN_GROOMER` | El corte especial necesita a alguien con "corte especial" en turno ese día. | "No hay groomer el lunes" |
| `SIN_DURACION` | El servicio no tiene duración para esa talla y pelo (no se ofrece). | "Baño no disponible para Gigante · Largo" |
| `SIN_PRECIO` | El local no tiene precio para esa combinación (no se ofrece allí). | "No disponible en Sede Norte" |
| `CUPO_LLENO` | (Modo cupo diario) Ya se alcanzó el máximo de esa talla ese día. | "Cupo de talla L: 6 de 6" |

**Otras reglas**

- **Malla de horarios:** se ofrecen inicios cada *N* minutos (por defecto 15) desde la apertura.
- **Quién baña, seca** (por local): si está activo, la misma persona que baña hace el secado de
  esa mascota; si no, al terminar el baño queda libre y cualquier persona con "seca" puede secar.
- **Los detalles pueden pasar al siguiente tramo** (p. ej. después del almuerzo) mientras la
  mascota espera en su mesa.
- **Asignación de personal:** se elige a la **primera persona disponible** (en orden
  alfabético). El admin puede reasignar después. ⚠️ Pregunta 5
- **Hora estimada de entrega:** el fin de la última etapa (detalles o corte especial).
- **Sobrecupo:** el admin puede forzar una cita aunque no haya cupo, confirmándolo; queda marcado.
- **Dos reservas a la vez por el último cupo:** el sistema garantiza que solo una se confirme;
  la otra ve "Ese horario acaba de ocuparse".

## 4. Escenarios

**Local de ejemplo — "Sede principal"**
- Estaciones: **2 tinas**, **2 mesas** (secado y detalles), **1 estación de corte**.
- Horario: lunes a viernes **08:00–12:30** y **13:00–18:00**; sábado **08:00–13:00**.
- Intervalo de horarios: 15 min. "Quien baña también seca": **sí**.
- Personal:
  - **Ana**: baña, seca, detalles. L–S en todo el horario.
  - **Beto**: baña, seca. L–S en todo el horario.
  - **Caro** (groomer): detalles, corte especial. **Solo sábados** 08:00–13:00.
- Duraciones del **Baño**: Mediano corto **40 / 30 / 20** min (baño / secado / detalles).
- **Corte de raza**: Mediano **60** min.

| # | Dado | Cuando | Entonces |
|---|---|---|---|
| E1 | Agenda vacía, lunes | Max (Mediano, corto) pide **Baño a las 08:00** | Disponible. Baño 08:00–08:40 (tina 1, Ana) → secado 08:40–09:10 (mesa 1, Ana) → detalles 09:10–09:30 (mesa 1, Ana). La mesa 1 queda ocupada de 08:40 a 09:30. **Entrega 09:30** |
| E2 | Las 2 mesas ocupadas de 08:30 a 09:15 | Max pide Baño a las 08:00 (su secado empezaría 08:40) | **No disponible:** `SIN_MESA` "a las 08:40". El primer inicio posible en la malla de 15 min es **08:45** (baño hasta 09:25, secado desde 09:25) |
| E3 | Ana atiende otra cita de 09:00 a 09:45 (es la única con "detalles") | Max pide Baño a las 08:00 | Disponible. Los detalles **esperan**: 09:45–10:05. Max sigue en la mesa 1 de 08:40 a **10:05**. Entrega **10:05** |
| E4 | Ana y Beto están bañando de 10:00 a 10:40 | Otra mascota pide Baño a las 10:00 | **No disponible:** `SIN_TINA` y `SIN_BANADOR` |
| E5 | "Quien baña también seca" = **no**; Beto bañó a Max 08:00–08:40 | Luna pide Baño a las 08:40 | Beto puede bañar a Luna desde las 08:40 porque **otra persona** (Ana) seca a Max |
| E6 | Lola y Pepa (hermanas, Mediano corto) se bañan juntas, agenda vacía | Piden Baño a las 08:00 | Disponible. **1 tina**, **2 personas** en baño (Ana y Beto), **2 mesas** en secado 08:40–09:10. Detalles uno tras otro (solo Ana los hace): Lola 09:10–09:30 y Pepa 09:30–09:50. La mesa de Pepa queda ocupada hasta 09:50. Entrega **09:50** |
| E7 | Una mesa ocupada de 08:30 a 09:30 | Lola y Pepa piden Baño a las 08:00 | **No disponible:** `SIN_MESA` (necesitan 2 mesas libres a las 08:40) |
| E8 | Lunes (Caro no trabaja) | Max pide **Baño + Corte de raza** | **No disponible en todo el día:** `SIN_GROOMER` "No hay groomer el lunes" |
| E9 | Sábado, agenda vacía | Max pide Baño + Corte de raza a las 08:00 | Disponible. Baño 08:00–08:40, secado 08:40–09:10, detalles 09:10–09:30 (mesa), **corte 09:30–10:30** (Caro, estación de corte). Entrega **10:30** |
| E10 | Lunes | Max pide Baño a las **11:45** | **No disponible:** `FUERA_DE_HORARIO` (el secado terminaría 12:55 y el tramo cierra a las 12:30). El último inicio de la mañana es **11:15**: baño 11:15–11:55, secado 11:55–12:25; los detalles esperan y se hacen 13:00–13:20 (Max sigue en su mesa). Entrega **13:20**. ⚠️ Preguntas 1 y 3 |
| E11 | Ana de vacaciones el lunes | Max pide Baño a las 08:00 | **No disponible:** `SIN_DETALLES` (Beto no hace detalles y Caro no trabaja el lunes) |
| E12 | 25 de diciembre marcado como cierre | Cualquier reserva ese día | **No disponible:** `CERRADO` |
| E13 | Hoy es lunes 10:00 | Pedir hoy a las 09:30 · pedir dentro de 31 días | `PASADO` · `MUY_LEJOS` |
| E14 | El extra con costo "Cepillado profundo" suma 10 min | Max pide Baño + Cepillado a las 08:00 | Detalles de **30 min** (20 + 10). Entrega **09:40** |
| E15 | Max pide Baño con los opcionales "Shampoo hipoalergénico" (baño) y "Corte higiénico" (detalles) | Se crea la cita | Mismo precio y horario que E1. La agenda muestra el shampoo en la etapa de baño y el corte higiénico en la de detalles |
| E16 | Queda **1** tina libre a las 08:00 y dos clientes reservan a la vez | Ambos confirman | **Solo una** cita se crea; la otra persona ve "Ese horario acaba de ocuparse" |
| E17 | Agenda llena a las 08:00 | El admin crea una cita a las 08:00 y confirma el sobrecupo | La cita se crea marcada como **sobrecupo** |

## 5. Modo "cupo diario" (alternativa simple)

Para un local que prefiera no configurar estaciones ni personal:

- El admin define **cuántas mascotas de cada talla** atiende por día de la semana, y puede poner
  **excepciones** por fecha.
- Una reserva se acepta si **no supera el cupo** de su talla ese día y la hora está dentro del
  horario. No se asignan estaciones ni personal.
- El calendario muestra la ocupación: mascotas reservadas / cupo, por talla.

| # | Dado | Cuando | Entonces |
|---|---|---|---|
| C1 | Sábado: cupo de **L = 4**; ya hay 4 reservas L | Una mascota L pide el sábado | **No disponible:** `CUPO_LLENO` "Cupo de talla L: 4 de 4" |
| C2 | Igual que C1 | Una mascota **M** pide el sábado | Disponible (si M tiene cupo) |
| C3 | Excepción el 24 dic: cupo L = 2 | 3.ª mascota L ese día | **No disponible** (`CUPO_LLENO` 2 de 2) |

## 6. Preguntas para Spa Perrunos y Gatunos

Cada una tiene un **supuesto** que se usará si no hay respuesta.

1. **¿El baño o el secado pueden terminar después del cierre de un tramo?** Por ejemplo, un
   secado que termina 12:40 cuando se cierra a almorzar a las 12:30.
   *Supuesto: no; baño y secado deben quedar completos dentro del tramo (E10).*
2. **¿Algún opcional sin costo suma tiempo?** Por ejemplo, el corte higiénico.
   *Supuesto: no; si suma tiempo, se crea como extra (con o sin precio).*
3. **Mientras una mascota espera sus detalles, ¿sigue ocupando su mesa?** ¿O se baja a una jaula
   y la mesa queda libre para otra?
   *Supuesto: sigue en su mesa (la mesa queda ocupada, E3 y E10).*
4. **¿Hay un tiempo máximo de espera para los detalles?** Por ejemplo, 60 minutos.
   *Supuesto: sin máximo, mientras terminen antes del cierre del día.*
5. **¿Cómo se reparte el trabajo?** ¿La primera persona libre, o equilibrar la carga del día?
   *Supuesto: la primera persona libre, en orden alfabético; el admin reasigna si quiere.*
6. **¿El secado necesita a una persona todo el tiempo?** ¿O una persona puede vigilar dos
   mascotas en secado a la vez?
   *Supuesto: una persona por mascota durante todo el secado.*
7. **¿El groomer también hace detalles de los baños** cuando no está cortando?
   *Supuesto: sí, si tiene la habilidad "detalles".*
8. **"Otros" servicios solos** (p. ej. solo corte de uñas): ¿se hacen en una mesa y los hace
   alguien con "detalles"?
   *Supuesto: sí.*
9. **Intervalo de horarios:** ¿cada 15 minutos está bien, o prefieren cada 30?
   *Supuesto: 15 (configurable por local).*
10. **¿Usarán el modo detallado desde el inicio, o empiezan con cupo diario** mientras validan?
    *Supuesto: detallado.*
11. **Opcionales de "elegir uno"**: si hay varios shampoos, ¿el cliente debe elegir exactamente
    uno, o los marca libremente?
    *Supuesto: se marcan libremente (casillas).*

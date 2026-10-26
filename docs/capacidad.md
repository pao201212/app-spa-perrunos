# Capacidad y disponibilidad de horarios

> **Estado: BORRADOR para validar con Spa Perrunos y Gatunos** (T34, 2026-10-26)
> Este documento explica, en lenguaje de negocio, **cómo decide el sistema qué horarios ofrecer**.
> Cada escenario de la sección 4 se convertirá en una prueba automática: si una regla cambia,
> primero se cambia aquí (SPEC §5, D24).

---

## 1. Ideas clave

1. **Un baño es una cadena de 3 etapas:** baño → secado → terminado.
   - El **secado empieza justo al terminar el baño**: una mascota mojada no puede esperar.
     Por eso solo se empieza a bañar si al terminar habrá una mesa de secado libre.
   - El **terminado puede esperar**: una mascota ya seca puede esperar su turno.
2. **Cada etapa necesita dos cosas libres al mismo tiempo:** una **estación** del tipo
   correcto (tina, mesa de secado o estación de terminado) y **una persona** con la habilidad
   correcta, que esté en turno y no esté atendiendo a otra mascota.
3. **La duración depende de la talla y el pelo** de la mascota (matriz del servicio). Los
   **extras** pueden sumar minutos al terminado.
4. **El corte especial** (groomer) es un servicio adicional: se hace **después del terminado**,
   en la estación de terminado, y solo lo hace alguien con la habilidad "corte especial".
5. **Mascotas que se bañan juntas** (hermanas del mismo dueño): comparten **una tina**, pero cada
   una necesita **su propia persona** en baño y secado, y **su propia mesa de secado**.
   El terminado y el corte van por separado, mascota por mascota.
6. Cada local puede usar el modo **detallado** (todo lo anterior) o el modo **cupo diario**
   (un máximo de mascotas por talla y por día, sin estaciones ni personal). Ver sección 5.

## 2. Qué configura cada spa

| Dónde | Qué | Ejemplo |
|---|---|---|
| Locales → Estaciones | Cuántas tinas, mesas de secado y estaciones de terminado | 2 · 2 · 1 |
| Locales → Horario | Tramos de atención por día | L–V 08:00–12:30 y 13:00–18:00 |
| Locales → Días de cierre | Festivos, vacaciones | 25 de diciembre |
| Locales → Reservas | Intervalo de horarios, días máximos, quién baña seca | cada 15 min · 30 días · sí |
| Personal | Habilidades, turnos por local y ausencias | Groomer solo sábados |
| Servicios → Duraciones | Minutos por etapa según talla × pelo | Mediano corto: 40/30/20 |

## 3. Reglas, una por una

Cada regla tiene un **código**. Cuando un horario no está disponible, la vista
**"¿Por qué no hay cupo?"** muestra el código y una explicación (HU-C3).

| Código | Regla | Ejemplo del motivo que verá el admin |
|---|---|---|
| `PASADO` | No se ofrecen horarios que ya pasaron. No hay anticipación mínima (D4). | "Este horario ya pasó" |
| `MUY_LEJOS` | No más de *N* días a futuro (por defecto 30). | "Solo se reserva hasta el 25 nov" |
| `CERRADO` | El local no abre ese día o está marcado como cierre. | "El local cierra el 25 dic (Navidad)" |
| `FUERA_DE_HORARIO` | **Cada etapa** debe quedar completa dentro de un tramo de atención. ⚠️ Pregunta 1 | "El baño terminaría 12:40 y el local cierra 12:30" |
| `SIN_TINA` | No hay tina libre durante el baño. | "Sin tina libre de 10:00 a 10:40" |
| `SIN_BANADOR` | No hay persona con "baña" en turno y libre. | "Sin bañador libre de 10:00 a 10:40" |
| `SIN_MESA_SECADO` | No hay mesa libre **justo** al terminar el baño. | "Sin mesa de secado libre a las 10:40" |
| `SIN_SECADOR` | No hay persona con "seca" libre para el secado. | "Sin persona libre para secar a las 10:40" |
| `SIN_TERMINADO` | En lo que queda del día no hay estación de terminado y persona con "terminado" libres. | "Sin turno de terminado antes del cierre" |
| `SIN_GROOMER` | El corte especial necesita a alguien con "corte especial" en turno ese día. | "No hay groomer el lunes" |
| `SIN_DURACION` | El servicio no tiene duración para esa talla y pelo (no se ofrece). | "Baño no disponible para Gigante · Largo" |
| `SIN_PRECIO` | El local no tiene precio para esa combinación (no se ofrece allí). | "No disponible en Sede Norte" |
| `CUPO_LLENO` | (Modo cupo diario) Ya se alcanzó el máximo de esa talla ese día. | "Cupo de talla L: 6 de 6" |

**Otras reglas**

- **Malla de horarios:** se ofrecen inicios cada *N* minutos (por defecto 15) desde la apertura.
- **Quién baña, seca** (por local): si está activo, la misma persona que baña hace el secado de
  esa mascota; si no, al terminar el baño queda libre y cualquier persona con "seca" puede secar.
- **Asignación de personal:** se elige a la **primera persona disponible** (en orden
  alfabético). El admin puede reasignar después. ⚠️ Pregunta 5
- **Hora estimada de entrega:** el fin de la última etapa (terminado o corte especial).
- **Sobrecupo:** el admin puede forzar una cita aunque no haya cupo, confirmándolo; queda marcado.
- **Dos reservas a la vez por el último cupo:** el sistema garantiza que solo una se confirme;
  la otra ve "Ese horario acaba de ocuparse".

## 4. Escenarios

**Local de ejemplo — "Sede principal"**
- Estaciones: **2 tinas**, **2 mesas de secado**, **1 estación de terminado**.
- Horario: lunes a viernes **08:00–12:30** y **13:00–18:00**; sábado **08:00–13:00**.
- Intervalo de horarios: 15 min. "Quien baña también seca": **sí**.
- Personal:
  - **Ana**: baña, seca, terminado. L–S en todo el horario.
  - **Beto**: baña, seca. L–S en todo el horario.
  - **Caro** (groomer): terminado, corte especial. **Solo sábados** 08:00–13:00.
- Duraciones del **Baño**: Mediano corto **40 / 30 / 20** min. Grande largo **55 / 45 / 25**.
- **Corte de raza**: Mediano **60** min.

| # | Dado | Cuando | Entonces |
|---|---|---|---|
| E1 | Agenda vacía, lunes | Max (Mediano, corto) pide **Baño a las 08:00** | Disponible. Baño 08:00–08:40 (tina 1, Ana) → secado 08:40–09:10 (mesa 1, Ana) → terminado 09:10–09:30 (Ana). **Entrega 09:30** |
| E2 | Las 2 mesas de secado ocupadas de 08:30 a 09:15 | Max pide Baño a las 08:00 (su secado empezaría 08:40) | **No disponible:** `SIN_MESA_SECADO` "a las 08:40". El primer inicio posible en la malla de 15 min es **08:45** (baño hasta 09:25, secado desde 09:25) |
| E3 | La estación de terminado ocupada de 09:00 a 09:45 | Max pide Baño a las 08:00 | Disponible. El terminado **espera**: 09:45–10:05. Entrega **10:05** |
| E4 | Ana y Beto están bañando de 10:00 a 10:40 | Otra mascota pide Baño a las 10:00 | **No disponible:** `SIN_BANADOR` (las 2 tinas tampoco están libres) |
| E5 | "Quien baña también seca" = **no**; Beto bañó a Max 08:00–08:40 | Luna pide Baño a las 08:40 | Beto puede bañar a Luna desde las 08:40 porque **otra persona** (Ana) seca a Max |
| E6 | Lola y Pepa (hermanas, Mediano corto) se bañan juntas, agenda vacía | Piden Baño a las 08:00 | Disponible. **1 tina**, **2 personas** en baño (Ana y Beto), **2 mesas** en secado 08:40–09:10. Terminados por separado: Lola 09:10–09:30 y Pepa 09:30–09:50 (1 sola estación). Entrega **09:50** |
| E7 | Una mesa de secado ocupada de 08:30 a 09:30 | Lola y Pepa piden Baño a las 08:00 | **No disponible:** `SIN_MESA_SECADO` (necesitan 2 mesas libres a las 08:40) |
| E8 | Lunes (Caro no trabaja) | Max pide **Baño + Corte de raza** | **No disponible en todo el día:** `SIN_GROOMER` "No hay groomer el lunes" |
| E9 | Sábado, agenda vacía | Max pide Baño + Corte de raza a las 08:00 | Disponible. Baño 08:00–08:40, secado 08:40–09:10, terminado 09:10–09:30, **corte 09:30–10:30** (Caro, estación de terminado). Entrega **10:30** |
| E10 | Lunes | Max pide Baño a las **11:45** | **No disponible:** `FUERA_DE_HORARIO` (el secado terminaría 12:55 y el tramo cierra a las 12:30). El último inicio de la mañana es **11:15**: baño 11:15–11:55, secado 11:55–12:25; el terminado no cabe antes de las 12:30, así que **espera** y se hace 13:00–13:20. Entrega **13:20**. ⚠️ Pregunta 1 |
| E11 | Ana de vacaciones el lunes | Max pide Baño a las 08:00 | **No disponible:** `SIN_TERMINADO` (Beto no hace terminado y Caro no trabaja el lunes) |
| E12 | 25 de diciembre marcado como cierre | Cualquier reserva ese día | **No disponible:** `CERRADO` |
| E13 | Hoy es lunes 10:00 | Pedir hoy a las 09:30 · pedir dentro de 31 días | `PASADO` · `MUY_LEJOS` |
| E14 | El extra "Cepillado profundo" suma 10 min | Max pide Baño + Cepillado a las 08:00 | Terminado de **30 min** (20 + 10). Entrega **09:40** |
| E15 | Queda **1** tina libre a las 08:00 y dos clientes reservan a la vez | Ambos confirman | **Solo una** cita se crea; la otra persona ve "Ese horario acaba de ocuparse" |
| E16 | Agenda llena a las 08:00 | El admin crea una cita a las 08:00 y confirma el sobrecupo | La cita se crea marcada como **sobrecupo** |

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

1. **¿Una etapa puede terminar después del cierre de un tramo?** Por ejemplo, un baño que termina
   12:40 cuando se cierra a almorzar a las 12:30.
   *Supuesto: no; cada etapa debe quedar completa dentro de un tramo (E10).*
2. **¿Hay un tiempo máximo de espera para el terminado?** Por ejemplo, que una mascota seca no
   espere más de 60 minutos.
   *Supuesto: sin máximo, mientras termine antes del cierre del día.*
3. **¿El groomer también hace el terminado normal de los baños?**
   *Supuesto: sí, si tiene la habilidad "terminado" (Caro la tiene).*
4. **¿El corte especial usa la misma estación que el terminado?**
   *Supuesto: sí (la "estación de corte/terminado").*
5. **¿Cómo se reparte el trabajo?** ¿La primera persona libre, o equilibrar la carga del día?
   *Supuesto: la primera persona libre, en orden alfabético; el admin reasigna si quiere.*
6. **¿El secado necesita a una persona todo el tiempo?** ¿O una persona puede vigilar dos
   mascotas en secado a la vez?
   *Supuesto: una persona por mascota durante todo el secado.*
7. **¿Las hermanas se terminan una tras otra o al mismo tiempo** si hay dos estaciones?
   *Supuesto: por separado; si hay estaciones y personas libres, pueden coincidir.*
8. **"Otros" servicios** (p. ej. corte de uñas) solos: ¿ocupan la estación de terminado y alguien
   con "terminado"?
   *Supuesto: sí.*
9. **Intervalo de horarios:** ¿cada 15 minutos está bien, o prefieren cada 30?
   *Supuesto: 15 (configurable por local).*
10. **¿Usarán el modo detallado desde el inicio, o empiezan con cupo diario** mientras validan?
    *Supuesto: detallado.*

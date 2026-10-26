# Capacidad: cómo decide el sistema qué horarios ofrecer

> **Estado: BORRADOR v4 para validar con Spa Perrunos y Gatunos** (T34, 2026-10-26)
> v4: el documento se organiza en dos modos, **Capacidad simple** y **Capacidad avanzada**. La
> capacidad simple se calcula por empleados del día (SPEC D28).
> v5: en los dos modos el cliente ve las **horas disponibles** y una **hora de entrega**.
>
> Cada escenario se convertirá en una prueba automática: si una regla cambia, primero se cambia
> aquí (SPEC §5, D24).

---

## 1. Elegir el modo de cada local

Cada local elige uno de dos modos en **Locales → Capacidad**. Se puede cambiar cuando se quiera.

| | **Capacidad simple** | **Capacidad avanzada** |
|---|---|---|
| **Idea** | "Cada empleado atiende tantas mascotas por día" | Agenda minuto a minuto: tinas, mesas, personas y etapas |
| **Qué hay que configurar** | Cuántos empleados trabajan cada día y cuántas mascotas atiende un empleado por talla | Tinas y mesas, personal con habilidades y turnos |
| **Qué decide** | Si **ese día** todavía hay cupo, y qué horas de llegada permiten entregar antes del cierre | Si **a esa hora** hay tina, mesa y personas libres |
| **Horas disponibles** | Todas las del horario cuya entrega estimada queda antes del cierre | Solo las horas en que todo está libre |
| **Hora de entrega** | **Aproximada:** llegada + duración del servicio | **Calculada** con las esperas reales de la agenda |
| **Recomendado para** | Empezar, o locales pequeños | Locales con mucha demanda que quieren llenar cada hora |

Lo que es igual en los dos modos está en la sección 2. Luego cada modo tiene su propia sección:
**3. Capacidad simple** y **4. Capacidad avanzada**.

## 2. Reglas para los dos modos

| Código | Regla | Ejemplo del motivo que verá el admin |
|---|---|---|
| `PASADO` | No se ofrecen horarios que ya pasaron. No hay anticipación mínima. | "Este horario ya pasó" |
| `MUY_LEJOS` | No más de *N* días a futuro (por defecto 30). | "Solo se reserva hasta el 25 nov" |
| `CERRADO` | El local no abre ese día o está marcado como cierre. | "El local cierra el 25 dic (Navidad)" |
| `SIN_PRECIO` | El local no tiene precio para esa talla y pelo. | "No disponible en Sede Norte" |

- **Al reservar, el cliente ve la lista de horas disponibles del día y, en cada una, la hora de
  entrega**, por ejemplo: "08:00 · entrega aprox. 09:30". Las horas van cada *N* minutos (por
  defecto 15) dentro del horario del local.
- **La duración del servicio** sale de **Servicios → Duraciones** (talla × pelo), en los dos modos:
  baño + secado + detalles, más el corte especial y los extras que sumen minutos.
- **Si el trabajo cruza el cierre del mediodía**, ese tiempo no cuenta: la mascota espera y se
  sigue después del almuerzo.
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
| Locales → Capacidad | **Mascotas que atiende un empleado en un día**, por talla | Grande 4 · Mediano 6 · Pequeño 8 |
| Locales → Capacidad | **Empleados por día de la semana** | L–V: 2 · Sábado: 3 · Domingo: 0 |
| Locales → Capacidad | **Cambios por fecha** (vacaciones, incapacidad, refuerzo) | 24 dic: 1 empleado |
| Locales → Horario y Días de cierre | Lo mismo de siempre | L–V 08:00–12:30 y 13:00–18:00 |
| Servicios → Duraciones | Lo mismo de siempre (solo para estimar la entrega) | Baño mediano corto: 40 / 30 / 20 |

No hace falta registrar tinas, mesas ni turnos.

### 3.2 Cómo se calcula

Piensa en la **jornada de un empleado**: en un día puede atender **4 grandes**, **o 6 medianos**,
**o 8 pequeños**, o una mezcla. Cada mascota usa una parte de esa jornada:

| Talla | Un empleado al día | Cada mascota usa |
|---|---|---|
| Grande | 4 | ¼ de jornada |
| Mediano | 6 | ⅙ de jornada |
| Pequeño | 8 | ⅛ de jornada |

**El día tiene tantas jornadas como empleados trabajen.** Con 2 empleados hay 2 jornadas: se
duplica la capacidad. Con 1 empleado se reduce a la mitad. Con 3 se triplica.

**Una reserva cabe si, sumando lo que usan las mascotas ya reservadas y las nuevas, no se pasa de
las jornadas del día.** El cálculo es exacto: no se redondea.

Ejemplo, lunes con 2 empleados (2 jornadas):

| Ya reservado | Usa | Queda | Todavía caben |
|---|---|---|---|
| Nada | 0 | 2 jornadas | 8 grandes, o 12 medianos, o 16 pequeños |
| 2 grandes + 3 medianos | ½ + ½ = 1 jornada | 1 jornada | 4 grandes, o 6 medianos, o 8 pequeños |
| 4 grandes + 6 medianos | 1 + 1 = 2 jornadas | 0 | Nada: día lleno |

**Horas disponibles y entrega.** Si el día tiene cupo, se ofrecen todas las horas del horario.
La **entrega aproximada** es la hora de llegada más la duración del servicio. Si esa entrega
quedaría después del cierre, esa hora no se ofrece. Es aproximada porque este modo no mira las
demás mascotas del día; el spa puede ajustarla en la cita. ⚠️ Pregunta 8

| Código | Regla | Ejemplo del motivo |
|---|---|---|
| `SIN_EMPLEADOS` | Ese día no hay empleados (0). | "No hay empleados el domingo" |
| `CUPO_LLENO` | Las mascotas nuevas no caben en las jornadas que quedan. | "Quedan ⅙ de jornada: cabe 1 mediano, no 1 grande" |
| `FUERA_DE_HORARIO` | La entrega aproximada quedaría después del cierre. | "Entregaría 18:30 y el local cierra 18:00" |

### 3.3 Escenarios

**Local de ejemplo — "Sede principal"**: un empleado atiende al día **Mini 10 · Pequeño 8 ·
Mediano 6 · Grande 4 · Muy grande 3 · Gigante 2**. Empleados: **L–V 2**, **sábado 3**,
**domingo 0**. Horario L–V **08:00–12:30** y **13:00–18:00**. Baño de un Mediano corto:
40 + 30 + 20 = **90 min**.

| # | Dado | Cuando | Entonces |
|---|---|---|---|
| S1 | Lunes sin reservas | Llega una reserva de un Grande | Disponible. Ese día caben hasta 8 grandes |
| S2 | Lunes con 8 grandes reservados | Piden 1 Pequeño | **No disponible:** `CUPO_LLENO` (las 2 jornadas están llenas) |
| S3 | Lunes con 4 grandes (1 jornada) | Piden 6 medianos, uno tras otro | Todos disponibles. Al 7.º mediano: `CUPO_LLENO` |
| S4 | Lunes con 2 grandes y 3 medianos (1 jornada) | Piden 1 Gigante | Disponible (usa ½ jornada; queda ½) |
| S5 | 24 dic (miércoles) cambiado a **1 empleado** | Piden el 5.º Grande del día | **No disponible:** `CUPO_LLENO` (con 1 empleado caben 4 grandes) |
| S6 | Sábado (3 empleados) sin reservas | Piden Grandes | Caben hasta **12** |
| S7 | Domingo | Cualquier reserva | **No disponible:** `SIN_EMPLEADOS` |
| S8 | Lunes: queda ⅙ de jornada | Lola y Pepa (2 medianos, juntas) piden | **No disponible** ninguna: juntas necesitan ⅓ de jornada |
| S9 | Lunes: queda ⅙ de jornada y dos clientes piden 1 mediano a la vez | Ambos confirman | Solo una cita se crea |
| S10 | Lunes con cupo | Max (Mediano corto) mira las horas para Baño | Ve 08:00 · entrega aprox. **09:30**; 08:15 · **09:45**; … hasta 16:30 · **18:00** |
| S11 | Lunes con cupo | Max quiere llegar a las **17:00** | **No se ofrece:** `FUERA_DE_HORARIO` (entregaría 18:30) |
| S12 | Lunes con cupo | Max llega a las **11:30** | Disponible. 60 min antes del almuerzo + 30 min después: entrega aprox. **13:30** |

---

## 4. Capacidad avanzada

### 4.1 Qué configura el spa

Para activar este modo hay que tener **todo** lo siguiente. Si falta algo, el sistema lo avisa y
no deja activarlo.

| Dónde | Qué | Ejemplo |
|---|---|---|
| Locales → Estaciones | Tinas y mesas; qué mesas sirven también para corte especial | Tina 1, Tina 2, Mesa 1 (corte), Mesa 2 |
| Personal | Empleados, sus **habilidades** (baña, seca, detalles, corte especial), **turnos** por local y ausencias | Groomer solo sábados |
| Servicios → Duraciones | Minutos de cada etapa según talla y pelo | Mediano corto: 40 / 30 / 20 |
| Locales → Reservas | Si quien baña también seca | Sí |

### 4.2 Cómo se calcula

1. **Un baño es una cadena de 3 etapas: baño → secado → detalles.**
   - **Detalles** = limpiar orejas, cortar uñas, corte higiénico, perfume, tijera en las patas…
   - El **secado empieza justo al terminar el baño** (una mascota mojada no espera). Solo se empieza
     a bañar si al terminar habrá una mesa libre.
   - Los **detalles se hacen en la misma mesa** del secado. Pueden esperar a que se libere una
     persona, pero la mascota **sigue ocupando su mesa**.
2. **Estaciones:** la **tina** es para bañar; la **mesa**, para secado y detalles. Las mesas
   marcadas "corte especial" sirven además para el corte.
3. **Corte especial** (groomer): se hace después de los detalles, **en la misma mesa**. Por eso una
   mascota con corte necesita, desde el secado, una mesa marcada para corte.
4. **Cada etapa necesita una persona** con la habilidad correcta, en turno y libre.
5. **Mascotas juntas:** comparten una tina, pero cada una necesita su propia persona en baño y
   secado y su propia mesa.
6. **Opcionales sin costo** (shampoo, corte higiénico…): se muestran en la etapa de baño o de
   detalles. No cambian el precio ni el tiempo.
7. **Extras con costo** pueden sumar minutos a los detalles.
8. **Hora de entrega** = fin de los detalles (o del corte especial).
9. **Asignación:** se elige a la primera persona libre (orden alfabético). El admin puede
   reasignar.

| Código | Regla | Ejemplo del motivo |
|---|---|---|
| `FUERA_DE_HORARIO` | Baño y secado deben terminar dentro del horario. | "El secado terminaría 12:55 y el local cierra 12:30" |
| `SIN_TINA` | No hay tina libre durante el baño. | "Sin tina libre de 10:00 a 10:40" |
| `SIN_BANADOR` | No hay persona con "baña" libre. | "Sin bañador libre de 10:00 a 10:40" |
| `SIN_MESA` | No hay mesa libre **justo** al terminar el baño. | "Sin mesa libre a las 10:40" |
| `SIN_MESA_CORTE` | Lleva corte y no hay **mesa de corte** libre al terminar el baño. | "Sin mesa para corte especial a las 08:40" |
| `SIN_SECADOR` | No hay persona con "seca" libre. | "Sin persona libre para secar a las 10:40" |
| `SIN_DETALLES` | Nadie con "detalles" libre antes del cierre. | "Nadie libre para los detalles antes del cierre" |
| `SIN_GROOMER` | Nadie con "corte especial" en turno ese día. | "No hay groomer el lunes" |
| `SIN_DURACION` | El servicio no tiene duración para esa talla y pelo. | "Baño no disponible para Gigante · Largo" |

### 4.3 Escenarios

**Local de ejemplo — "Sede principal"**
- Estaciones: **Tina 1**, **Tina 2**, **Mesa 1** (también corte especial) y **Mesa 2**.
- Horario: L–V **08:00–12:30** y **13:00–18:00**; sábado **08:00–13:00**. Horarios cada 15 min.
- Quien baña también seca: **sí**.
- Personal: **Ana** (baña, seca, detalles; L–S) · **Beto** (baña, seca; L–S) · **Caro**, groomer
  (detalles, corte especial; **solo sábados**).
- Baño, Mediano corto: **40 / 30 / 20** min. Corte de raza, Mediano: **60** min.

| # | Dado | Cuando | Entonces |
|---|---|---|---|
| A1 | Agenda vacía, lunes | Max (Mediano corto) pide Baño a las 08:00 | Disponible. Baño 08:00–08:40 (Tina 1, Ana) → secado 08:40–09:10 → detalles 09:10–09:30 (Mesa 1, Ana). **Entrega 09:30** |
| A2 | Las 2 mesas ocupadas de 08:30 a 09:15 | Max pide Baño a las 08:00 | **No:** `SIN_MESA` "a las 08:40". Primer inicio posible: **08:45** |
| A3 | Ana ocupada de 09:00 a 09:45 (única con "detalles") | Max pide Baño a las 08:00 | Disponible. Detalles **esperan**: 09:45–10:05, Max sigue en la mesa. Entrega **10:05** |
| A4 | Ana y Beto bañando de 10:00 a 10:40 | Otra mascota pide Baño a las 10:00 | **No:** `SIN_TINA` y `SIN_BANADOR` |
| A5 | Quien baña seca = **no**; Beto bañó a Max 08:00–08:40 | Luna pide Baño a las 08:40 | Beto puede bañar a Luna: Ana seca a Max |
| A6 | Lola y Pepa (juntas), agenda vacía | Piden Baño a las 08:00 | Disponible. 1 tina, 2 personas, 2 mesas. Detalles: Lola 09:10–09:30, Pepa 09:30–09:50. Entrega **09:50** |
| A7 | Una mesa ocupada de 08:30 a 09:30 | Lola y Pepa piden Baño a las 08:00 | **No:** `SIN_MESA` (necesitan 2 mesas) |
| A8 | Lunes (Caro no trabaja) | Max pide Baño + Corte de raza | **No en todo el día:** `SIN_GROOMER` |
| A9 | Sábado, agenda vacía | Max pide Baño + Corte de raza a las 08:00 | Disponible. Secado, detalles y **corte 09:30–10:30** en la **Mesa 1**. Entrega **10:30** |
| A10 | Lunes | Max pide Baño a las 11:45 | **No:** `FUERA_DE_HORARIO`. Último inicio de la mañana: **11:15**; los detalles se hacen 13:00–13:20. Entrega **13:20** |
| A11 | Ana de vacaciones el lunes | Max pide Baño a las 08:00 | **No:** `SIN_DETALLES` |
| A12 | El extra "Cepillado profundo" suma 10 min | Max pide Baño + Cepillado a las 08:00 | Detalles de 30 min. Entrega **09:40** |
| A13 | Max pide Baño con "Shampoo hipoalergénico" (baño) y "Corte higiénico" (detalles) | Se crea la cita | Mismo precio y horario que A1; la agenda muestra cada opcional en su etapa |
| A14 | Sábado; la Mesa 1 (única de corte) ocupada de 08:30 a 10:00; Mesa 2 libre | Max pide Baño + Corte a las 08:00 | **No:** `SIN_MESA_CORTE`. Baño solo sí está disponible (Mesa 2) |

---

## 5. Preguntas para Spa Perrunos y Gatunos

Cada una tiene un **supuesto** que se usará si no hay respuesta.

**Generales**

1. **¿Con qué modo empiezan?**
   *Supuesto: capacidad simple, y pasan a la avanzada cuando tengan todo configurado.*
2. **Opcionales de "elegir uno":** si hay varios shampoos, ¿el cliente elige solo uno o marca
   varios?
   *Supuesto: marca libremente.*

**Capacidad simple**

3. **¿"4 grandes o 6 medianos o 8 pequeños" es lo que hace un empleado, o lo que hacen todos
   juntos?**
   *Supuesto: lo que hace **un** empleado; el total del día se multiplica por los empleados.*
4. **¿Hay que limitar cuántas mascotas llegan a la misma hora?** Por ejemplo, no más de 2 a las
   08:00 si hay 2 empleados.
   *Supuesto: no; solo se controla el total del día.*
5. **¿El corte especial cuenta más?** Por ejemplo, un baño con corte de un mediano ocupa como un
   grande.
   *Supuesto: cuenta igual que un baño de su talla.*
6. **¿Los servicios solos** (p. ej. solo corte de uñas) usan cupo?
   *Supuesto: no usan cupo.*
7. **¿El número de empleados por día sale del módulo Personal?** ¿O prefieren escribirlo a mano en
   el local?
   *Supuesto: a mano en el local (más simple).*
8. **¿La entrega aproximada debe sumar un margen?** Por ejemplo, 30 minutos más, porque puede
   haber otras mascotas antes.
   *Supuesto: sin margen; el spa ajusta la hora en la cita si hace falta.*

**Capacidad avanzada**

9. **¿El baño o el secado pueden terminar después del cierre de un tramo?**
   *Supuesto: no (A10).*
10. **¿Algún opcional sin costo suma tiempo?**
   *Supuesto: no; si suma tiempo, se crea como extra.*
11. **Mientras espera sus detalles, ¿la mascota sigue en su mesa?** ¿O se baja a una jaula?
    *Supuesto: sigue en su mesa (A3, A10).*
12. **¿Hay un tiempo máximo de espera para los detalles?**
    *Supuesto: sin máximo, mientras terminen antes del cierre.*
13. **¿Cómo se reparte el trabajo?** ¿Primera persona libre, o equilibrar la carga?
    *Supuesto: primera persona libre; el admin reasigna.*
14. **¿Una persona puede vigilar dos mascotas en secado a la vez?**
    *Supuesto: no; una persona por mascota.*
15. **¿El groomer también hace detalles** cuando no está cortando?
    *Supuesto: sí, si tiene esa habilidad.*
16. **Intervalo de horarios:** ¿cada 15 minutos, o cada 30?
    *Supuesto: 15 (configurable por local).*

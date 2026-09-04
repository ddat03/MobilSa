# SaaS Multi-Negocio (Ecommerce + Restaurantes) — Plan de app y prompts para VS Code

Documento de referencia para construir el **SaaS de Diego**: una plataforma que él administra y que le permite, cada vez que consigue un cliente nuevo, activarle uno de dos tipos de negocio —**tienda online (ropa u otros productos)** o **restaurante**— y personalizarlo rápido sin reprogramar desde cero. Nombre de trabajo: sin definir todavía (puede quedar como "Panel de Negocios" o algo parecido; cámbialo cuando quieras).

---

## 0. Decisiones ya tomadas

Para no repetir la conversación, estas son las decisiones que ya se tomaron y que el resto del documento da por hechas:

1. **Arquitectura: multi-tenant.** Una sola plataforma (un solo código, una sola base de datos) sirve a todos los clientes. Cada cliente es un registro "negocio" con su propia configuración, catálogo/menú y pedidos. Diego entra a un panel central (super-admin) y desde ahí crea, activa y edita cada negocio — no se clona un proyecto por cliente.
2. **Verificación de pagos: manual, con alerta por bot.** Cuando alguien sube un comprobante, el pedido/reserva queda "pendiente de revisar" y llega una alerta con la foto a un bot para que Diego (o el dueño del negocio) la revise a simple vista y apruebe o rechace. Arranca en **Telegram** (ya tiene el bot) y se deja listo para sumar **WhatsApp** más adelante sin rehacer la lógica.
3. **Asistente conversacional para pedidos/reservas: piloto en Telegram, listo para WhatsApp después.** La lógica de conversación (ver menú, armar pedido, reservar mesa, subir comprobante) se separa del canal por el que llega, para poder conectar WhatsApp (probablemente con Baileys, la librería no oficial y gratuita) el día que un cliente lo necesite, sin tocar el core del asistente.

---

## 1. Resumen del modelo de negocio

- **Quién lo usa:** Diego (super-admin, dueño de la plataforma) y, dentro de cada negocio, el dueño del negocio/cliente de Diego (admin del negocio) y los clientes finales de ese negocio (compradores/comensales).
- **Cómo entra un cliente nuevo:** Diego crea el negocio desde su panel, elige el tipo de servicio (tienda o restaurante), le pone nombre/logo/colores, configura su cuenta de cobro (Pichincha y/o Mi Vecino) y le da acceso al dueño del negocio para que administre su catálogo/menú y vea sus pedidos.
- **Los dos tipos de servicio:**
  - **Tienda online (ropa u otros productos)** — el que ya tienes construido; aquí se adapta al modelo multi-tenant para poder reutilizarlo con clientes nuevos.
  - **Restaurante** — nuevo: menú, reservación de mesa con anticipo, pedido para recoger en el local, pedido a domicilio.
- **Canales de venta:** sitio web público del negocio (con su propio slug o subdominio) y, en el futuro, el asistente conversacional (Telegram ahora, WhatsApp después).
- **Modelo de entrega (ver Parte II.0):** no es autoservicio puro. La mayoría de clientes entran como un tenant estándar que Diego deja personalizado por configuración (colores, logo, catálogo, cobro) sin escribir código; los que piden algo fuera de eso se atienden clonando la misma base como deploy dedicado. En ambos casos se parte de este sistema, no de cero.
- **Pago:** transferencia a cuenta Banco Pichincha o depósito en un punto **Mi Vecino** (la red de puntos de cobro en efectivo de Pichincha — confirmado que es un servicio real y vigente, ver fuentes al final). El cliente sube la foto del comprobante y queda pendiente de aprobación humana.

---

## 2. Stack técnico sugerido

| Capa | Herramienta | Por qué |
|---|---|---|
| Backend / base de datos | **Supabase** (ya tienes un proyecto activo de e-commerce) | Postgres real con **Row Level Security (RLS)**, que es la forma más limpia de aislar los datos de cada negocio en una sola base multi-tenant. Ya tienes cuenta y experiencia con él. |
| Frontend web | **Next.js + TypeScript** | Rutas por negocio (`/tienda/[slug]`), panel super-admin y panel de negocio como áreas separadas con roles distintos, todo en el mismo proyecto. |
| Autenticación y roles | **Supabase Auth** | Tres roles: `super_admin` (Diego), `dueno_negocio`, `cliente_final` (opcional, puede comprar como invitado). |
| Fotos (comprobantes, productos, platos, logos) | **Supabase Storage** | Mismo proyecto, sin cuenta adicional. |
| Alertas de verificación de pago | **n8n** (ya instalado, self-hosted) escuchando cambios en Supabase y enviando el mensaje a Telegram con botones "Aprobar" / "Rechazar" | Evita programar un backend de bot aparte solo para esto — n8n ya sabe hablar con Telegram y con Supabase, y es fácil de ajustar sin tocar código cuando cambien las reglas. |
| Asistente conversacional (pedidos/reservas) | **Node.js + Telegraf** (Telegram) con una capa de "core de conversación" separada del canal | Arranca en Telegram sin costo ni aprobación de Meta. El día que quieras sumar WhatsApp, se agrega un adapter nuevo (Baileys, o la API oficial de Meta si el negocio ya factura por ahí) que llama al mismo core, sin reescribir la lógica de pedidos/reservas. |
| Notificaciones internas | **Bot de Telegram existente** | Reutilizado tanto para las alertas de verificación de pago como, opcionalmente, para avisos de nuevos pedidos al dueño del negocio. |

> Nota sobre WhatsApp a futuro: existen dos caminos cuando llegue el momento — **Baileys/whatsapp-web.js** (gratis, se conecta escaneando un QR con el número del negocio, pero no es un canal oficial y hay un riesgo bajo de que Meta banee el número si detecta uso automatizado agresivo) o la **API oficial de WhatsApp Business de Meta** (estable y pensada para negocios que facturan por ahí, pero cobra por conversación iniciada y exige verificar el negocio ante Meta). Para pilotar en Telegram no hace falta decidir esto todavía.

> Nota sobre pagos a futuro: Nuvei ofrece integración con "Pichincha Mi Vecino" como método de pago alternativo (APM) para cobrar de forma automática en vez de revisar comprobantes a mano. No hace falta ahora, pero si el volumen de pedidos crece mucho vale la pena evaluarlo más adelante para reducir la revisión manual.

---

## 3. Arquitectura (cómo funciona por dentro)

```
[Diego, panel super-admin]
   → crea un negocio nuevo → elige tipo_servicio (tienda | restaurante)
   → configura nombre, logo, colores, cuenta Pichincha / código Mi Vecino
   → invita al dueño del negocio (o lo administra él mismo al inicio)

[Sitio público del negocio — /tienda/[slug]]
   → catálogo de productos O menú del restaurante (según tipo_servicio)
   → cliente arma pedido / reserva mesa con anticipo / pide recoger o a domicilio
   → sube foto del comprobante de pago
   → pedido/reserva queda en estado "pago en revisión"

[n8n — cola de verificación]
   → detecta el nuevo comprobante en Supabase
   → envía a Telegram: foto + monto + negocio + botones "Aprobar"/"Rechazar"
   → al presionar un botón, n8n actualiza el estado en Supabase
   → el cliente ve el cambio de estado reflejado en el sitio (o le llega aviso)

[Asistente conversacional — Telegram hoy, WhatsApp mañana]
   → mismo flujo que el sitio web (ver menú/catálogo, armar pedido, reservar,
     subir comprobante) pero por chat
   → el "core" de la conversación no sabe si está en Telegram o WhatsApp:
     solo el adapter de canal cambia

[Panel del dueño del negocio]
   → gestiona su catálogo/menú, ve sus pedidos y reservas, su propia cola de
     pagos pendientes, horarios y zonas de envío
```

---

## 4. Estructura de paneles

1. **Panel Super-Admin (Diego)**
   - Lista de negocios (nombre, tipo de servicio, estado: prueba/activo/suspendido).
   - Crear negocio nuevo → formulario: nombre, slug, tipo de servicio, logo, colores, cuenta Pichincha, código Mi Vecino, chat de Telegram para sus alertas.
   - Ver, por negocio, su cola de pagos pendientes de revisión (o filtrar todas juntas).
   - Activar/desactivar un negocio (por ejemplo si el cliente deja de pagarte a ti el servicio).

2. **Panel del Negocio (dueño/cliente de Diego)**
   - Si es tienda: productos (nombre, precio, stock, tallas/variantes, fotos), categorías.
   - Si es restaurante: menú (categorías y platos con foto, precio, disponibilidad), horarios de atención, mesas disponibles para reservar, zonas y costos de envío.
   - Pedidos y reservas con su estado actual.
   - Su propia cola de comprobantes pendientes de aprobar (además de la alerta por Telegram).
   - Configuración de cobro: número de cuenta Pichincha, código de punto Mi Vecino.

3. **Sitio público del negocio** (`/tienda/[slug]`)
   - Tienda: catálogo, carrito, checkout con datos de envío y subida de comprobante.
   - Restaurante: menú, y tres flujos de compra — **reservar mesa con anticipo**, **pedir para recoger**, **pedir a domicilio** — cada uno terminando en subida de comprobante.

4. **Asistente conversacional** (Telegram ahora)
   - Mismos flujos que el sitio público, pero conversacionales: ver menú/catálogo, armar pedido, reservar, subir foto del comprobante desde el chat.

---

## 5. Módulo Tienda (ropa u otros productos)

Ya está construido como sitio individual. Lo que falta para este plan es **adaptarlo al modelo multi-tenant**: en vez de una tienda fija, se convierte en la plantilla que se activa para cualquier negocio con `tipo_servicio = tienda`, leyendo su catálogo, colores y logo según el `negocio_id`. Antes de programar, conviene decidir si migras tu tienda actual como el primer "negocio" dentro de esta plataforma nueva, o si la dejas funcionando aparte y usas la plataforma nueva solo para clientes nuevos (queda como pregunta abierta para cuando arranques en VS Code — no hace falta resolverla en este documento).

> **Ver la Parte II (más abajo)** para el detalle exacto de qué ya existe en este repo y qué falta — el módulo tienda está ~80% hecho, sólo le falta la parametrización por slug y la subida de comprobante.

---

## 6. Módulo Restaurante

- **Menú:** categorías (entradas, fuertes, bebidas, postres, etc.) y platos con nombre, descripción, precio, foto y disponibilidad (activo/agotado del día).
- **Reservación con pago anticipado:** el cliente elige fecha, hora, número de personas, ve el anticipo requerido, sube el comprobante y la reserva queda pendiente de aprobación.
- **Recoger en el local (pickup):** el cliente arma su pedido del menú, elige hora aproximada de recogida, paga por adelantado (mismo flujo de comprobante) y el pedido pasa a "preparando" una vez aprobado el pago.
- **Envío a domicilio (delivery):** igual que pickup, pero con dirección de entrega y costo de envío (fijo o por zona, configurable por el dueño del negocio).
- **Estados de un pedido/reserva:** `pendiente_pago` → `pago_en_revision` → `pagado` → `preparando` → `listo_o_en_camino` → `entregado` (o `cancelado`/`rechazado` en cualquier punto antes de `pagado`).

---

## 7. Pagos y verificación anti-fraude

- **Métodos de cobro por negocio:** transferencia a una cuenta Banco Pichincha propia del negocio, y/o un código de punto **Mi Vecino** (red de agentes de cobro en efectivo de Banco Pichincha, presente en los 221 cantones del país — confirmado en fuentes oficiales, ver abajo).
- **Flujo:** el cliente paga por su cuenta (transferencia o depósito en un punto Mi Vecino) y sube la foto del comprobante al hacer el pedido/reserva. No hay conexión automática al banco — la plataforma no puede confirmar el pago por sí sola.
- **Cola de revisión:** cada comprobante subido crea un registro en `pagos_verificacion` con estado `pendiente`. n8n detecta el registro nuevo y manda la alerta a Telegram (foto + datos del pedido + botones Aprobar/Rechazar) al chat configurado para ese negocio. Al aprobar o rechazar, n8n actualiza Supabase y el pedido/reserva cambia de estado automáticamente.
- **Por qué así y no automático:** los bancos ecuatorianos no ofrecen a un negocio pequeño una forma sencilla de verificar en tiempo real que una transferencia específica llegó y no fue alterada — por eso el punto de control real es una persona mirando la imagen, y el bot solo hace que esa revisión sea rápida y no se pierda ningún comprobante.

---

## 8. Asistente conversacional (Telegram ahora, WhatsApp después)

La idea es separar el proyecto en dos capas desde el inicio:

- **Core de conversación:** conoce el negocio (por el chat_id o número asociado a un `negocio_id`), sabe mostrar el menú/catálogo, arma el carrito o la reserva, pide los datos que faltan, y al final pide la foto del comprobante y crea el registro correspondiente en Supabase. No sabe nada de Telegram ni de WhatsApp en particular.
- **Adapter de canal:** traduce lo que llega de Telegram (o de WhatsApp más adelante) al formato que entiende el core, y traduce las respuestas del core de vuelta al formato de ese canal. Hoy solo existe el adapter de Telegram (con Telegraf); el día que haga falta, se agrega un adapter de WhatsApp sin tocar el core.

> **✅ Implementado (2026-09-04) — `apps/bot/`, en paquete nuevo del monorepo.**
> Primera versión fue una máquina de estados a comandos (`/negocio slug`, escribir el
> número del ítem) — Diego pidió que se sienta como hablar de verdad, sin comandos.
> El core se reescribió como **agente LLM con tool-calling** (Claude Haiku 4.5, misma
> cuenta `ANTHROPIC_API_KEY` que ya usa el resto de sus proyectos):
> - `src/core/agent.ts` — el loop de conversación: le manda a Claude el historial +
>   las tools disponibles, ejecuta las tools que pida, hasta que devuelve una
>   respuesta en texto plano para el cliente.
> - `src/core/tools.ts` — las acciones reales (`buscar_items`, `agregar_al_carrito`,
>   `guardar_datos_cliente`, `elegir_metodo_pago`, `confirmar_pedido`, etc.), todas
>   funciones TypeScript deterministas contra Supabase — el LLM decide *cuándo*
>   llamarlas, nunca inventa precios ni escribe la base directamente.
> - `src/core/db.ts` — acceso a datos (negocio, catálogo/menú, estado de la
>   conversación en `conversaciones_bot.estado_flujo`, creación del pedido).
> - **La foto del comprobante sigue siendo 100% determinista** (no pasa por el LLM):
>   se sube a Storage y se crea el pedido + `pagos_verificacion` en código, y recién
>   ahí se le pide al LLM que le cuente el resultado al cliente con sus palabras —
>   así un total o número de referencia nunca puede salir mal parafraseado.
> - `src/channels/telegram.ts` — adapter (sin botones ni comandos, solo texto).
>   `src/channels/whatsapp.ts` — stub documentado, mismo patrón.
> Bot de pruebas: `@pruebasddat_bot` (token en `apps/bot/.env`, no en este documento) —
> reusable para futuros proyectos, ya anotado en el `CLAUDE.md` global.

---

## 9. Modelo de datos (Supabase / Postgres)

> **Este es el modelo "ideal" del plan.** En la Parte II está el mapeo tabla por tabla contra el schema que ya existe en `supabase/migrations/` — varias de estas tablas ya están creadas con otro nombre (`negocios` → `store_config`, `usuarios_negocio` → `profiles.store_id`, `pedidos_tienda` → `orders`, etc.). No hay que crear todo de cero.

```
negocios
  id, nombre, slug, tipo_servicio ('tienda' | 'restaurante'),
  logo_url, colores (json), estado ('prueba' | 'activo' | 'suspendido'),
  cuenta_pichincha (json: banco, numero_cuenta, tipo_cuenta, titular),
  punto_mi_vecino_codigo, telegram_chat_id_alertas, telefono_whatsapp (null por ahora),
  fecha_creacion

usuarios_negocio
  id, negocio_id, user_id (Supabase Auth), rol ('dueno' | 'staff')

-- Módulo tienda
productos
  id, negocio_id, nombre, descripcion, precio, stock, categoria,
  variantes (json: tallas/colores), fotos (json), activo

pedidos_tienda
  id, negocio_id, cliente_nombre, cliente_telefono, canal ('web'|'telegram'|'whatsapp'),
  items (json), subtotal, costo_envio, total, direccion_envio,
  metodo_pago ('pichincha'|'mi_vecino'), comprobante_url,
  estado ('pendiente_pago'|'pago_en_revision'|'pagado'|'preparando'|'enviado'|'entregado'|'cancelado'),
  fecha_creacion

-- Módulo restaurante
menu_categorias
  id, negocio_id, nombre, orden

menu_platos
  id, negocio_id, categoria_id, nombre, descripcion, precio, foto_url, disponible

reservaciones
  id, negocio_id, cliente_nombre, cliente_telefono, fecha, hora, numero_personas,
  anticipo_monto, metodo_pago, comprobante_url,
  estado ('pendiente_pago'|'pago_en_revision'|'confirmada'|'cancelada'|'completada'),
  canal, fecha_creacion

pedidos_restaurante
  id, negocio_id, modalidad ('recoger'|'domicilio'), cliente_nombre, cliente_telefono,
  items (json), direccion_envio (null si es recoger), costo_envio, total,
  metodo_pago, comprobante_url,
  estado ('pendiente_pago'|'pago_en_revision'|'pagado'|'preparando'|'listo_o_en_camino'|'entregado'|'cancelado'),
  canal, fecha_creacion

-- Compartido entre ambos módulos
pagos_verificacion
  id, negocio_id, referencia_tipo ('pedido_tienda'|'pedido_restaurante'|'reservacion'),
  referencia_id, comprobante_url, monto_declarado,
  estado ('pendiente'|'aprobado'|'rechazado'), revisado_por, fecha_revision, notas

conversaciones_bot
  id, negocio_id, canal ('telegram'|'whatsapp'), canal_user_id,
  estado_flujo (json), ultima_interaccion
```

Todas las tablas (menos `negocios`) llevan `negocio_id` y se protegen con **RLS de Supabase**: un `dueno_negocio` solo puede leer/escribir filas de su propio `negocio_id`; el `super_admin` (Diego) puede ver todo.

---

## 10. Identidad visual

- El **panel super-admin** y el **panel de negocio** tienen su propio tema fijo, neutro y profesional (por ejemplo azul oscuro `#1E3A5F` con acentos grises), para que se sienta como una herramienta de trabajo, no como la tienda de un cliente.
- El **sitio público de cada negocio** usa los colores y logo que Diego configura al crear ese negocio (`colores` en la tabla `negocios`) — así cada cliente puede sentir que tiene "su" sitio, aunque por dentro sea la misma plataforma.
- El **asistente conversacional** puede mencionar el nombre del negocio al inicio de cada conversación para que quede claro con cuál está hablando el cliente.

---

## 11. Prompts listos para pegar en VS Code

El Prompt 0 va una sola vez como contexto (por ejemplo en un archivo `CLAUDE.md`), y el resto se pega en orden con Claude Code.

### Prompt 0 — Contexto general del proyecto

```
Estoy construyendo un SaaS multi-tenant en Next.js (TypeScript) + Supabase (Postgres,
Auth, Storage) para administrar negocios de clientes míos. Cada negocio ("tenant") tiene
un tipo_servicio: "tienda" (ecommerce de ropa/productos) o "restaurante". Todo vive en
una sola base de datos con Row Level Security: un dueño de negocio solo ve los datos de
su propio negocio_id, y yo (super_admin) veo todos.

Roles: super_admin (yo, administro todos los negocios desde un panel central),
dueno_negocio (el cliente al que le vendo el servicio, administra su propio catálogo/menú
y pedidos), cliente_final (compra/reserva, puede ser invitado sin cuenta).

Módulo tienda: catálogo de productos con variantes (tallas/colores), carrito, checkout.
Módulo restaurante: menú por categorías, reservación de mesa con anticipo, pedido para
recoger en el local, pedido a domicilio.

Pagos: transferencia a una cuenta Banco Pichincha propia de cada negocio, o depósito en
un punto Mi Vecino (red de agentes de cobro en efectivo de Pichincha). No hay integración
bancaria automática: el cliente sube la foto del comprobante y el pedido/reserva queda en
estado "pago_en_revision" hasta que una persona lo aprueba o rechaza a mano.

Verificación de pagos: cada comprobante crea un registro en la tabla
pagos_verificacion. Uso n8n (self-hosted, ya lo tengo instalado) para escuchar los
registros nuevos y mandar una alerta a Telegram con la foto y botones "Aprobar"/
"Rechazar" que actualizan el estado en Supabase.

Asistente conversacional: arranca en Telegram (con Telegraf en Node.js) para pedidos y
reservas por chat, separando el "core" de la conversación (arma el pedido, pide los
datos, crea el registro en Supabase) de un "adapter" de canal (hoy solo Telegram), para
poder sumar WhatsApp más adelante sin reescribir el core.

Ya tengo funcionando un sitio de ecommerce de ropa por separado, que se irá adaptando
para encajar en este modelo multi-tenant como una plantilla más.

Cuando te pida cosas en los siguientes prompts, mantén este contexto.
```

### Prompt 1 — Scaffolding del proyecto

```
Crea un proyecto Next.js (App Router, TypeScript) con Supabase integrado (cliente de
Supabase, variables de entorno en .env.local sin subir credenciales al repo). Configura
tres áreas de rutas: /admin (panel super_admin, protegido por rol), /negocio (panel del
dueño de negocio, protegido por rol y filtrado por su negocio_id) y /tienda/[slug]
(sitio público de cada negocio, sin login). Crea la estructura de carpetas (app/,
components/, lib/, types/) y un sistema de tema visual que permita colores distintos por
negocio (leídos de la tabla negocios) en las rutas públicas, y un tema fijo propio para
/admin y /negocio.
```

### Prompt 2 — Modelo de datos y seguridad (RLS)

```
Crea en Supabase las tablas según este modelo:
[pega aquí el modelo de datos de la sección 9 de este documento]

Genera las políticas de RLS de cada tabla: un usuario con rol dueno_negocio solo puede
leer/escribir filas donde negocio_id coincide con el negocio al que pertenece (según
usuarios_negocio); el rol super_admin puede leer/escribir todo; las rutas públicas de
/tienda/[slug] solo pueden leer lo necesario para mostrar catálogo/menú (nunca escribir
directo, todo pedido se crea a través de una función/endpoint controlado). Genera también
los tipos de TypeScript correspondientes a cada tabla.
```

### Prompt 3 — Panel Super-Admin

```
Crea el panel /admin: lista de negocios con nombre, tipo_servicio y estado. Formulario
para crear un negocio nuevo (nombre, slug único, tipo_servicio, logo, colores, cuenta
Pichincha, código Mi Vecino, telegram_chat_id_alertas). Pantalla de detalle de un negocio
con botón para activar/suspender, y una vista de su cola de pagos_verificacion pendientes.
Agrega también una vista global que junte los pendientes de todos los negocios activos.
```

### Prompt 4 — Módulo Tienda (público + checkout)

```
Crea el sitio público /tienda/[slug] para negocios con tipo_servicio = "tienda":
catálogo de productos (filtrable por categoría), ficha de producto con variantes
(talla/color), carrito persistente en la sesión del navegador, y checkout que pide datos
de envío, muestra el método de pago configurado por ese negocio (cuenta Pichincha y/o
código Mi Vecino) y permite subir la foto del comprobante. Al confirmar, crea el registro
en pedidos_tienda con estado "pago_en_revision" y su correspondiente registro en
pagos_verificacion.
```

### Prompt 5 — Módulo Restaurante (menú + los tres flujos de compra)

```
Crea el sitio público /tienda/[slug] para negocios con tipo_servicio = "restaurante":
menú agrupado por categorías (menu_categorias, menu_platos), y tres flujos:
1) Reservar mesa: elegir fecha, hora y número de personas, ver el anticipo requerido,
   subir comprobante → crea registro en reservaciones.
2) Recoger en el local: armar pedido del menú, elegir hora aproximada, subir comprobante
   → crea registro en pedidos_restaurante con modalidad "recoger".
3) Pedir a domicilio: igual que recoger, pero con dirección de entrega y costo de envío
   calculado según la configuración de zonas del negocio → modalidad "domicilio".
Todos terminan creando también un registro en pagos_verificacion con estado "pendiente".
```

### Prompt 6 — Cola de verificación de pagos con n8n

```
Documenta y deja preparado (no hace falta que Claude Code configure n8n directamente,
pero sí que dejes el lado de Supabase listo) un flujo de n8n que:
- Escuche inserciones nuevas en pagos_verificacion (vía webhook de Supabase o polling).
- Envíe a Telegram, al chat_id guardado en el negocio correspondiente, un mensaje con la
  foto del comprobante, el monto declarado, el tipo de pedido/reserva y dos botones
  inline: "Aprobar" y "Rechazar".
- Al presionar un botón, actualice el estado en pagos_verificacion y en la tabla de
  origen (pedidos_tienda, pedidos_restaurante o reservaciones) al estado correspondiente
  ("pagado"/"confirmada" o "cancelado"/"rechazado").
En el proyecto, crea un endpoint API en Next.js que n8n pueda llamar para hacer esa
actualización de forma segura (con una clave secreta compartida, no con las credenciales
públicas de Supabase), y documenta en un README cómo armar el workflow en n8n paso a paso.
```

### Prompt 7 — Asistente conversacional en Telegram

```
Crea un bot de Telegram con Telegraf en Node.js, estructurado en dos capas:
- Un "core" de conversación (independiente del canal) que, dado un negocio_id y un
  estado de conversación guardado en conversaciones_bot, sepa: mostrar el catálogo/menú
  de ese negocio, ir armando un pedido o una reservación paso a paso, pedir los datos que
  falten, y al final pedir la foto del comprobante y crear el registro correspondiente
  (igual que el checkout web) más su registro en pagos_verificacion.
- Un adapter de Telegram (usando Telegraf) que traduce los mensajes/fotos del chat al
  formato que espera el core, y las respuestas del core a mensajes de Telegram.
Cada negocio se asocia a un bot o a un mismo bot con comando /negocio [slug] para elegir
con cuál está hablando, según lo que tenga más sentido con un solo bot de Telegram para
todos los negocios en esta etapa de pruebas. Dejá comentado en el código dónde iría un
futuro adapter de WhatsApp para que quede claro que no hay que tocar el core.
```

### Prompt 8 — Panel del Negocio (dueño/cliente de Diego)

```
Crea el panel /negocio (protegido, filtrado siempre por el negocio_id del usuario
logueado): gestión de productos o menú según el tipo_servicio del negocio, lista de
pedidos/reservas con su estado, su propia cola de pagos_verificacion pendientes con
botones aprobar/rechazar (además de la alerta por Telegram), y una pantalla de
configuración para editar cuenta Pichincha, código Mi Vecino, horarios de atención y
zonas/costos de envío (si es restaurante).
```

### Prompt 9 — Pulido visual y white-label por negocio

```
Aplica el sistema de colores dinámico por negocio en todo el sitio público /tienda/[slug]
(usando los valores guardados en negocios.colores y el logo), manteniendo el panel /admin
y /negocio con un tema fijo profesional propio. Verifica que el sitio se vea bien en
celular (la mayoría de clientes van a entrar desde el teléfono) y que el flujo de subir
el comprobante sea cómodo desde cámara del celular.
```

### Prompt 10 — Revisión final de seguridad multi-tenant

```
Revisa todo el proyecto: confirma que las políticas de RLS realmente impiden que un
dueño de negocio vea o modifique datos de otro negocio (pruébalo con dos negocios de
prueba), que ninguna credencial de Supabase, Telegram o n8n quede expuesta en el código
del cliente, que el endpoint que usa n8n para actualizar pagos esté protegido con su
clave secreta y no sea accesible públicamente sin ella, y que el manejo de errores del
bot de Telegram sea robusto si Supabase no responde o si sube una foto que no es una
imagen válida. Sugiere mejoras si encuentras algo.
```

---

# PARTE II — Aterrizaje en el código que YA existe

> Escrito el 2026-09-03 tras revisar el repo `ECOMMERCE/` completo. La Parte I es la visión;
> esta parte la conecta con lo que ya está construido, para no reprogramar lo que ya funciona.

## II.0. Modelo de entrega: dos tipos de cliente

Esto **no es un SaaS puro de autoservicio**. Es una base de código que le ahorra a Diego rehacer
un sistema completo cada vez que consigue un negocio. Según lo que quiera el cliente, hay dos caminos —
y el objetivo de la arquitectura es que **el 80% caiga en el camino A**:

**Camino A — Tenant estándar (personalización por configuración, cero código).**
El negocio entra como un `store_config` más dentro de la plataforma multi-tenant. Diego lo deja listo
en minutos desde `/superadmin`: nombre, slug, logo, colores, catálogo/menú, cuenta Pichincha / Mi Vecino,
chat de Telegram para alertas. Comparte código y base de datos con todos los demás; las actualizaciones y
arreglos que hace Diego los reciben todos a la vez. Es el caso ideal y al que hay que empujar.

**Camino B — Cliente a medida (deploy dedicado desde la misma base).**
El cliente quiere algo que la configuración no cubre (un flujo distinto, una integración propia, un diseño
que no es sólo "otros colores"). En vez de arrancar de cero, se **clona el repo como punto de partida** y
se despliega aparte para ese cliente, ajustando lo que pida. Sigue siendo el mismo esqueleto (Next + Supabase +
el módulo tienda/restaurante), así que el trabajo es "adaptar", no "construir".

**Qué exige esto de la arquitectura (y por qué el trabajo de la Parte II sirve para los dos caminos):**

- El sistema white-label (`packages/config` + `store_config`) tiene que cubrir de verdad todo lo que un
  cliente estándar podría querer tocar sin código: colores, tipografía, logo, textos, métodos de pago,
  categorías, costos de envío, horarios. Cuanto más completo, más clientes caen en el Camino A.
- El código debe seguir siendo **un buen template**: correr bien tanto en modo multi-tenant (resolviendo la
  tienda por slug/subdominio) como en modo mono-tienda (un deploy = un negocio, resolviendo por
  `NEXT_PUBLIC_STORE_SLUG`). El helper `getStore()` de II.4 ya contempla los dos.
- Conviene, al cerrar este proyecto, guardarlo como **plantilla de Jarvis** — así el Camino B arranca de
  copiar y parametrizar, sin gastar IA rearmando el andamiaje.
- Lo pesado (verificación de pagos, bot, módulo restaurante) se construye **una vez en la base** y los dos
  caminos lo heredan.

## II.1. Qué hay hoy en el repo

Es un **monorepo pnpm** (`pnpm-workspace.yaml`) con:

| Paquete | Qué es | Estado |
|---|---|---|
| `apps/web` | Next.js **14.2 (App Router, TypeScript)** + Tailwind 3 + Zustand (carrito) + `@supabase/ssr` + Stripe | Tienda pública + panel `/admin` + checkout, funcionando |
| `apps/mobile` | App Expo / React Native (misma tienda para celular) | Pantallas de catálogo, carrito, checkout, cuenta |
| `packages/core` | Tipos de dominio compartidos (`src/types.ts`) | `StoreConfig`, `Profile`, `Product`, `Order`, etc. |
| `packages/config` | Sistema white-label: interfaz `ClientConfig` + `ACTIVE_CONFIG` | **Hardcodeado** a `ROPA_CONFIG` (slug `ropa-demo`) |
| `supabase/migrations` | 6 migraciones SQL (`001`–`006`) | Ver drift abajo |

**Rutas que ya existen en `apps/web/src/app/`:**

- Público: `/`, `/(store)/productos`, `/(store)/productos/[slug]`, `/(store)/carrito`, `/checkout`, `/checkout/{pendiente,exito,cancelado}`, `/cuenta`, `/cuenta/pedidos`
- Auth: `/(auth)/login`, `/(auth)/registro`, `/(auth)/recuperar`
- Admin (un solo nivel, sin super-admin): `/admin`, `/admin/productos`, `/admin/pedidos`, `/admin/clientes`, `/admin/inventario`, `/admin/configuracion`
- API: `/api/checkout` (Stripe), `/api/checkout/manual` (De Una / transferencia), `/api/webhook` (Stripe), `/api/store-config`, `/api/me`, `/api/cuenta/*`, `/api/auth/callback`

**Lo que el plan pide y NO existe todavía:** `/tienda/[slug]`, panel super-admin con lista de negocios, panel `/negocio` separado, tabla `pagos_verificacion`, subida de comprobante en el checkout, cola de revisión, bot de Telegram, workflow de n8n, y todo el módulo restaurante.

## II.2. Mapeo modelo del plan → schema real

El schema real ya es **casi multi-tenant**: casi toda tabla lleva `store_id` y `store_config` ya es white-label.

| Plan (sección 9) | Ya existe como | Diferencias a cubrir |
|---|---|---|
| `negocios` | **`store_config`** | Falta: `tipo_servicio` ('tienda'\|'restaurante'), `estado` de 3 valores (hoy sólo `active boolean`), `punto_mi_vecino_codigo`, `telegram_chat_id_alertas`. Ya tiene: `slug`, `name`, `logo_url`, `primary_color`/`secondary_color`, `currency`, `country`, y datos de cobro `bank_name`/`bank_account`/`bank_holder`/`bank_id`, `deuna_qr_url`/`deuna_phone`, más `whatsapp_number`/`instagram_url`/`tiktok_url`/`tagline`. |
| `usuarios_negocio` | **`profiles`** (`store_id` + `role`) | `profiles.role` ya es `super_admin`\|`store_admin`\|`customer`. Hoy 1 usuario → 1 `store_id`. Sólo hace falta tabla puente nueva si un dueño debe administrar **varios** negocios; si no, no se crea nada. |
| `productos` | **`products`** + `product_variants` | Ya soporta variantes (talla/color/stock), imágenes, `compare_at_price`, `featured`. Nada que agregar para tienda. |
| `pedidos_tienda` | **`orders`** + `order_items` | Ya tiene `store_id`, `shipping_address` (jsonb), `payment_method`, `order_number`. Falta `comprobante_url` y el canal (`web`\|`telegram`\|`whatsapp`). |
| `pagos_verificacion` | **no existe** | Crear tal cual (sección 9), con `store_id`. |
| `menu_categorias`, `menu_platos`, `reservaciones`, `pedidos_restaurante` | **no existen** | Crear todo el módulo restaurante. |
| `conversaciones_bot` | **no existe** | Crear cuando se arme el bot (Prompt 7). |

## II.3. Deuda técnica: schema real ≠ migraciones

El schema en `migrations/001` **no coincide** con lo que el código usa hoy (se editó a mano en el panel de Supabase del proyecto viejo):

- El código usa `orders.status = 'pending_payment'`, pero el enum `order_status` de `001` sólo tiene `pending|paid|processing|shipped|delivered|cancelled|refunded`.
- El código lee/escribe `orders.customer_email` y `order_items.product_id`, columnas que no están en `001`.
- `005` agrega columnas de pago a `store_config` que sí están alineadas.

**Como la BD nueva es dedicada (decisión II.8.2), esto no es "reconciliar en caliente" sino "arrancar limpio":** antes de crear el proyecto nuevo, hacer un dump del schema real del proyecto viejo (`supabase db dump --schema public` o inspección en el panel) y consolidar `001`–`006` + los cambios manuales en un set de migraciones consistente. En la práctica: reescribir `001` (o agregar un `007_reconciliacion.sql` que lo parchee) para que el enum, `customer_email` y `product_id` estén desde el principio. Después de esto, migraciones = fuente de verdad.

## II.4. El salto single-tenant → multi-tenant real

Hoy el proyecto es **single-tenant disfrazado**: todo el código server lee con `createAdminClient()` (service_role, que **saltea RLS**) y filtra por `ACTIVE_CONFIG.store_slug`, que está fijo en `ROPA_CONFIG`. Las políticas RLS de `002` existen pero nunca se ejercen.

Para volverlo multi-tenant de verdad, en orden:

1. **Resolver la tienda por request, no por constante.** Reemplazar `ACTIVE_CONFIG.store_slug` por un helper `getStore()` en `apps/web/src/lib/` que resuelva el `store_id` desde el **`Host` header** (subdominio → slug), leído en el middleware y pasado por contexto/params. Fallback a `NEXT_PUBLIC_STORE_SLUG` para deploys dedicados del Camino B y para `localhost`. `packages/config` deja de exportar un `ACTIVE_CONFIG` fijo y pasa a ser sólo la forma (`ClientConfig`) + defaults; la config real de cada negocio vive en `store_config` y se cachea por request.
2. **Mover las lecturas públicas al cliente anon con RLS.** Catálogo/menú se leen con la key pública y políticas `store_config_public_read` + filtro por `store_id`. `createAdminClient()` queda sólo para operaciones de escritura controladas (crear pedido, aprobar pago) y para los paneles.
3. **Endurecer RLS por `store_id`.** Las políticas de admin de `002` hoy dicen "si el rol es store_admin, ve todo" — hay que cambiarlas a "ve todo **de su `store_id`**" (join contra `profiles.store_id`). El `super_admin` sí ve todo.
4. **Partir el panel.** `/admin` actual → pasa a ser el **panel de negocio**, siempre scopeado al `store_id` del usuario (un dueño = un negocio, decisión II.8.3). Se agrega **`/superadmin`** nuevo (guard `role === 'super_admin'`): lista de negocios, alta de negocio (formulario de la sección 4, incluye el subdominio/slug), cola global de `pagos_verificacion`, activar/suspender. Los paneles se sirven desde el dominio raíz (`miplataforma.com/superadmin`, `miplataforma.com/admin`), no desde los subdominios de negocio.

## II.5. Migraciones nuevas — ✅ ESCRITAS (2026-09-04)

Como MobilSa es un proyecto vacío, en vez de parches incrementales se escribió un set
limpio y consolidado en `supabase/migrations/` (las viejas quedaron en `_legacy_ropa/`):

| Archivo | Contenido |
|---|---|
| `001_schema.sql` | Todo el schema: `store_config` multi-tenant (con `tipo_servicio`, `estado`, `punto_mi_vecino_codigo`, `telegram_chat_id_alertas`), `profiles`, catálogo, `orders`/`order_items` (con `channel`, `comprobante_url`, `customer_*`, `product_id`, status `pending_payment`), módulo restaurante completo (`menu_categorias`, `menu_platos`, `reservaciones`, `pedidos_restaurante`), `pagos_verificacion`, `conversaciones_bot`, funciones helper (`current_store_id`, `is_super_admin`, `is_store_staff`), índices. |
| `002_rls.sql` | RLS en todas las tablas, aislamiento por `store_id`. Catálogo/menú lectura pública; escritura y pedidos scopeados a staff del negocio o super_admin. |
| `003_storage.sql` | Buckets `products` (público) y `comprobantes` (privado) + políticas. |
| `004_seed.sql` | Negocio #1 `ropa-demo` + categorías demo. Bloque comentado para un `resto-demo` de pruebas. |
| `_APLICAR_TODO.sql` | Los 4 concatenados — pegar en el SQL Editor de MobilSa y Run. |

**Pendiente de aplicar:** pegar `_APLICAR_TODO.sql` en Supabase → SQL Editor (ver `supabase/README.md`).

## II.6. Cambios en la app, por módulo

- **`packages/core/src/types.ts`** — agregar: extender `StoreConfig` con `tipo_servicio`/`estado`/`punto_mi_vecino_codigo`/`telegram_chat_id_alertas`; tipos nuevos `PagoVerificacion`, `MenuCategoria`, `MenuPlato`, `Reservacion`, `PedidoRestaurante`, `ConversacionBot`. Extender `OrderStatus` con `pending_payment` y `pago_en_revision`.
- **`packages/config`** — quitar `ACTIVE_CONFIG` hardcodeado; dejar `ClientConfig` como tipo y mover la resolución de tienda a `apps/web/src/lib/get-store.ts`.
- **`apps/web` — checkout** — en `components/store/CheckoutForm.tsx` y `app/api/checkout/manual/route.ts`: agregar `<input type="file">` de comprobante → subir a Storage `comprobantes` → crear fila en `pagos_verificacion` con estado `pendiente` y pasar el pedido a `pago_en_revision`. Quitar el texto "envía el comprobante por WhatsApp". Sumar Pichincha y Mi Vecino como métodos manuales (mismo patrón que De Una/transferencia).
- **`apps/web` — rutas y middleware** — el middleware lee el `Host`, deriva el slug del subdominio y lo inyecta (header interno / rewrite). Las rutas `(store)` actuales se quedan igual pero dejan de leer `ACTIVE_CONFIG` y pasan a usar `getStore()`. El dominio raíz sirve landing + `/admin` + `/superadmin`; los subdominios sirven la tienda pública.
- **`apps/web` — restaurante** — grupo de rutas nuevo servido en el mismo subdominio del negocio, con switch por `tipo_servicio` en el layout: menú por categorías + los 3 flujos (reservar / recoger / domicilio), cada uno terminando en el mismo componente de subida de comprobante.
- **`apps/web` — superadmin** — `app/superadmin/` nuevo (layout con guard `role === 'super_admin'`), lista de negocios, alta de negocio, cola global de pagos.
- **`apps/web` — endpoint para n8n** — `app/api/pagos/[id]/revisar/route.ts`, protegido con `Authorization: Bearer ${N8N_SHARED_SECRET}` (no la anon key), que cambia el estado en `pagos_verificacion` + la tabla de origen.
- **`apps/mobile`** — se puede dejar como está para la tienda de ropa actual (usa `/api/checkout/manual`); adaptarla a multi-tenant es opcional y posterior.
- **`apps/bot`** (nuevo paquete) — Node + Telegraf, con `src/core/` (lógica de conversación, sin canal) y `src/channels/telegram.ts` (adapter). Comentario `// TODO: adapter WhatsApp aquí` en el punto de entrada del core.
- **n8n** — documentar el workflow en `docs/n8n-verificacion-pagos.md` (no vive en el repo de código).

## II.7. Orden de trabajo recomendado (reemplaza los Prompts de la Parte I al aterrizarlos)

0. ✅ Proyecto `MobilSa` creado, migraciones aplicadas y verificadas (`store_config`/`ropa-demo` sembrado). Usuario super_admin creado (`diegodaviaus@hotmail.com`).
1. Cargar el catálogo real de `ropa-demo` (productos + variantes + imágenes) en la BD nueva — el `store_config` y las categorías ya los siembra `004_seed.sql`.
2. ✅ **Parte pública hecha:** `apps/web/src/lib/store.ts` (`getStore()` por subdominio, `getAdminStore()` por `profile.store_id`), middleware inyecta `x-store-slug` por `Host`, tipos en `packages/core`. Rutas públicas migradas y scopeadas por `store_id`: `layout.tsx` raíz, `(store)/layout`, `(store)/productos` + `[slug]`, landing `page.tsx`, `checkout` + `checkout/pendiente`, `api/checkout` + `api/checkout/manual` + `api/store-config`. Typecheck limpio.
   **Falta:** panels `/admin` (client components + `admin/actions/*` + `admin/page` etc. siguen usando `ACTIVE_CONFIG` / sin `store_id`), `api/webhook`, componentes cliente cosméticos (Navbar, Sidebar, CheckoutForm, auth, cuenta).
3. ✅ **Panel `/superadmin`** (`app/superadmin/`): lista de negocios, alta (`nuevo/`), cambiar estado prueba/activo/suspendido, botón "Administrar" que setea cookie `sa_store` y entra a `/admin` en el contexto de ese negocio. `/admin` re-scopeado con `getAdminContext()` / `requireAdminStore()`: `store_admin` ve su `profile.store_id`, `super_admin` ve el negocio elegido. Todas las páginas y server actions de `/admin` (`page`, `pedidos`, `productos*`, `inventario`, `clientes`, `configuracion`, `actions/*`) filtran por `store_id`. Typecheck limpio.
   **Falta:** componentes cliente cosméticos que aún usan `ACTIVE_CONFIG` (Navbar, auth, cuenta, not-found) — no son fuga de datos, solo el nombre del negocio en textos; `api/webhook` ya venía scopeado por `metadata.store_id`.

4. ✅ **Subida de comprobante + cola `pagos_verificacion`** (2026-09-04): `POST /api/comprobantes` sube la foto/PDF al bucket privado `comprobantes` con `service_role` (funciona para invitados, no depende de que haya sesión). `CheckoutForm.tsx` exige el comprobante antes de habilitar "Confirmar pedido" cuando el método no es tarjeta. `api/checkout/manual` ahora **requiere** `comprobanteUrl`, guarda `orders.comprobante_url`, pone el pedido en `pago_en_revision` y crea la fila en `pagos_verificacion`. Nuevo panel **`/admin/pagos`**: cola con miniatura del comprobante (signed URL, 10 min), datos del pedido/reserva referenciado, y botones Aprobar/Rechazar (`admin/actions/pagos.ts`) que además actualizan el estado de la tabla de origen (`orders`/`pedidos_restaurante`/`reservaciones`) — sirve tanto para pedidos del sitio web como los que crea el bot de Telegram (ya escribe a la misma cola). `checkout/pendiente` ya no pide "enviar por WhatsApp" — confirma que el comprobante quedó recibido.
   **`apps/mobile` no se rompió:** `api/checkout/manual` sólo exige `comprobanteUrl` cuando el body trae `channel: 'web'` (lo manda `CheckoutForm.tsx`); la app móvil, que no manda ese campo, sigue con el flujo viejo (pedido en `pending_payment`, WhatsApp manual) hasta que se le agregue subida de foto — no se tocó `apps/mobile` en esta pasada.
   **Pendiente real:** darle a `apps/mobile` el mismo flujo de comprobante (necesita `expo-image-picker`, no instalado, y un rebuild nativo).
   - ✅ **Lado de la app para n8n** (2026-09-04): endpoint `POST /api/pagos-verificacion/[id]` protegido con `N8N_SHARED_SECRET` (aprueba/rechaza y cascada el estado a `orders`/`pedidos_restaurante`/`reservaciones` — la misma lógica que usa `/admin/pagos`, factorizada en `lib/pagosVerificacion.ts`). Workflow paso a paso documentado en `supabase/README.md` → n8n (Database Webhook de Supabase → Telegram con botones → callback → este endpoint). **Falta armar el workflow en la instancia de n8n** (no se toca desde este repo).
4. `009` + subida de comprobante en el checkout de tienda + `pagos_verificacion` + endpoint para n8n.
5. Workflow de n8n → Telegram (usa el bot `@Notificacionesddat_bot`, encabezando el mensaje con el nombre del negocio).
6. Módulo restaurante:
   - ✅ **Panel del negocio restaurante** (2026-09-04, feedback de Diego): el sidebar y las rutas de `/admin` ahora **ramifican por `tipo_servicio`**. Restaurante ve *Menú* + *Pedidos y reservas* + *Configuración* (no Productos/Inventario/Clientes). `/admin/menu` (`MenuManager`): categorías del menú personalizables (crear/renombrar/borrar inline) + platos (crear/editar/borrar, precio, foto, disponible). `/admin/pedidos` para restaurante muestra `pedidos_restaurante` + `reservaciones` con cambio de estado (`RestauranteOrdersView`). Server actions en `admin/actions/menu.ts` y `admin/actions/restaurante.ts`, todas scopeadas por `store_id`.
   - También del feedback: en el `ProductForm` de tienda, "precio anterior (tachado)" quedó opcional detrás de un checkbox, y se pueden crear categorías nuevas inline.
   - ✅ **Sitio público del restaurante** (2026-09-04, a pedido de Diego): landing simple (`RestaurantHome.tsx`) + `/menu` con filtro por categoría + carrito propio (`store/menuCart.ts`, localStorage) + `/carrito` ramificado (tienda vs. restaurante). **No hay checkout con pago en la web** — decisión explícita: en Ecuador el pago con tarjeta no es una opción real para negocios chicos, así que el pedido termina en un botón **"Finalizar pedido por WhatsApp"** (`WhatsAppCartButton`) que arma el mensaje completo (ítems, cantidades, total) y abre `wa.me` con el texto ya escrito — el cliente solo toca Enviar. El pago/coordinación se resuelve por chat con el negocio (o por el bot cuando sea WhatsApp), no en la web.
   - **Falta:** reservar mesa y pedir para recoger/domicilio como flujos dedicados en el sitio (hoy es "armar pedido → WhatsApp"; reservas y modalidad recoger/domicilio ya funcionan por el bot de Telegram pero no desde la web pública).
7. Panel `/negocio` (o `/admin` scopeado) con su propia cola de pagos y config de cobro.
8. `011` + bot de Telegram (core + adapter).
9. Revisión de seguridad multi-tenant (Prompt 10 de la Parte I) con 2 negocios de prueba.

## II.8. Decisiones tomadas (2026-09-03)

1. **`ropa-demo` se vuelve el negocio #1 de la plataforma.** Pero como la base de datos es nueva (punto 2), no hay que "migrar en caliente": se levanta el schema limpio en el proyecto nuevo, se cargan ahí los datos de `ropa-demo` (config, catálogo, y opcionalmente pedidos históricos) como el primer `store_config`, y recién entonces se repunta el deploy de la tienda de ropa al proyecto nuevo. La tienda actual sigue viva contra su Supabase viejo hasta ese switch.
2. **Proyecto de Supabase NUEVO y dedicado al SaaS: `MobilSa`** (cuenta `diegodaviaus@hotmail.com`, project ref `ectlzwbvrouewbaivfdl`, repo `ddat03/MobilSa`). Ventaja: `007` deja de ser "reconciliar drift de producción" y pasa a ser sólo "arrancar consistente" — las migraciones `001`–`006` + los cambios que hoy están hechos a mano se consolidan en un set limpio desde el día uno, sin riesgo sobre datos reales. Ya registrado en el `CLAUDE.md` global. **Pendiente:** cargar el `SUPABASE_SERVICE_ROLE_KEY` (formato `sb_secret_...`) en `apps/web/.env.local` y la contraseña de la BD / connection string para poder correr migraciones con `supabase` CLI.
3. **Un dueño = un negocio.** Alcanza con `profiles.store_id`. **No** se crea tabla puente `usuarios_negocio`. Si algún día un cliente necesita varios negocios, se agrega después.
4. **Subdominio por negocio** (`pizzeria-luigi.miplataforma.com`). El helper `getStore()` resuelve por `Host` header en el middleware. Requiere: dominio propio de la plataforma + registro DNS **wildcard** (`*.miplataforma.com`) + wildcard domain configurado en el hosting (Vercel/Netlify soportan esto). El fallback por `NEXT_PUBLIC_STORE_SLUG` se mantiene para los deploys dedicados del Camino B y para desarrollo local.

## II.9. Firma de autoría (pendiente en el código)

El repo todavía **no** tiene la línea "Creado por Diego Aleman". Al aterrizar esto, agregarla discreta (texto gris chico) en el footer del sitio público (`apps/web/src/app/(store)/layout.tsx`) y en `/admin/configuracion` (o `/superadmin`).

---

## 12. Siguientes pasos sugeridos

1. Decidir si tu tienda de ropa actual se migra como el primer "negocio" dentro de esta
   plataforma nueva, o si se queda funcionando aparte y esta plataforma arranca solo con
   clientes nuevos — no hace falta resolverlo antes de programar, pero sí antes del
   Prompt 4.
2. Confirmar si usas el mismo proyecto de Supabase que ya tienes activo (el del backend
   de e-commerce) o creas uno nuevo dedicado a este SaaS, para no mezclar datos.
3. Tener a mano el token del bot de Telegram que ya usas para alertas (o crear uno nuevo
   dedicado a esto vía @BotFather) antes del Prompt 6.
4. Anotar una cuenta Pichincha y un código de punto Mi Vecino de prueba (los tuyos o de
   un negocio de prueba) para poder probar el flujo de comprobante de principio a fin.
5. Ir pegando los prompts en orden, probando cada módulo antes de pasar al siguiente —
   conviene dejar el Prompt 7 (bot de Telegram) para cuando el resto ya esté funcionando,
   porque depende de que el checkout y la cola de pagos ya existan.
6. Cuando quieras cobrarles a tus clientes por usar la plataforma (no lo mencionaste,
   pero es el paso natural de un SaaS), se puede sumar más adelante un módulo de
   suscripción/facturación sobre este mismo modelo sin rehacer nada de lo de arriba.

---

## Fuentes consultadas

- [Programa "Mi Vecino", de Banco Pichincha, ya está en los 221 cantones de Ecuador](https://www.primicias.ec/economia/mivecino-banco-pichincha-cantones-ecuador-tiendas-78951/)
- [Puntos Mi Vecino - Tu banco muy cerca de ti | Banco Pichincha](https://www.pichincha.com/mi-vecino)
- [Pichincha "Mi Vecino" APM | Banco Pichincha Cash Payment in Ecuador | Nuvei](https://www.nuvei.com/apm/pichincha-mi-vecino)
- [WhatsApp Business API costo: ¿cuánto pagar por mensajes en 2026?](https://leadsales.io/blog/whatsapp-business-api-cuanto-cuesta/)
- [WhatsApp Business API: Precios actualizados del 2026 | Beex](https://beexcc.com/whatsapp-business-api/precios/)

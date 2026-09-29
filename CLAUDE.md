# comprobantes-app

App para administrar los gastos e ingresos de la sucesión. El hermano que
administra la sucesión carga los movimientos (con o sin comprobante
adjunto); el resto de los herederos entra solo para consultar el listado y
el balance. No hay base de datos propia: cada movimiento es una fila en una
planilla de Google Sheets compartida, y los comprobantes (foto/PDF) se
guardan en una carpeta de Google Drive.

Primera versión — pensada sobre todo para uso desde el celular. Un panel de
análisis para escritorio queda para más adelante.

## Arquitectura

```
frontend/ (React 18 + Vite + TS, CSS puro)
        ↓ fetch /api/**
  Spring Boot (Java 17)
        ├── Sheets API (cuenta de servicio) → Google Sheet compartido
        └── Drive API (OAuth, ver abajo)    → carpeta de Google Drive
```

**Por qué Sheets y Drive usan credenciales distintas** (no es capricho, es una
limitación real de Google descubierta al implementar esto): una cuenta de
servicio puede editar sin problema una planilla que ya existe (por eso Sheets
funciona con ella), pero **no puede ser dueña de archivos nuevos** en un
Drive personal — Google responde `storageQuotaExceeded` ("Service Accounts
do not have storage quota... use OAuth delegation instead"). Los Shared
Drives resuelven esto pero requieren Google Workspace de pago, que esta
cuenta (Gmail personal) no tiene. La solución: los uploads de comprobantes
usan un token OAuth de una cuenta real (obtenido una única vez), scope
`drive.file` — el backend nunca vuelve a pedir login, solo renueva el token
en segundo plano con el refresh token guardado.

En producción, el Dockerfile compila el frontend y copia `frontend/dist` a
`src/main/resources/static`, así el jar sirve la SPA y la API en el mismo
puerto (mismo patrón que `underwater/apps/re.mind2`).

## Acceso (sin login de Google)

No hay OAuth por usuario. Sigue habiendo una única contraseña compartida
(`APP_PASSWORD`) — no hay password individual por heredero, la app es de
uso familiar y no hace falta tanta seguridad — pero desde que se agregaron
roles, el **nombre** que se tipea en el gate ya no es texto libre: tiene
que matchear uno de los usuarios hardcodeados en `config/UsuariosConfig`
(`Maxi:ADMIN`, `Gustavo:EDITOR`, `Nico:VIEWER`). Es una lista fija de 3-4
nombres de la familia — se prefirió hardcodearla en vez de una env var o
una pestaña en el Sheet: agregar/sacar un heredero es un evento raro que
igual requiere tocar código o redeploy, no vale la pena la indirección.
Para agregar o cambiar un usuario, editar ese archivo y redeployar.

Roles: `ADMIN`, `EDITOR`, `VIEWER` (`security/Rol`). Por ahora `ADMIN` y
`EDITOR` son equivalentes en permisos (solo se distinguen como etiqueta) —
la única diferencia real es `VIEWER`, que solo puede leer. El interceptor
(`security/AccessKeyInterceptor`, protege `/api/movimientos/**` y
`/api/auth/**`) sigue validando la contraseña vía `X-Access-Key` (o el
query param `key`, para el mismo caso legacy documentado ahí) y ahora
además resuelve el rol a partir de un header `X-User-Name` (o query param
`user`): GET queda permitido para cualquier rol, POST/PUT/DELETE
devuelven 403 si el rol es `VIEWER`. No hay sesión server-side: cada
request manda de nuevo contraseña + nombre, no hay estado que sobreviva a
un restart del backend (aceptable para una app de bajo tráfico).

El nombre se sigue guardando en `localStorage`
(`comprobantes.userName`) y se manda como `cargadoPor` en cada movimiento
nuevo, para que quede registro de quién cargó qué — ahora es una identidad
validada contra `APP_USERS`, no un valor arbitrario. `GET /api/auth/whoami`
es el endpoint que usa el gate (`AccessGate` → `api.ts#login`) para
validar contraseña+nombre en un solo paso y devolver `{nombre, rol}`; el
rol se guarda en `localStorage` (`comprobantes.userRole`) y determina en
el frontend qué mostrar (el botón "+" de nuevo movimiento y las acciones
de editar/eliminar quedan ocultos para `VIEWER` — puro UX, el enforcement
real lo hace el interceptor).

## Estructura de datos

Tres pestañas en la misma planilla:

**Movimientos** (la pestaña original, cualquier nombre — el backend siempre
lee/escribe por rango `A:K`, no por nombre de pestaña):

```
id | fecha | tipo (INGRESO/GASTO) | monto | concepto | bien |
comprobantesCount | notas | creadoEn | estado | cargadoPor
```

La columna G se reaprovechó como `comprobantesCount`: un contador de solo
lectura (nunca se lee de vuelta, solo se escribe) que `MovimientoController`
mantiene al día llamando a `MovimientoSheetService#updateComprobantesCount`
después de cada alta/baja en `Comprobantes` — para poder ver de un vistazo,
sin cambiar de pestaña, cuántos comprobantes tiene cada movimiento.

Dos columnas viejas se borraron del todo el 2026-09-13, ambas en desuso
(nunca tuvieron un campo real en el formulario): `comprobanteNombre` (un
movimiento puede tener varios comprobantes ahora, viven en la pestaña
`Comprobantes`) y `categoria` (se sacó del form hace tiempo, "quita
categoria" — quedaba siempre vacía). **Aviso para la próxima**: al borrar
`comprobanteNombre`, un primer intento borró la columna equivocada, porque
alguien había borrado esa misma columna a mano directamente en la planilla
en el medio de la sesión, corriendo `notas` un lugar a la izquierda sin que
el código lo supiera — se recuperó sin pérdida de datos a partir de la
salida ya impresa del script antes del borrado, pero la lección es: antes
de correr un `deleteDimension` contra esta planilla (que está en uso real,
compartida y editable a mano), releer el rango completo fresco en la misma
corrida y confirmar el layout, nunca asumir el de una lectura anterior o de
lo que dice el código.

**Comprobantes** (pestaña nueva, uno-a-muchos con Movimientos):

```
id | movimientoId | url | nombre | creadoEn | estado
```

- **Ids legibles, no UUID**: tanto un movimiento como un comprobante se
  identifican con un entero secuencial simple (`1`, `2`, `3`...), cada
  pestaña con su propio contador — para saber a qué movimiento corresponde
  un comprobante ya está la columna `movimientoId` al lado, no hace falta
  que el id del comprobante la codifique también. El siguiente número se
  calcula recorriendo los ids ya usados (incluidos los de filas dadas de
  baja, para nunca repetir un número) — ver `MovimientoSheetService#nextId`
  / `ComprobanteSheetService#nextId`.
- Baja lógica en ambas pestañas: eliminar pone `estado = eliminado` en vez
  de borrar la fila (evita que los índices de fila se desincronicen entre
  dos acciones rápidas — mismo motivo que `NotesSheetService` en re.mind2).
  Eliminar un movimiento hace baja lógica en cascada de sus comprobantes,
  pero no borra los archivos reales en Drive (mismo criterio que ya tenía
  el borrado de movimientos).
- **Comprobante pendiente**: un movimiento sin filas activas en
  `Comprobantes` es "pendiente" (`comprobantePendiente` derivado en la
  respuesta, no es una columna). `POST /api/movimientos/{id}/comprobantes`
  agrega uno o más sin tocar los que ya tenía; `DELETE
  /api/movimientos/{movimientoId}/comprobantes/{comprobanteId}` borra uno
  puntual (fila + archivo en Drive).
- `GoogleClientsConfig`/`MovimientoSheetService` no saben nada de
  comprobantes — devuelven `MovimientoResponse` con una lista vacía como
  placeholder, y `MovimientoController` la completa con
  `MovimientoResponse#withComprobantes(...)` después de consultar
  `ComprobanteSheetService` (join en memoria por `movimientoId`, no un
  JOIN de Sheets).
- Migración (2026-09-13): los dos comprobantes que ya existían en las
  columnas H/I se movieron a filas de `Comprobantes` con un script puntual
  (no versionado, corrido una vez a mano contra la planilla real) y esas
  columnas se vaciaron en sus filas de origen.

**Avisos** (pestaña nueva, sin relación con Movimientos):

```
id | fecha | texto | bien | autor | creadoEn | estado
```

- Para que el administrador (o un editor) le comunique algo a los demás
  herederos ("subieron las expensas de Iriondo") sin que sea un movimiento
  de plata. Mismo patrón que `Comprobantes`: `AvisoSheetService` maneja su
  propia pestaña con `ensureSheetExists` (se crea sola si no existe),
  contador de ids propio y baja lógica por `estado` — no sabe nada de
  `Movimientos` y viceversa.
- **No afecta `Totals`/el balance en absoluto** — es una entidad separada.
  El frontend (`MovimientosList`) es el único lugar que los conoce a
  ambos: arma una lista combinada ordenada por `fecha` (con `creadoEn`
  como desempate) solo para mostrarlos intercalados cronológicamente, sin
  tocar los cálculos.
- Lleva `bien` obligatorio y el filtro de bien de la lista lo trata igual
  que a un movimiento; el filtro de tipo (Ingresos/Egresos) y el de
  "comprobante pendiente" no le aplican (un aviso no es ni ingreso ni
  egreso, así que siempre pasa esos dos filtros). Hay un chip aparte
  (📢, fuera del dropdown de "Filtros") para ocultarlos del todo.
- Mismos permisos que movimientos (VIEWER solo lee, EDITOR/ADMIN
  crean/eliminan). Se puede crear y eliminar, **no editar** — si hay un
  error se borra y se vuelve a cargar.
- El FAB "+" ahora abre un mini menú ("Nuevo movimiento" / "Nuevo aviso")
  en vez de ir directo al formulario de movimiento.

## Cajas de ADMIN: Remodelación Iriondo y Aportes personales

Dos pestañas más, independientes de Movimientos (la caja de los
alquileres) y entre sí, para que la plata de la obra de Iriondo no se
mezcle con la de la sucesión:

```
Remodelación Iriondo:  id | fecha | tipo | monto | concepto | notas | creadoEn | estado
Aportes Personales:    id | fecha | tipo | montoUSD | concepto | aportante | notas | creadoEn | estado
```

- **Remodelación Iriondo**: gastos reales de la obra, en pesos. Sin `bien`
  (es toda de Iriondo) y sin comprobantes por ahora.
- **Aportes personales**: lo que un heredero pone de su bolsillo para la
  obra, **en dólares** (convertido a mano al cargarlo) para que la
  inflación no licúe la deuda. INGRESO = aporta, GASTO = se le devuelve;
  el saldo es lo que la sucesión le debe (la vista lo desglosa por
  aportante). Un aportante por fila: un aporte conjunto va en dos filas.
  Aportantes fijos en `frontend/src/cajas.ts` (`APORTANTES`).
- No cuadran entre sí ni tienen por qué: una mide el gasto, la otra el
  financiamiento. No afectan `Totals` de la sucesión ni el chat IA.
- **Solo las ve ADMIN**, y es puro frontend (un desplegable
  "Sucesión / Remodelación Iriondo / Aportes personales" centrado en la
  barra de arriba, a la altura del título "Administración"): el interceptor las trata igual
  que a Movimientos (VIEWER lee, EDITOR escribe). Decisión consciente, es
  una app familiar.
- Crear, editar (tocando la fila) y eliminar (desde el formulario), con
  baja lógica. `GET/POST /api/remodelacion`, `PUT/DELETE .../{id}`; ídem
  `/api/aportes`.
- La plomería común (crear la pestaña si no existe, header, id
  secuencial, baja lógica, fechas dd/MM/yyyy) vive en `service/SheetTab`.
  Avisos y Comprobantes todavía tienen su propia copia; pasarlos a
  `SheetTab` es una mejora pendiente, no urgente.
- Fuera de alcance por ahora: cargar los ~40 gastos históricos de la
  Refacción Iriondo (2021-2026) que se excluyeron al importar,
  comprobantes en estas cajas y cotización automática.

## Preguntale a la IA

Chat (entrada en el menú, junto a "Informes") para preguntar en lenguaje
natural sobre los movimientos — ej. "promedio de alquileres de Iriondo en
2026". **La IA interpreta, Java calcula**: nunca se le pasa la tabla al
modelo ni se le pide que haga cuentas. OpenAI (`gpt-4o-mini`, cuenta de
Maxi, librería `openai-gpt3-java` 0.18.2 igual que re.mind2) solo traduce
la pregunta a una llamada a `consultar_movimientos` (filtros
`tipo`/`bien`/`conceptoContiene`/`fechaDesde`/`fechaHasta` + una agregación
`suma`/`promedio`/`conteo`/`maximo`/`minimo`, en total o con
`agruparPor: mes|anio|bien|anio_y_bien`), `AsistenteIAService` filtra
`MovimientoSheetService#readAll` y calcula el número real, y el modelo lo
redacta. Esa versión de la librería solo tiene el function calling viejo
(una función por respuesta), así que una comparación hace varias rondas
seguidas (tope 4). **La primera ronda fuerza la llamada a la función**:
dejándolo elegir, el modelo contestó "no hay gastos de agua en Iriondo"
deduciéndolo del contexto (está en remodelación) sin consultar, y eran 64
movimientos. La última ronda se fuerza sin función.

- El system prompt lleva el contexto de cada bien que no sale de los datos
  (`AsistenteIAService#BIENES_CONOCIDOS`: Iriondo en remodelación sin
  alquiler, 3 de febrero habitada por Viviana, cómo se cargan los
  descuentos de San Martín, etc.). **Si cambia la situación de un bien, o
  aparece uno nuevo, actualizar ese mapa y redeployar**.
- Solo responde sobre la sucesión (movimientos, bienes y qué significan
  conceptos de la planilla como TGI/EPE/API); cualquier otro tema lo
  rechaza con una frase fija. Es una regla del system prompt, no un filtro
  duro, pero en el peor caso lo que se escapa es texto: la IA no puede
  escribir nada ni ver otra cosa que los números que devuelve la función.
- `agruparPor: mes` con `conteo` recorre todos los meses del período,
  incluidos los que están en 0, y así contesta "¿falta cargar algún
  alquiler?". El análisis de faltantes va solo con `conteo`; en una suma o
  un promedio por mes metía ruido en respuestas que no tenían nada que ver. Un pago
  atrasado se carga con la fecha real de cobro y el mes al que corresponde
  en las **notas** ("Enero 2024", "Julio a noviembre 2022", "Agosto"), y
  así se importó todo el historial. `AsistenteIAService#mesesMencionados`
  lee esos meses (rangos, meses sin año) y cuenta como cubiertos los meses
  en 0 que algún cobro menciona, aunque ese cobro caiga fuera del período.
  Java devuelve ya calculados `mesesFaltantes`/`mesesCubiertosSegunNotas`
  (agrupados en rangos) y una `conclusion` en una frase, porque el modelo,
  con las listas crudas, omitía meses o presentaba los cubiertos como
  faltantes. **Para que un pago atrasado no figure como faltante, las notas
  tienen que decir el mes.**
- Solo a ADMIN/EDITOR, y solo cuando preguntan por faltantes: si hay meses
  faltantes y cobros agrupados en un mes cuyas notas no dicen a qué mes
  corresponden (`cobrosAgrupadosSinMesEnNotas`), la IA sugiere completar
  las notas. A un VIEWER nunca le sugiere corregir la planilla.
- El prompt le prohíbe concluir "no falta nada" a partir de un total (antes
  lo hacía).
- Solo Movimientos (no Avisos ni comprobantes); las notas se leen solo
  como parte del detalle de un movimiento, no se pueden buscar. Listar
  movimientos sigue fuera de alcance; "total por bien" se resuelve con una
  consulta por bien.
- `POST /api/preguntas` con `{mensajes: [{autor: USUARIO|IA, texto}]}`
  (todo el historial, el último es la pregunta nueva). Es POST por el body,
  pero de solo lectura: `AccessKeyInterceptor` tiene una excepción puntual
  por path para que VIEWER también pueda usarlo.
- El historial vive en `localStorage` (`comprobantes.chatIA`), no en el
  backend — sin sesión server-side, igual que el resto de la app.
- Necesita `OPENAI_API_KEY`; sin ella la app arranca igual y solo el chat
  responde con error.

## Puesta en marcha en Google Cloud (ya hecho una vez, documentado por si hay que rehacerlo)

Proyecto usado: **`comprobantes-app-508410`** (cuenta `bottazzi.100@gmail.com`).
La mayor parte se hizo por `gcloud` CLI (instalado sin sudo en
`~/google-cloud-sdk`), sin tocar la consola web, salvo lo que Google
solo permite desde ahí (creación de credenciales OAuth):

1. **APIs habilitadas**: `gcloud services enable sheets.googleapis.com drive.googleapis.com`
2. **Cuenta de servicio** (para Sheets): `gcloud iam service-accounts create comprobantes-app`
   + `gcloud iam service-accounts keys create` → JSON guardado en
   `secrets/service-account.json` (gitignored, nunca se commitea).
3. **Planilla y carpeta**: creadas por API con el token del usuario
   (`gcloud auth print-access-token` con `--enable-gdrive-access`), y la
   planilla compartida como Editor con el email de la cuenta de servicio.
4. **Cliente OAuth para Drive** (esto sí es manual, consola → APIs y
   servicios → Credenciales → "ID de cliente de OAuth" → tipo **App de
   escritorio**). Requiere antes configurar la pantalla de consentimiento
   (Externo) y, en la pestaña **Acceso a datos**, agregar el scope
   `https://www.googleapis.com/auth/drive.file` a mano si no aparece en el
   buscador.
5. **Login único** con `scripts/oauth_exchange.py` — levanta un servidor
   local en `127.0.0.1:8765` (⚠️ la URI de redirección de Google para
   clientes "App de escritorio" tiene que ser `127.0.0.1`, `localhost` da
   error 400), abre el navegador, y al volver intercambia el código por un
   `refresh_token` (guardado en `secrets/oauth-tokens.json`) — y de paso crea
   la carpeta de Drive para los comprobantes (`secrets/drive-folder.json`),
   porque con scope `drive.file` la app solo puede escribir en carpetas que
   ella misma creó, no en una preexistente.
   - **Estado de publicación**: al principio la pantalla de consentimiento
     quedó en **"Testing"**, donde el refresh token vence a los 7 días. El
     2026-09-29 se confirmó que ya está **publicada en producción** (no se
     sabe desde cuándo), así que un token emitido estando publicada ya no
     vence a los 7 días. Igual puede invalidarse (6 meses sin uso, cambio de
     contraseña de la cuenta, acceso revocado a mano): si deja de funcionar
     la subida de comprobantes, correr de nuevo
     `python3 scripts/oauth_exchange.py` para renovarlo.
   - **⚠️ Después de renovarlo, actualizar también `GOOGLE_OAUTH_REFRESH_TOKEN`
     en Railway** (`railway variables --set "GOOGLE_OAUTH_REFRESH_TOKEN=$(python3 -c
     "import json; print(json.load(open('secrets/oauth-tokens.json'))['refresh_token'])")"`)
     y esperar el redeploy. `oauth_exchange.py` solo escribe el archivo
     local — el backend de producción sigue corriendo con el token viejo
     cargado en memoria hasta que se redeploya, y como Google invalida el
     refresh token anterior al emitir uno nuevo, cualquier pedido a Drive
     con el token viejo empieza a fallar ("error al comunicarse con Google
     Sheets/Drive") hasta que se actualiza la variable. Pasó una vez
     (2026-09-22): se renovó el token a mano para una importación masiva
     de comprobantes y se tardó en notar que Railway seguía con el viejo.
6. Configurar las variables de entorno del backend (Railway):

| Variable | Descripción |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Contenido completo del JSON de la cuenta de servicio (`secrets/service-account.json`) — usado solo para Sheets |
| `SPREADSHEET_ID` | `17rHhCzE3bieXTPWBnwuP2n6YOZnxrkR3umj_kTLlo5A` |
| `DRIVE_FOLDER_ID` | Id en `secrets/drive-folder.json` |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | De `secrets/oauth-client.json` |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | De `secrets/oauth-tokens.json` (`refresh_token`) — usado solo para subir comprobantes a Drive |
| `OPENAI_API_KEY` | Para "Preguntale a la IA" (en local, `dev-env.sh` la lee de `secrets/openai-api-key.txt` si existe) |
| `APP_PASSWORD` | Contraseña única compartida (ver y editar) |
| `CORS_ALLOWED_ORIGINS` | Origins permitidos en dev (default `http://localhost:5173`) |

Todo lo que está en `secrets/` es gitignored — nunca se sube al repo. Para
desarrollo local, `source scripts/dev-env.sh` carga estas env vars leyendo
esos archivos (necesita tener `secrets/service-account.json`,
`secrets/oauth-client.json`, `secrets/oauth-tokens.json` y
`secrets/drive-folder.json` ya generados como se explicó arriba).

## Desarrollo local

```bash
# Backend
mvn spring-boot:run

# Frontend (otra terminal)
cd frontend
npm install
npm run dev
```

El `vite.config.ts` ya proxea `/api` a `http://localhost:8080`.

## Estructura del código

```
src/main/java/com/maxidigital/comprobantes/
├── ComprobantesApplication.java
├── config/
│   ├── WebConfig.java               # CORS + registro del interceptor de acceso
│   ├── GoogleClientsConfig.java     # Bean Sheets (cuenta de servicio) + Bean Drive (OAuth refresh token)
│   ├── UsuariosConfig.java          # lista fija hardcodeada de usuarios -> rol
│   └── OpenAiConfig.java            # bean OpenAiService (OPENAI_API_KEY)
├── security/AccessKeyInterceptor.java, Rol.java
├── controller/
│   ├── MovimientoController.java    # GET/POST /api/movimientos, PUT/DELETE .../{id},
│   │                                 # POST .../{id}/comprobantes, DELETE/GET .../{id}/comprobantes/{comprobanteId}[/archivo]
│   ├── AuthController.java          # GET /api/auth/whoami -> {nombre, rol}
│   ├── AvisoController.java         # GET/POST /api/avisos, DELETE .../{id}
│   ├── PreguntaController.java      # POST /api/preguntas (chat IA, solo lectura)
│   ├── RemodelacionIriondoController.java  # /api/remodelacion (caja de ADMIN)
│   ├── AportesPersonalesController.java    # /api/aportes (caja de ADMIN, USD)
│   └── ApiExceptionHandler.java
├── dto/MovimientoResponse.java, ComprobanteResponse.java, AvisoResponse.java, PreguntaRequest.java, PreguntaResponse.java,
│       RemodelacionResponse.java, AporteResponse.java
├── service/
│   ├── MovimientoSheetService.java   # append/readAll/softDelete/update — no sabe de comprobantes
│   ├── ComprobanteSheetService.java  # pestaña "Comprobantes": append/readAllActive/findActiveByMovimiento/softDelete(All)
│   ├── AvisoSheetService.java        # pestaña "Avisos": append/readAllActive/softDelete, ajena a Movimientos
│   ├── SheetTab.java                 # plomería común de una pestaña con id secuencial + baja lógica (no es bean)
│   ├── RemodelacionIriondoSheetService.java  # pestaña "Remodelación Iriondo", usa SheetTab
│   ├── AportesPersonalesSheetService.java    # pestaña "Aportes Personales", usa SheetTab
│   ├── ReceiptDriveService.java      # sube/borra/sirve el archivo en Drive
│   └── AsistenteIAService.java       # chat IA: loop de function calling + el filtro/cálculo real en Java
└── exception/UnauthorizedException.java, ForbiddenException.java, NotFoundException.java

frontend/src/
├── main.tsx, App.tsx                # App.tsx: gate de acceso -> listado, FAB con elegidor movimiento/aviso
├── api.ts                           # fetch centralizado + manejo de X-Access-Key/X-User-Name + login()
├── types.ts
├── fecha.ts                         # helpers de fecha dd/mm/yyyy <-> ISO, compartidos por MovimientoForm y AvisoForm
├── AccessGate.tsx                   # pide nombre + APP_PASSWORD, valida contra /api/auth/whoami
├── Totals.tsx                       # ingresos / gastos / balance (solo movimientos, ajeno a avisos)
├── MovimientosList.tsx              # listado + filtros (tipo, comprobante pendiente, bien) — arma la lista combinada movimientos+avisos
├── MovimientoForm.tsx               # alta/edición — selección múltiple de archivos + lista de comprobantes existentes con borrado individual
├── AvisoForm.tsx                    # alta de un aviso (fecha, bien, texto) — sin modo edición
├── MovimientoDetail.tsx             # detalle de solo lectura, un chip "Ver" por comprobante
├── ReceiptViewerDialog.tsx          # visor propio adentro de la app (nunca navega a la URL del archivo)
├── ConfirmDialog.tsx                # confirmación de borrado
├── PreguntaIADialog.tsx             # chat "Preguntale a la IA" (historial en localStorage)
├── cajas.ts                         # config de las cajas de ADMIN (título, moneda, etiquetas) + APORTANTES
├── CajaView.tsx, CajaForm.tsx       # listado + totales + alta/edición de una caja de ADMIN
├── monto.ts                         # sanitizado del campo monto, compartido por MovimientoForm y CajaForm
└── index.css                        # tokens de estética/PALETTE (ver ../estetica-react/ESTETICA-REACT.md)

```

## Pendiente / próximas versiones

- Panel de análisis para escritorio (gráficos, totales por categoría/bien y por período).
- Íconos PWA reales — los actuales (`frontend/public/icons/`) son placeholders generados, no arte final.

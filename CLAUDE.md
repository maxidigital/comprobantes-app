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

No hay OAuth por usuario — dos contraseñas compartidas por variable de
entorno, validadas por un interceptor (`security/AccessKeyInterceptor`) vía
el header `X-Access-Key`:

- `APP_PASSWORD` — la conocen todos los herederos. Alcanza para ver el
  listado (`GET /api/movimientos`).
- `ADMIN_PASSWORD` — la conoce solo el administrador de la sucesión.
  Necesaria para cargar, eliminar o adjuntar comprobantes (POST/PUT/DELETE).

El frontend guarda ambas claves en `localStorage` tras el primer uso exitoso
(`AccessGate` para la de acceso, `AdminUnlockDialog` para la de admin). No
hay una forma de verificar la clave de admin sin efectos secundarios — si es
incorrecta, se entera recién al intentar guardar/eliminar/adjuntar, y ahí se
le vuelve a pedir.

## Estructura de datos

Una fila por movimiento en la planilla, columnas `A:L`:

```
id | fecha | tipo (INGRESO/GASTO) | monto | concepto | categoria | bien |
comprobanteUrl | comprobanteNombre | notas | creadoEn | estado
```

- Baja lógica: eliminar pone `estado = eliminado` en vez de borrar la fila
  (evita que los índices de fila se desincronicen entre dos acciones
  rápidas — mismo motivo que `NotesSheetService` en re.mind2).
- **Comprobante pendiente**: `comprobanteUrl`/`comprobanteNombre` pueden
  quedar vacíos al cargar el movimiento. El frontend filtra por esto
  (`comprobantePendiente` en la respuesta) y permite adjuntarlo después con
  `PUT /api/movimientos/{id}/comprobante`.

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
   - **Importante**: la pantalla de consentimiento quedó en estado
     **"Testing"** (no se pudo publicar a producción — la consola pedía
     completar "Branding" y el botón de publicar seguía sin habilitarse
     tras varios intentos). En Testing, el refresh token **vence a los 7
     días**. Cuando deje de funcionar la subida de comprobantes, hay que
     volver a agregar la cuenta como test user si se sacó, y correr de
     nuevo `python3 scripts/oauth_exchange.py` para renovarlo. Pendiente:
     resolver el publish a producción con más calma para que esto no haga
     falta nunca más.
6. Configurar las variables de entorno del backend (Railway):

| Variable | Descripción |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Contenido completo del JSON de la cuenta de servicio (`secrets/service-account.json`) — usado solo para Sheets |
| `SPREADSHEET_ID` | `17rHhCzE3bieXTPWBnwuP2n6YOZnxrkR3umj_kTLlo5A` |
| `DRIVE_FOLDER_ID` | Id en `secrets/drive-folder.json` |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | De `secrets/oauth-client.json` |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | De `secrets/oauth-tokens.json` (`refresh_token`) — usado solo para subir comprobantes a Drive |
| `APP_PASSWORD` | Contraseña de acceso (todos los herederos) |
| `ADMIN_PASSWORD` | Contraseña de administrador (solo quien carga movimientos) |
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
│   └── GoogleClientsConfig.java     # Bean Sheets (cuenta de servicio) + Bean Drive (OAuth refresh token)
├── security/AccessKeyInterceptor.java
├── controller/
│   ├── MovimientoController.java    # GET/POST /api/movimientos, DELETE .../{id}, PUT .../{id}/comprobante
│   └── ApiExceptionHandler.java
├── dto/MovimientoResponse.java
├── service/
│   ├── MovimientoSheetService.java  # append/readAll/softDelete/attachComprobante
│   └── ReceiptDriveService.java     # sube el archivo a Drive
└── exception/UnauthorizedException.java, NotFoundException.java

frontend/src/
├── main.tsx, App.tsx                # App.tsx: gate de acceso -> listado
├── api.ts                           # fetch centralizado + manejo de X-Access-Key
├── types.ts
├── AccessGate.tsx                   # pide APP_PASSWORD
├── AdminUnlockDialog.tsx            # pide ADMIN_PASSWORD
├── Totals.tsx                       # ingresos / gastos / balance
├── MovimientosList.tsx              # listado + filtros (tipo, comprobante pendiente)
├── MovimientoForm.tsx               # alta de movimiento (comprobante opcional)
├── AttachReceiptDialog.tsx          # adjuntar comprobante a un movimiento pendiente
├── ConfirmDialog.tsx                # confirmación de borrado
└── index.css                        # tokens de estética/PALETTE (ver ../estetica-react/ESTETICA-REACT.md)

```

## Pendiente / próximas versiones

- **Publicar la app OAuth a producción** para que el refresh token no venza
  a los 7 días (ver nota en "Puesta en marcha"). Mientras tanto, renovarlo a
  mano con `scripts/oauth_exchange.py` cuando falle una subida.
- Panel de análisis para escritorio (gráficos, totales por categoría/bien y por período).
- Íconos PWA reales — los actuales (`frontend/public/icons/`) son placeholders generados, no arte final.

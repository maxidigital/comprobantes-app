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
        ↓ Sheets API / Drive API (cuenta de servicio)
  Google Sheet compartido  +  carpeta de Google Drive
```

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

## Puesta en marcha (pasos manuales en Google Cloud)

Esto no se puede automatizar desde acá — son pasos en la consola de Google
que solo el dueño de la cuenta puede hacer:

1. Crear (o reusar) un proyecto en [Google Cloud Console](https://console.cloud.google.com/).
2. Habilitar la **Google Sheets API** y la **Google Drive API** para ese proyecto.
3. Crear una **cuenta de servicio** (IAM & Admin → Service Accounts), y
   generar una clave en formato JSON.
4. Crear manualmente:
   - Una planilla de Google Sheets vacía para los movimientos.
   - Una carpeta en Google Drive para los comprobantes.
5. Compartir **ambas** (planilla y carpeta) como Editor con el email de la
   cuenta de servicio (`...@...iam.gserviceaccount.com`, está en el JSON).
   Si además los herederos van a abrir los comprobantes directamente desde
   Drive, compartir la carpeta también con sus emails.
6. Configurar las variables de entorno del backend:

| Variable | Descripción |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Contenido completo del JSON de la cuenta de servicio (no un path — pensado para Railway) |
| `SPREADSHEET_ID` | Id de la planilla (de su URL) |
| `DRIVE_FOLDER_ID` | Id de la carpeta de Drive (de su URL) |
| `APP_PASSWORD` | Contraseña de acceso (todos los herederos) |
| `ADMIN_PASSWORD` | Contraseña de administrador (solo quien carga movimientos) |
| `CORS_ALLOWED_ORIGINS` | Origins permitidos en dev (default `http://localhost:5173`) |

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
│   └── GoogleClientsConfig.java     # Beans Sheets/Drive desde GOOGLE_SERVICE_ACCOUNT_JSON
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

- Panel de análisis para escritorio (gráficos, totales por categoría/bien y por período).
- Íconos PWA reales — los actuales (`frontend/public/icons/`) son placeholders generados, no arte final.
- Eventual login de Google (OAuth) si en algún momento se necesita saber quién cargó cada movimiento.

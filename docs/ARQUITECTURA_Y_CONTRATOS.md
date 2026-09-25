# Arquitectura y contratos de UI

## Estructura objetivo

La aplicacion Angular 21 ya existe en la raiz del repositorio. La Version 2 se implementa **sobre el proyecto actual**, conservando componentes utiles y migrando contratos, rutas y flujo por etapas. No se crea otro `frontend/` ni se borra el trabajo existente para empezar de cero.

La estructura por funcionalidades sigue los modulos del backend:

`src/app/core`: bootstrap, configuracion, sesion, guard, interceptores, cliente HTTP tipado y manejo de errores.

`src/app/layout`: shell, navegacion por acceso, selector de compania/ejercicio, notificaciones.

`src/app/shared`: tablas, estados, formularios, confirmaciones, estados de carga, descarga de archivos.

`src/app/features/{platform,needs,budget,logistics,inventory,masters,dashboard}`: rutas lazy, componentes, servicios y modelos propios. Las carpetas existentes `requerimientos`, `aprobaciones`, `compras` y `maestros` se migran o se envuelven dentro de `logistics`/`masters` sin perder funcionalidad.

Solo el cliente HTTP central conoce la URL base. Las features llaman servicios tipados; no arman headers de auth ni interpretan `ProblemDetail` por separado. Configuracion de entornos sin secretos. Un proxy same-origin debe exponer `/api/v1` hacia el backend en desarrollo y produccion; `/api` queda solo para compatibilidad legacy mientras se migra. Antes de instalar dependencias se verifican las versiones compatibles con Angular 21 y el toolchain del repositorio.

## Comparacion con el frontend actual

| Area | Frontend actual | Objetivo V2 |
|---|---|---|
| API base | `getApiBaseUrl()` apunta a `/api` o API desplegada con `/api` | Cliente central con `/api/v1`; alias `/api` solo para pantallas legacy durante migracion |
| Sesion | Token y usuario en `localStorage`; interceptor Bearer simple | Access token en memoria, refresh cookie `HttpOnly`, refresh unico, logout backend y guards por roles/permisos/scopes |
| Usuario | `Usuario.role` unico | `roles`, `permissions`, `scopes`, `active` desde `/auth/me` |
| Rutas | `/dashboard`, `/requerimientos`, `/aprobaciones`, `/compras`, `/maestros/*` | `/inicio`, `/necesidades/*`, `/presupuesto/*`, `/logistica/*`, `/inventario`, `/maestros/*`, `/plataforma/*`; redirecciones desde rutas antiguas cuando aplique |
| Flujo | Requerimiento manual -> aprobacion -> OC | Cuadro -> consolidacion/transferencia -> PIA/PIM -> requerimiento desde linea -> aprobacion -> cotizacion/adjudicacion -> OC -> recepcion/inventario |
| Modelos | Requerimiento, OC, maestros logisticos y dashboard | Modelos tipados por modulo para las 82 operaciones y gaps backend documentados |
| Errores | Manejo puntual por pantalla/interceptor | Normalizador `ProblemDetail`, estados carga/vacio/error/exito y trazabilidad `traceId` |
| Idempotencia | No centralizada | `Idempotency-Key` en transferencia y controles presupuestales |

## Sesion web: requisito de backend

La solicitud de "guardar contrasena en cookies" se traduce a persistir **la sesion**, nunca la contrasena. Actualmente `/api/v1/auth/login` devuelve `accessToken` y `refreshToken` en JSON, `refresh` y `logout` requieren token en el body, y Spring Security autentica recursos con Bearer. El frontend no puede crear por si solo una cookie `HttpOnly` ni hacer que el backend lea una cookie inexistente.

Contrato propuesto para modo navegador, conservando los clientes Bearer actuales:

1. `POST /api/v1/auth/login` recibe usuario/contrasena. El modo navegador se negocia explicitamente (por `Accept` o contrato equivalente): respuesta con usuario, `accessToken` corto y expiracion; `Set-Cookie` con refresh opaco. Nunca incluir `refreshToken` en el JSON del modo navegador. El servidor guarda solo su hash, como hoy.
2. `POST /api/v1/auth/refresh` en modo navegador lee cookie, rota refresh token, reemplaza cookie y devuelve nuevo access token. No exige un body con refresh token.
3. `POST /api/v1/auth/logout` en modo navegador revoca refresh token y caduca cookie aun si el access token expiro.
4. `GET /api/v1/auth/me` sigue usando `Authorization: Bearer` con el access token en memoria. Al recargar la pagina, hacer una renovacion silenciosa y luego `me`. Solo un refresh en vuelo a la vez; una peticion con 401 se reintenta una sola vez tras renovar.
5. Mantener y probar el contrato JSON actual de login/refresh/logout para CLI y pruebas. Esas tres operaciones siguen siendo la misma funcion de auth; no se crea una segunda experiencia visual para el modo CLI.

Cookie de produccion: `HttpOnly; Secure; SameSite=Lax; Path=/`, host-only, sin `Domain`, con nombre `__Host-erp_refresh` y expiracion alineada al refresh real. Solo HTTPS. En desarrollo local se puede usar una cookie de nombre distinto, `HttpOnly; SameSite=Lax` y `Secure=false` para localhost, documentando que esa excepcion no llega a produccion. El access token se guarda solo en memoria; nunca en `localStorage`, `sessionStorage`, cookies legibles o logs. La contrasena vive solo en el formulario hasta completar login; no se serializa en estado persistente ni analytics. "Recordarme" significa persistencia controlada del refresh token en cookie, no guardar credenciales.

Como refresh/logout se autorizan por cookie, el backend debe implementar defensa CSRF para ese modo (token y cabecera o patron equivalente), validar origen, usar solicitudes con credenciales y configurar CORS con origen exacto cuando aplique. Verificar 401, rotacion, revocacion, expiracion, pestanas concurrentes y cierre de sesion. La UI no oculta un fallo de renovacion: vuelve a login y conserva la ruta de destino solo si es segura.

Referencia de seguridad: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) y [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

## Contrato de transporte

- Base `/api/v1`. Los alias `/api` no se invocan desde la nueva UI.
- JSON para formularios y lecturas, blob para PDF. No asumir que todo error es JSON: gestionar red, timeout y respuestas vacias.
- `PageResponse<T>` contiene `content`, `page` (base 0), `size`, `totalElements` y `totalPages`. Mantener filtros en URL, cancelar GET obsoletos al cambiar filtros, y aplicar pagina/tamano solo donde la API los soporte.
- Enums se envian como codigo backend, no como etiqueta traducida. Montos como decimales exactos, cantidades sin redondeo implicito; fechas `yyyy-MM-dd` para filtros y periodos. Mapear `LocalDateTime`/`OffsetDateTime` segun cada DTO.
- Metadatos de usuario: `id, username, fullName, roles, permissions, scopes, active`. El guard comprueba permiso/rol y alcance antes de mostrar rutas; 403 real se muestra aunque el boton estuviera disponible.
- `ProblemDetail`: leer `detail/message`, `code`, `traceId`, `details` y `status`. No mostrar respuestas HTML ni stack traces.
- `Idempotency-Key` obligatoria en transferencia de Cuadro y precommit/commit/release presupuestal. Generar UUID al comenzar cada intento logico, conservarlo en los reintentos de la misma accion y cambiarlo para una accion nueva. Nunca repetir automaticamente un POST sin saber su resultado.
- Tras una mutacion exitosa, invalidar las consultas relacionadas (bandeja, detalle, saldo, disponibilidad, dashboard). El estado local no sustituye la respuesta del servidor.

## Estados y feedback transversal

Cada vista remota debe cubrir: carga inicial, datos listos, lista vacia, error recuperable, sin permiso y sesion vencida. Skeleton de tabla/formulario en cargas iniciales; spinner localizado en acciones y boton deshabilitado durante el envio. Evitar flashes con un retraso breve para consultas rapidas; si supera ~8 s, mostrar "La consulta sigue en curso" con opcion de cancelar o reintentar donde sea seguro. Barra de progreso determinable para descargas/subidas cuando el transporte lo permita; de lo contrario indicador indeterminado. No prometer porcentajes falsos.

Al crear: aviso de exito especifico, por ejemplo "Cuadro creado con exito" y enlace al detalle. Al enviar/revisar/aprobar/transferir/recibir: nombrar entidad, numero/ID y nuevo estado. Mostrar errores de validacion junto al campo y resumen al inicio; errores de negocio en el contexto de la accion. Los avisos de exito pueden desaparecer; los errores bloqueantes persisten hasta resolverlos. Anunciar mensajes con `aria-live` sin robar foco innecesariamente.

| Condicion | UX minima |
|---|---|
| 400 / `VALIDATION_ERROR` / `BAD_REQUEST` | Mantener formulario y datos, mapear `details` a campos; texto de `detail` arriba |
| 401 | Renovar una vez; si falla, pantalla de login con "Sesion vencida" |
| 403 | "No tienes permiso para esta accion", sin reintento automatico |
| 404 | Estado vacio o entidad inexistente; volver a bandeja con contexto |
| 409 / `BUSINESS_RULE_VIOLATION` | Mostrar regla exacta del backend, refrescar saldos/estado y permitir corregir |
| 500 / `INTERNAL_ERROR` | Mensaje neutral y `traceId` copiable para soporte |
| Red/timeout | "No se pudo conectar"; GET reintentable, POST con resultado incierto requiere verificar entidad/estado antes de repetir |

No mostrar un toast duplicado por interceptor y componente. La capa HTTP transforma error; la vista decide el mensaje contextual. El `traceId` se puede copiar, pero no se registra token o contrasena en telemetria. Operaciones largas se bloquean por accion, no por pagina completa, salvo navegacion inicial.

## Formularios y reglas verificables

- Cuadro: ids de catalogo, centro, fuente, meta y clasificador desde API; linea con item/unidad consistentes. Doce meses 1..12 exactos, suma solicitada igual al total. Revision: doce meses y suma revisada/aprobada coherentes.
- Requerimiento desde Cuadro: consultar saldo de linea antes de enviar; cantidad entera y no mayor al saldo visible; el backend vuelve a validar. Seleccionar almacen y, mientras el contrato lo exija, proveedor.
- Requerimiento legacy: permitir borrador/edicion, explicar antes de aprobacion que actualmente no tiene trazabilidad presupuestal y resolver con ticket backend; no presentar aprobacion como viable.
- Cotizacion: registrar ofertas por `requerimientoDetalleId`; cerrar antes de adjudicar y adjudicar una oferta elegible. No inventar una bandeja de procesos mientras solo existe GET por ID.
- OC: desde adjudicacion o requerimiento aprobado segun contrato; aprobar solo con control presupuestal disponible; mostrar subtotal, IGV, total y moneda tal como devuelve servidor.
- Recepcion: mostrar cantidad pendiente por linea; permitir parcial/total dentro de saldo, reversion con motivo.
- Control presupuestal manual: vista administrativa separada, trazabilidad de documento fuente y confirmacion. El flujo normal usa el precompromiso/compromiso que ejecuta el backend al aprobar; no llamar controles manuales en paralelo por cada clic.

## Pruebas y cierre

Pruebas unitarias de parseo `ProblemDetail`, sesion/refresh, permisos, validaciones mensuales e idempotencia. Pruebas de componentes para carga, vacio, exito, error, modal, teclado y respuestas tardias. Pruebas de contrato contra OpenAPI o respuestas reales para cada fila de `ENDPOINTS.md`. E2E web con usuarios SOLICITANTE, APROBADOR, COMPRAS y ADMIN: login, Cuadro completo, PIA/PIM, saldo, requerimiento, presupuesto insuficiente, cotizacion, OC, recepcion parcial/reversion, kardex, PDF y logout. Probar escritorio y movil.

El backend ya tiene un E2E HTTP en `DemoApplicationTests#shouldCompleteMvp1EndToEndFlowThroughHttpApi`; usarlo para verificar que el frontend reproduce la secuencia sin depender de datos hardcodeados. No se cierra un ticket con capturas solamente: deben pasar build, tests relevantes y comprobacion manual de sus estados.

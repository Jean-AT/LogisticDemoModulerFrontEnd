# Limitaciones y brechas de integracion

Verificadas contra controladores, DTO y configuracion del backend al 2026-09-25. Esta lista separa lo que la UI puede hacer hoy de lo que necesita un contrato HTTP nuevo o corregido. Ninguna brecha se "resuelve" accediendo directamente a tablas desde Angular.

| ID | Evidencia actual | Efecto en frontend | Trabajo necesario |
|---|---|---|---|
| GAP-01 | `AuthController` entrega ambos tokens en JSON y espera refresh/logout en body; `SecurityConfig` usa Bearer y CSRF desactivado | No existe persistencia de sesion web con cookie `HttpOnly` | Modo navegador en endpoints de auth, cookie refresh segura, CSRF, compatibilidad CLI y pruebas |
| GAP-02 | `PlatformController` solo ofrece GET `security/users/{username}/access`; `UserRoleAdministration` es interno | Admin no puede buscar usuarios, asignar/revocar roles ni editar permisos desde UI | API versionada de usuarios/roles/scopes con validaciones y auditoria |
| GAP-03 | `NeedsPlanningService` exige ventanas activas para editar/enviar/revisar/consolidar; existe tabla `needs_windows`, no controller ni seed operativo | El borrador se puede crear, pero esas transiciones pueden fallar sin forma de configurar la ventana desde UI | GET/PUT o acciones equivalentes de ventanas, permisos y pruebas |
| GAP-04 | Plataforma expone GET de un periodo y PUT/open/close, pero no lista periodos; secuencias solo PUT y POST `next` | No hay calendario ni lectura de configuracion de secuencias; `next` consume numeros | GET paginado/lista de periodos y GET secuencias; reservar `next` para accion deliberada |
| GAP-05 | `BudgetController` solo expone tres POST de PIA, GET availability y tres POST de control | Al recargar no se puede consultar PIA/PIM, revisiones, lineas, movimientos ni control por ID/lista | GET de ejercicios/planes/lineas/revisiones, controles y movimientos con alcance/paginacion |
| GAP-06 | `CotizacionController` tiene GET solo por `procesoId` | No hay bandeja ni recuperacion por requerimiento tras perder el ID de la respuesta | GET lista paginada y/o GET proceso por requerimiento, con filtros |
| GAP-07 | `RequerimientoCreateRequest` y `RequerimientoFromNeedsLineRequest` exigen `proveedorId`; DEC-015 del MVP dice elegir proveedor en adjudicacion | El formulario debe pedir proveedor antes de cotizar, contradiciendo el flujo deseado | Decidir y migrar contrato/modelo para proveedor opcional antes de adjudicar, o actualizar decision de negocio; probar OC directa y con adjudicacion |
| GAP-08 | `RequerimientoService.create` crea requerimiento sin needs/budget; `AprobacionService` bloquea aprobar si no hay origen presupuestal | El flujo legacy/manual puede crear/enviar, pero no llegar a aprobacion | API para vincular a Cuadro/control presupuestal o retirar ese camino del flujo aprobable; no prometer OC directa sin ese vinculo |
| GAP-09 | Plataforma tiene catalogo corporativo; Logistica consulta `Item` propio por codigo al crear desde Cuadro | Un item visible en Cuadro puede no existir en maestros logisticos | Sincronizacion/alta coordinada y diagnostico de mapeo; el frontend no duplica datos a ciegas |
| GAP-10 | Platform tiene GET moneda/unidad por codigo, no lista; `/items`, `/almacenes`, `/proveedores` no paginan | Selectores dinamicos y tablas grandes quedan limitados | Catalogos listables y busqueda/paginacion si volumen lo exige; mientras tanto, usar codigos conocidos solo donde contrato lo permita |
| GAP-11 | `GlobalExceptionHandler` produce `ProblemDetail` para excepciones de controller; errores de filtros de Spring Security pueden seguir otro formato | 401/403 pueden tener payload diferente al 400/409/500 | Normalizar respuestas de entry point/denegacion o cubrir explicitamente ambos formatos en cliente y tests |
| GAP-12 | `demo.cors.allowed-origins` inicia en `http://localhost:4200`; no hay proxy frontend | Despliegue separado puede fallar por cookies/CORS | Proxy same-origin local y productivo, HTTPS y configuracion explicita de origen cuando sea necesario |
| GAP-13 | Los endpoints PDF aceptan encabezados por query; no existe persistencia de plantillas | El usuario tendria que repetir datos de cabecera por exportacion | Formulario de encabezado con valores por defecto locales no sensibles; backend de plantillas solo si se requiere persistencia institucional |

## Comportamientos que no se deben ocultar

- El estado del Cuadro depende de ventana y fechas. El frontend puede deshabilitar acciones cuando lo conoce, pero el backend valida de nuevo. Sin API de ventanas se muestra el error 409 y el bloqueo GAP-03.
- La disponibilidad presupuestal solo existe tras PIA aprobado/PIM inicial; `404` de disponibilidad no significa saldo cero. Mostrar "No se encontro disponibilidad para esta dimension" y guiar a revisar PIM.
- El `409` por saldo agotado debe conservar el mensaje del servidor y ofrecer ver disponibilidad actual. El saldo mostrado antes puede estar obsoleto por concurrencia.
- `Idempotency-Key` existe solo en transferencia y controles de presupuesto. Otras mutaciones no garantizan reintento seguro; despues de timeout, consultar estado antes de repetir.
- Las acciones de control presupuestal manual pueden afectar documentos reales. Separarlas del flujo automatico y limitar a administradores/autorizados por backend.
- Los GET de requerimientos y OC no necesariamente tienen igual regla de alcance. Verificar autorizacion real de cada respuesta, no inferir acceso global por la presencia de un menu.
- Las pruebas HTTP actuales usan H2 en perfil test. La aceptacion del navegador debe comprobar tambien Spring + PostgreSQL limpio + Angular a traves del proxy.

## API adicional propuesta (aun no existe)

Estas rutas son objetivo de los tickets backend, no parte de las 82 operaciones existentes. Revisar nombres, DTO y permisos al implementarlas; publicar OpenAPI y actualizar `ENDPOINTS.md`.

| Ticket | Rutas candidatas | Resultado necesario |
|---|---|---|
| BE-FE02 | GET `/api/v1/needs/windows?companyId=&fiscalYear=`, PUT `/api/v1/needs/windows/{type}` | Fechas, tipo, activa y version de cada ventana |
| BE-FE03 | GET `/api/v1/platform/security/users`, GET `/api/v1/platform/security/roles`, POST `/api/v1/platform/security/users/{username}/roles`, DELETE `/api/v1/platform/security/users/{username}/roles/{grantId}`, PUT `/api/v1/platform/security/roles/{code}/permissions` | Usuarios/roles paginados, grants y alcances auditados |
| BE-FE04 | GET `/api/v1/platform/fiscal-periods/calendar?companyId=&fiscalYear=`, GET `/api/v1/platform/document-sequences?companyId=&fiscalYear=` | Periodos y secuencias sin mutacion |
| BE-FE05 | GET `/api/v1/budget/plans?companyId=&fiscalYear=&type=`, GET `/api/v1/budget/plans/{id}`, GET `/api/v1/budget/plans/{id}/reviews`, GET `/api/v1/budget/controls`, GET `/api/v1/budget/controls/{id}`, GET `/api/v1/budget/movements` | Estados, lineas, revisiones, saldos y movimientos persistidos |
| BE-FE06 | GET `/api/v1/cotizaciones/procesos?requerimientoId=&page=&size=` | Bandeja de procesos y recuperacion por requerimiento |
| BE-FE08 | POST `/api/v1/requerimientos/{id}/vincular-cuadro` o contrato equivalente | Origen de Cuadro y dimensiones validadas, sin doble consumo |

## Decisiones de implementacion registradas

| Decision | Motivo |
|---|---|
| Angular 21 en la aplicacion existente de la raiz, rutas standalone lazy | El repositorio ya tiene frontend Angular; V2 lo migra sin recrearlo |
| `/api/v1` como unico prefijo consumido por Angular | Evita duplicidad entre rutas legacy y versionadas |
| Refresh en cookie `HttpOnly` y access token solo en memoria | Sesion persistente sin guardar contrasena ni tokens legibles persistentes |
| Backend autoritativo para permisos, saldos y transiciones | Evita que datos UI obsoletos autoricen una accion invalida |
| Gaps backend se implementan antes del cierre de sus pantallas | La UI no reemplaza datos de consulta con suposiciones |

No se modifica el backend en esta fase de planificacion. Cada GAP tiene un ticket en `BACKLOG.md` y una prueba de aceptacion propuesta.

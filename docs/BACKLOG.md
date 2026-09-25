# Backlog frontend e integraciones V2

Desglose ejecutable para migrar el frontend Angular existente a la Version 2 del flujo MVP1. Estado de todos los tickets: PENDIENTE. No marcar COMPLETADA sin pruebas y evidencia. Dependencias numeradas para permitir trabajo en paralelo sin romper el flujo. Cada ticket debe tener un commit propio con la convencion del proyecto: `feat: CODIGO - Descripcion corta` (o `fix:` si corrige un defecto).

## Regla de migracion

El repositorio ya contiene una aplicacion Angular 21 funcional. La V2 **modifica y amplia** esa aplicacion; no se crea un segundo frontend y no se eliminan pantallas legacy hasta que exista reemplazo probado o redireccion equivalente. Los servicios, componentes y modelos actuales se reutilizan cuando aporten valor, pero se migran a `/api/v1`, sesion web segura, permisos reales y el flujo completo de Cuadro/Presupuesto/Logistica.

## Comparacion de alcance actual vs V2

| Modulo | Existe hoy | Cambio V2 |
|---|---|---|
| Auth | Login JWT, token en `localStorage`, guard por `role` | Sesion web con refresh cookie, access en memoria, `me`, roles/permisos/scopes, logout backend |
| Dashboard | KPIs logisticos en `/dashboard` | `/inicio` con pendientes por perfil, dashboard general y logistica |
| Requerimientos | Lista, alta manual, detalle, edicion, envio, PDF | Mantener legacy con aviso; agregar requerimiento desde linea de Cuadro y saldos |
| Aprobaciones | Bandeja, detalle y decisiones | Conectar precompromiso, errores 409 y ruta `/logistica/aprobaciones` |
| Compras/OC | Generar OC directa desde requerimiento, lista y detalle | Cotizacion, ofertas, adjudicacion, OC desde adjudicacion/directa y aprobacion de OC |
| Maestros | Items, almacenes, proveedores | Mantener y adaptar a selectores V2; diagnosticar mapeo con catalogo de Plataforma |
| Plataforma | No existe | Catalogos, acceso, periodos y secuencias |
| Cuadro | No existe | Planes, revision, consolidacion, transferencia, saldos y trazabilidad |
| Presupuesto | No existe | PIA/PIM, disponibilidad, controles y movimientos |
| Recepcion/inventario | No existe | Recepciones, reversion, kardex y proyeccion |

## Prerrequisitos backend

| Ticket | Depende | Entrega y criterio de aceptacion |
|---|---|---|
| BE-FE01 Sesion web | - | Login/refresh/logout con modo navegador y refresh cookie segura; access en memoria; CSRF; revocacion; CLI Bearer compatible; pruebas de expiracion, rotacion y 401 |
| BE-FE02 Ventanas de Cuadro | - | API para consultar/configurar ventanas por compania/ejercicio/tipo, permisos y fechas; flujo registro-revision-consolidacion ejecutable sin SQL manual |
| BE-FE03 Administracion de acceso | - | Buscar/listar usuarios y roles, consultar/editar asignaciones y scopes mediante API auditada; prohibir privilegios fuera de alcance |
| BE-FE04 Lecturas de Plataforma | - | Listar periodos y leer secuencias sin consumir numeros; opcional listado de monedas/unidades si los formularios requieren eleccion dinamica |
| BE-FE05 Lecturas de Presupuesto | - | GET de ejercicios UNIDADES/PIA/PIM, lineas, revision, movimientos y controles; filtros por compania/ejercicio/estado, paginacion y alcance |
| BE-FE06 Bandeja de cotizaciones | - | GET paginado de procesos, busqueda por requerimiento y contratos de detalle estables |
| BE-FE07 Origen de proveedor | - | Resolver GAP-07: proveedor en adjudicacion o decision de negocio actualizada; migracion, contratos y pruebas de ambos caminos de OC |
| BE-FE08 Requerimiento manual y catalogo | - | Resolver GAP-08/GAP-09: vinculacion presupuestal del manual y correspondencia de items; pruebas de bloqueo y camino valido |
| BE-FE09 Errores de seguridad | BE-FE01 | 401/403 consistentes con `ProblemDetail` o contrato alternativo documentado y probado |

BE-FE07/08 son necesarios para prometer que el flujo manual y el flujo deseado de proveedor llegan a una compra. La UI puede comenzar con el contrato actual, etiquetando sus limites, pero esos tickets bloquean la aceptacion funcional completa.

## Fundacion Angular sobre frontend existente

| Ticket | Depende | Entrega y criterio de aceptacion |
|---|---|---|
| FE-001 Auditoria y shell V2 | - | Auditar frontend actual (`src/app`, servicios, rutas y modelos), mantener Angular 21, actualizar proxy/base API para `/api/v1` con compatibilidad temporal `/api`, reorganizar navegacion hacia modulos V2 sin borrar rutas legacy, agregar `/inicio`, pagina 404 real y layout responsive con compania/ejercicio; build local |
| FE-002 Sesion y autorizacion V2 | FE-001, BE-FE01 | Migrar `SessionService`, `AuthService`, interceptor y guards: access token solo en memoria, refresh cookie con `withCredentials`, renovacion al recargar, `me`, roles/permisos/scopes, logout backend, 401/403 y varias pestanas; eliminar persistencia de token en `localStorage` cuando el backend V2 este disponible |
| FE-003 Infraestructura UX/API V2 | FE-001 | Cliente tipado central, modelos base V2, normalizador `ProblemDetail`, PageResponse, estados carga/vacio/error/exito, toasts sin duplicar, dialogo de confirmacion, descarga blob, control de timeout, claves de idempotencia y adaptadores temporales para pantallas legacy; tests de estados y accesibilidad |

## Modulos

| Ticket | Depende | Entrega y criterio de aceptacion |
|---|---|---|
| FE-004 Plataforma | FE-002, FE-003, BE-FE03, BE-FE04 | Catalogos, selector compania/ejercicio, usuarios/roles/scopes, periodos y secuencias. Cubrir las 17 filas de Plataforma; `next` solo por accion confirmada |
| FE-005 Cuadros | FE-002, FE-003, FE-004, BE-FE02 | Bandeja/detalle/alta/edicion/envio/revision/observacion/rechazo, doce meses y totales, estados y permisos. Cubrir 8 operaciones de planes |
| FE-006 Consolidacion | FE-005 | Bandeja/detalle/consolidar/revertir/transferir, `Idempotency-Key` estable, saldo de linea y trazabilidad. Cubrir 7 operaciones restantes de Cuadro |
| FE-007 Presupuesto | FE-006, BE-FE05 | PIA generar/revisar/aprobar, lecturas PIA/PIM, disponibilidad, controles manuales/release y movimientos. Cubrir las 7 operaciones actuales mas GET nuevos |
| FE-008 Maestros logisticos | FE-002, FE-003 | Migrar pantallas existentes de items, almacenes y proveedores a infraestructura V2, conservar altas/listas actuales, errores por campo y actualizacion de selects. Cubrir 6 operaciones |
| FE-009 Requerimientos V2 | FE-005, FE-007, FE-008, BE-FE08 | Migrar pantallas existentes de requerimientos: alta desde Cuadro y manual legacy, bandeja, detalle, edicion, envio, PDF, rutas nuevas `/logistica/requerimientos/*` y redirecciones desde rutas antiguas. Mostrar origen presupuestal, saldo y restricciones del manual. Cubrir 7 operaciones |
| FE-010 Aprobaciones V2 | FE-009 | Migrar bandeja/detalle existentes a `/logistica/aprobaciones`, aprobar/observar/rechazar, comentario, precompromiso reflejado, PDF y 409 por presupuesto. Cubrir 5 operaciones |
| FE-011 Cotizacion y OC V2 | FE-010, BE-FE06, BE-FE07 | Extender compras existentes: abrir/listar proceso, ofertas, comparacion, cerrar, adjudicar, OC desde adjudicacion y ruta directa, lista/detalle/aprobacion/PDF, rutas `/logistica/compras`, `/logistica/cotizaciones/:id`, `/logistica/ordenes/*`. Cubrir 5 + 6 operaciones |
| FE-012 Recepcion e inventario | FE-011 | Recepcion parcial/total, detalle/historial/reversion, kardex y proyeccion. Cubrir 4 + 2 operaciones |
| FE-013 Inicio, trazabilidad y PDFs | FE-010, FE-011, FE-012 | Migrar dashboard actual a `/inicio`, agregar resumen general y logistica, trazabilidad JSON/PDF, estados de descarga; enlazar detalles entre modulos. Cubrir 4 operaciones de consultas y todos los PDFs |

## Validacion y cierre

| Ticket | Depende | Entrega y criterio de aceptacion |
|---|---|---|
| FE-014 Contratos y accesibilidad | FE-004 a FE-013 | Auditoria de las 82 filas de `ENDPOINTS.md`: accion UI + cliente + permiso + carga + exito + error + prueba; teclado, foco, contraste y 320/768/1440 px |
| FE-015 E2E web integrado | FE-014, BE-FE01 a BE-FE09 | PostgreSQL limpio + backend + frontend; usuarios por rol; flujo anual hasta stock dos veces sin SQL manual ni documentos duplicados; 400/401/403/409/500, timeout y PDF |
| FE-016 Operacion y despliegue | FE-015 | Build reproducible, configuracion por entorno, proxy/HTTPS/cookies, smoke de salud/login, instrucciones de arranque y captura de evidencia de aceptacion |

## Definicion de terminado por ticket

1. Rutas y acciones del ticket funcionan sobre API real o mock de contrato validado, con los permisos efectivos del backend.
2. Cada consulta/mutacion tiene estado de carga, exito, vacio si aplica, error y reintento seguro.
3. Formatos, validaciones y transiciones coinciden con DTO/servicio; cambios de compania/ejercicio invalidan datos dependientes.
4. Tests relevantes y build pasan; se documentan limites restantes y se actualiza cobertura de `ENDPOINTS.md`.
5. Commit exclusivo del ticket, sin incluir `.env`, `node_modules`, `target` ni archivos locales ajenos. El push lo realiza el usuario salvo nueva instruccion.

## Relacion con las macro tareas previas

| Macro | Tickets de este plan |
|---|---|
| FE-T01 Shell/autenticacion | BE-FE01, FE-001 a FE-003 |
| FE-T02 Plataforma/Cuadro | BE-FE02 a BE-FE04, FE-004 a FE-006 |
| FE-T03 Presupuesto/Logistica | BE-FE05 a BE-FE09, FE-007 a FE-013 |
| FE-T04 Tests E2E | FE-014 a FE-016 |

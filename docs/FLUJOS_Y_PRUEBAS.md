# Flujos y pruebas de aceptacion web

Esta guia se ejecuta sobre una base PostgreSQL limpia y datos de demo reproducibles, con backend y Angular por el mismo origen/proxy. Los IDs se obtienen de respuestas; no se fijan en componentes ni tests. Las operaciones se verifican tambien por GET posterior.

## Escenario A: flujo principal completo

| Paso | Usuario | Accion UI | Evidencia esperada |
|---:|---|---|---|
| 1 | ADMIN | Iniciar sesion, elegir compania/ejercicio, revisar catalogos, periodo y ventanas | `me` refleja roles/scopes; periodo y ventanas disponibles |
| 2 | SOLICITANTE | Crear Cuadro con 12 meses y enviar | Estado DRAFT -> SUBMITTED, mensaje de exito, linea persistida |
| 3 | APROBADOR | Revisar 12 meses y consolidar | Cantidades solicitada/revisada/aprobada visibles, consolidacion con fuentes |
| 4 | APROBADOR | Transferir | Una transferencia y saldo mensual; segundo clic con misma clave no duplica |
| 5 | APROBADOR | Generar, revisar y aprobar PIA | Identificadores PIA/PIM y disponibilidad consultable |
| 6 | SOLICITANTE | Crear requerimiento desde linea de Cuadro y enviar | Relacion `needsPlanId/needsLineId`, cantidad consumida y saldo restante |
| 7 | APROBADOR | Aprobar requerimiento | `budgetControlId` presente, precomprometido aumenta y disponible baja |
| 8 | COMPRAS | Abrir cotizacion, registrar ofertas, cerrar y adjudicar | Proceso y adjudicacion recuperables al recargar |
| 9 | COMPRAS | Generar OC desde adjudicacion | Orden y detalles correctos, presupuesto aun reservado |
| 10 | APROBADOR | Aprobar OC | Comprometido aumenta, precomprometido disminuye sin doble afectacion |
| 11 | COMPRAS | Recibir parcialmente y luego completar | Estado/pendiente correctos, kardex y proyeccion actualizados |
| 12 | COMPRAS/APROBADOR | Abrir trazabilidad y cuatro variantes PDF | Eventos ordenados, blobs PDF validos, descarga con nombre |

Repetir el recorrido con otro Cuadro/linea para comprobar que no se mezclan IDs, saldos ni claves de idempotencia. Verificar que la navegacion directa a cada detalle funciona tras recargar la pagina.

## Escenario B: errores y recuperacion

| Caso | Accion | Resultado visible |
|---|---|---|
| Credenciales invalidas | Login fallido | Error de auth, formulario preservado sin contrasena persistida |
| Sesion expirada | Abrir detalle con access vencido | Refresh unico; si falla, login y destino preservado |
| Acceso denegado | Entrar a URL de rol ajeno | 403 legible, sin datos de otro alcance |
| Meses incompletos | Crear/revisar Cuadro con menos de 12 | Validacion local por linea; 400 backend tambien manejado |
| Suma mensual inconsistente | Cambiar total anual | Bloqueo de envio con diferencia mostrada |
| Ventana cerrada | Intentar enviar/revisar | 409 y estado actual recargado |
| Presupuesto insuficiente | Aprobar requerimiento que supera disponibilidad | 409 con motivo, saldo actualizado y sin aprobacion falsa |
| Concurrencia | Dos usuarios consumen mismo saldo | Uno puede recibir 409; UI no conserva exito optimista incorrecto |
| Timeout despues de POST | Cortar respuesta tras envio | Aviso "resultado incierto"; consultar estado antes de repetir |
| GET lento | Retrasar consulta | Skeleton/spinner, aviso de demora, cancelacion/reintento seguro |
| Error 500 | Forzar fallo controlado | Mensaje neutral y `traceId` copiable |
| PDF fallido | Respuesta de error o blob invalido | No descargar archivo corrupto; mensaje y opcion reintentar |
| Recepcion excedida | Enviar cantidad mayor al pendiente | Error por linea, sin modificar kardex |
| Reversion | Revertir recepcion con motivo | Movimiento compensatorio visible; no borrar historial |
| Numero documental | Abrir pantalla de secuencias | No llamar `next` hasta confirmar; un clic consume uno |

## Matriz de pruebas por capa

| Capa | Casos obligatorios |
|---|---|
| Unitarias | Normalizar `ProblemDetail`; formato dinero/fecha; permisos/scopes; total de 12 meses; generacion/conservacion de `Idempotency-Key` |
| Componentes | Lista vacia, loading, error, exito, validacion por campo, dialogos, acciones deshabilitadas y aria-live |
| Contrato HTTP | Metodo/ruta/query/body/headers/respuesta de cada una de las 82 filas de `ENDPOINTS.md` y los GET nuevos al existir |
| E2E navegador | Escenarios A y B con cuatro perfiles, rutas profundas, recarga y pantallas 320/768/1440 px |
| Seguridad | Cookies y CSRF; no tokens en storage/logs; 401/403; doble refresh; logout invalida la sesion |
| Integracion backend | `DemoApplicationTests#shouldCompleteMvp1EndToEndFlowThroughHttpApi` y regresion relacionada tras cambios de contratos |

## Evidencia de cierre

Por ticket: comando ejecutado y resultado, capturas de escritorio/movil de la pantalla afectada, requests/responses relevantes sin credenciales, y filas de `ENDPOINTS.md` cubiertas. Registrar en el PR o resumen del ticket las brechas no cerradas. No guardar tokens reales ni contrasenas en fixtures, capturas o logs.

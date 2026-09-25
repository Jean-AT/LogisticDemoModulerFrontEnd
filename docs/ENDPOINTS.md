# Inventario de endpoints para frontend

Inventario de los controladores del backend al 2026-09-25. Son **82 operaciones funcionales canonicas** bajo `/api/v1`. Cada fila tiene un uso previsto en la interfaz o en la capa de sesion. Los alias `/api` exponen varias de las mismas operaciones y quedan solo para compatibilidad. Todos los GET requieren autenticacion salvo recursos explicitamente publicos; donde se indica un rol/permiso, es una restriccion adicional.

La columna "UI" identifica una vista o accion de `IDEA_Y_EXPERIENCIA.md`. Que una operacion este inventariada no significa que su pantalla se pueda completar sin las brechas de `LIMITACIONES.md`.

## Auth (4)

| Metodo y ruta | Acceso | UI / uso |
|---|---|---|
| POST `/auth/login` | Publico | Login; modo navegador con refresh en cookie propuesto |
| POST `/auth/refresh` | Publico | Restaurar sesion al recargar y renovar access token; cookie en modo navegador |
| POST `/auth/logout` | Publico | Menu usuario > salir; revocacion y borrado de cookie |
| GET `/auth/me` | Autenticado | Identidad, roles, permisos y alcances para shell/guards |

El modo navegador requiere trabajo backend antes de conectar la UI. El contrato Bearer/JSON actual se conserva para CLI.

## Plataforma (17)

| Metodo y ruta | Permiso | UI / uso |
|---|---|---|
| GET `/platform/catalog/companies` | PLATFORM.MASTER.READ | Selector de compania y catalogo |
| GET `/platform/catalog/companies/{companyId}` | PLATFORM.MASTER.READ | Cabecera de compania seleccionada |
| GET `/platform/catalog/cost-centers?companyId=` | PLATFORM.MASTER.READ | Selector de centro en Cuadro/presupuesto |
| GET `/platform/catalog/financing-sources?companyId=` | PLATFORM.MASTER.READ | Selector de fuente |
| GET `/platform/catalog/goals?companyId=&fiscalYear=` | PLATFORM.MASTER.READ | Selector de meta |
| GET `/platform/catalog/expense-classifiers?companyId=` | PLATFORM.MASTER.READ | Selector de clasificador |
| GET `/platform/catalog/items?companyId=` | PLATFORM.MASTER.READ | Selector de bien/servicio del Cuadro |
| GET `/platform/catalog/items/{itemCode}?companyId=` | PLATFORM.MASTER.READ | Verificar codigo y detalle del item elegido |
| GET `/platform/catalog/currencies/{currencyCode}` | PLATFORM.MASTER.READ | Etiqueta/simbolo de moneda elegida |
| GET `/platform/catalog/units/{unitCode}` | PLATFORM.MASTER.READ | Etiqueta de unidad elegida |
| GET `/platform/security/users/{username}/access` | PLATFORM.SECURITY.WRITE | Inspeccion del perfil de un usuario en acceso admin |
| GET `/platform/fiscal-periods?companyId=&date=` o `fiscalYear=&month=` | PLATFORM.MASTER.READ | Estado de un periodo por fecha o mes |
| PUT `/platform/fiscal-periods` | PLATFORM.MASTER.WRITE | Definir/actualizar un periodo |
| POST `/platform/fiscal-periods/{companyId}/{fiscalYear}/{month}/open` | PLATFORM.MASTER.WRITE | Abrir periodo tras confirmacion |
| POST `/platform/fiscal-periods/{companyId}/{fiscalYear}/{month}/close` | PLATFORM.MASTER.WRITE | Cerrar periodo tras confirmacion |
| PUT `/platform/document-sequences` | PLATFORM.MASTER.WRITE | Configurar prefijo/valor de secuencia |
| POST `/platform/document-sequences/next` | PLATFORM.MASTER.WRITE | Emitir siguiente numero mediante accion admin explicita; consume numero |

No existe API HTTP para listar usuarios, asignar roles o consultar secuencias sin incrementarlas. Ver `LIMITACIONES.md`.

## Cuadro de Necesidades (15)

| Metodo y ruta | Rol | UI / uso |
|---|---|---|
| GET `/needs/plans?companyId=&fiscalYear=&status=&page=&size=` | SOLICITANTE, APROBADOR, ADMIN | Bandeja de Cuadros con paginacion |
| GET `/needs/plans/{id}` | SOLICITANTE, APROBADOR, ADMIN | Detalle, edicion y revision |
| POST `/needs/plans` | SOLICITANTE, ADMIN | Crear Cuadro con detalles y doce meses |
| PUT `/needs/plans/{id}/details` | SOLICITANTE, ADMIN | Reemplazar lineas en ventana de registro |
| POST `/needs/plans/{id}/submit` | SOLICITANTE, ADMIN | Enviar a revision |
| POST `/needs/plans/{id}/review` | APROBADOR, ADMIN | Revisar cantidades y doce meses |
| POST `/needs/plans/{id}/observe` | APROBADOR, ADMIN | Observar Cuadro |
| POST `/needs/plans/{id}/reject` | APROBADOR, ADMIN | Rechazar Cuadro |
| GET `/needs/consolidations?companyId=&fiscalYear=&page=&size=` | APROBADOR, ADMIN | Bandeja de consolidaciones |
| GET `/needs/consolidations/{id}` | APROBADOR, ADMIN | Detalle/fuentes/lineas |
| POST `/needs/consolidations?companyId=&fiscalYear=` | APROBADOR, ADMIN | Consolidar Cuadros revisados |
| POST `/needs/consolidations/{id}/reverse` | APROBADOR, ADMIN | Revertir antes de transferencia |
| POST `/needs/consolidations/{id}/transfer` | APROBADOR, ADMIN | Transferir; enviar `Idempotency-Key` |
| GET `/needs/balances/{lineId}?companyId=` | SOLICITANTE, APROBADOR, ADMIN | Saldo de linea transferida, total y por mes |
| GET `/needs/traceability/plans/{id}` | SOLICITANTE, APROBADOR, ADMIN | Historial Cuadro > consolidacion > transferencia |

La API no publica lectura/configuracion de ventanas REGISTRATION, REVIEW y CONSOLIDATION. La edicion/envio/revision/consolidacion dependen de esas ventanas.

## Presupuesto (7)

| Metodo y ruta | Rol | UI / uso |
|---|---|---|
| POST `/budget/plans/pia/generate` | APROBADOR, ADMIN | Generar PIA desde unidades transferidas |
| POST `/budget/plans/pia/review` | APROBADOR, ADMIN | Registrar revision/notas |
| POST `/budget/plans/pia/approve` | APROBADOR, ADMIN | Aprobar PIA y crear PIM inicial |
| GET `/budget/availability?companyId=&fiscalYear=&month=&costCenterId=&financingSourceId=&goalId=&expenseClassifierId=&currency=` | SOLICITANTE, APROBADOR, ADMIN | Consulta de disponibilidad por dimension |
| POST `/budget/controls/precommit` | APROBADOR, ADMIN | Consola de control manual; `Idempotency-Key` |
| POST `/budget/controls/{id}/commit` | APROBADOR, ADMIN | Consola de control manual; `Idempotency-Key` |
| POST `/budget/controls/{id}/release` | APROBADOR, ADMIN | Liberar con motivo; `Idempotency-Key` |

Los controles normales de requerimiento/OC los ejecuta el backend al aprobar. La consola manual no duplica esas operaciones. Faltan GET de plan, lineas, revisiones, movimientos y controles para una pantalla de presupuesto completa.

## Maestros logisticos (6)

| Metodo y ruta | Acceso | UI / uso |
|---|---|---|
| GET `/items` | Autenticado | Lista/select de items logisticos |
| POST `/items` | ADMIN, SOLICITANTE | Alta de item logistico |
| GET `/almacenes` | Autenticado | Lista/select de almacenes |
| POST `/almacenes` | ADMIN, SOLICITANTE | Alta de almacen |
| GET `/proveedores` | Autenticado | Lista/select de proveedores |
| POST `/proveedores` | ADMIN, SOLICITANTE | Alta de proveedor |

Catalogo corporativo de Plataforma y items logisticos son fuentes distintas. Validar correspondencia por codigo antes de usar una linea de Cuadro en un requerimiento.

## Requerimientos (7)

| Metodo y ruta | Acceso | UI / uso |
|---|---|---|
| POST `/requerimientos` | SOLICITANTE, ADMIN | Crear borrador legacy/manual |
| POST `/requerimientos/desde-cuadro` | SOLICITANTE, ADMIN | Crear desde linea transferida |
| GET `/requerimientos?estado=&numero=&proveedorId=&fechaDesde=&fechaHasta=&page=&size=` | Autenticado; alcance por servidor | Bandeja y filtros |
| GET `/requerimientos/{id}` | Autenticado; alcance por servidor | Detalle, presupuesto e historial |
| GET `/requerimientos/{id}/pdf` | Autenticado; alcance por servidor | Exportar PDF del requerimiento |
| POST `/requerimientos/{id}/enviar` | SOLICITANTE, ADMIN | Enviar borrador/observado |
| PUT `/requerimientos/{id}` | SOLICITANTE, ADMIN | Editar borrador/observado |

El contrato actual requiere `proveedorId` tanto al crear manualmente como desde Cuadro. Un requerimiento manual sin origen presupuestal no puede aprobarse hoy.

## Aprobaciones (5)

| Metodo y ruta | Rol | UI / uso |
|---|---|---|
| GET `/aprobaciones?id=&estado=&numero=&proveedorId=&fechaDesde=&fechaHasta=&page=&size=` | APROBADOR, ADMIN, COMPRAS | Bandeja de decisiones |
| GET `/aprobaciones/{requerimientoId}/pdf` | APROBADOR, ADMIN, COMPRAS | PDF de aprobacion |
| POST `/aprobaciones/{requerimientoId}/aprobar` | APROBADOR, ADMIN | Aprobar con precompromiso |
| POST `/aprobaciones/{requerimientoId}/observar` | APROBADOR, ADMIN | Observar con comentario |
| POST `/aprobaciones/{requerimientoId}/rechazar` | APROBADOR, ADMIN | Rechazar con comentario |

## Cotizaciones (5)

| Metodo y ruta | Rol | UI / uso |
|---|---|---|
| POST `/cotizaciones/procesos/requerimientos/{requerimientoId}` | COMPRAS, ADMIN | Abrir proceso desde requerimiento aprobado |
| POST `/cotizaciones/procesos/{procesoId}/ofertas` | COMPRAS, ADMIN | Registrar oferta por detalle y proveedor |
| POST `/cotizaciones/procesos/{procesoId}/cerrar` | COMPRAS, ADMIN | Cerrar recepcion de ofertas |
| POST `/cotizaciones/procesos/{procesoId}/adjudicar` | COMPRAS, ADMIN | Adjudicar cotizacion seleccionada |
| GET `/cotizaciones/procesos/{procesoId}` | COMPRAS, ADMIN, APROBADOR | Detalle/comparacion del proceso |

No hay GET para listar procesos ni buscar por requerimiento. Hasta agregarlo, solo se puede navegar al proceso desde la respuesta de creacion o un ID conocido.

## Ordenes de compra (6)

| Metodo y ruta | Acceso | UI / uso |
|---|---|---|
| POST `/ordenes-compra/desde-requerimiento/{requerimientoId}` | COMPRAS, ADMIN | Generacion directa desde requerimiento |
| POST `/ordenes-compra/desde-adjudicacion/{adjudicacionId}` | COMPRAS, ADMIN | Generar desde adjudicacion |
| POST `/ordenes-compra/{id}/aprobar` | APROBADOR, ADMIN | Aprobar y comprometer presupuesto |
| GET `/ordenes-compra?numero=&proveedorId=&moneda=&requerimientoId=&fechaDesde=&fechaHasta=&page=&size=` | Autenticado | Bandeja/filtros |
| GET `/ordenes-compra/{id}` | Autenticado | Detalle y totales |
| GET `/ordenes-compra/{id}/pdf` | COMPRAS, ADMIN, APROBADOR | PDF de la OC |

## Recepciones (4)

| Metodo y ruta | Rol | UI / uso |
|---|---|---|
| POST `/recepciones-almacen/ordenes-compra/{ordenCompraId}` | COMPRAS, ADMIN | Registrar parcial/total por detalle de OC |
| POST `/recepciones-almacen/{id}/revertir` | COMPRAS, ADMIN | Revertir con motivo y confirmacion |
| GET `/recepciones-almacen/ordenes-compra/{ordenCompraId}` | COMPRAS, ADMIN, APROBADOR | Historial de recepciones de una OC |
| GET `/recepciones-almacen/{id}` | COMPRAS, ADMIN, APROBADOR | Detalle de recepcion |

## Inventario (2)

| Metodo y ruta | Rol | UI / uso |
|---|---|---|
| GET `/inventario/kardex?itemId=&almacenId=` | COMPRAS, ADMIN, APROBADOR | Movimientos por item/almacen |
| GET `/inventario/proyeccion?itemId=&almacenId=` | COMPRAS, ADMIN, APROBADOR | Saldo/proyeccion por item/almacen |

## Inicio, consultas y trazabilidad (4)

| Metodo y ruta | Acceso | UI / uso |
|---|---|---|
| GET `/dashboard` | Autenticado | Resumen general/personal del inicio |
| GET `/logistica/dashboard` | COMPRAS, APROBADOR, ADMIN | Resumen operativo de logistica |
| GET `/logistica/trazabilidad/requerimientos/{id}` | COMPRAS, APROBADOR, ADMIN | Linea de tiempo de requerimiento a inventario |
| GET `/logistica/trazabilidad/requerimientos/{id}/pdf` | COMPRAS, APROBADOR, ADMIN | PDF de trazabilidad |

## Cobertura

Conteo: 4 + 17 + 15 + 7 + 6 + 7 + 5 + 5 + 6 + 4 + 2 + 4 = 82. Las rutas operativas `/actuator/health`, `/api-docs` y Swagger son herramientas de salud/desarrollo, no pantallas de negocio. Los servicios internos que no tienen controller se registran como brechas de API en `LIMITACIONES.md`.

Para cada fila, el ticket de su modulo debe dejar evidencia: cliente tipado, componente/accion, estado de carga, exito, error y prueba del contrato. Ninguna accion se da por cubierta solo porque exista un metodo de servicio sin acceso desde la UI.

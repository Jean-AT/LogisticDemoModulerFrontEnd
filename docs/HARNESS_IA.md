# Harness de trabajo para IA

Rutina para implementar el backlog sin perder contrato, estado ni contexto. Este archivo es una guia operativa, no codigo ejecutable.

## Inicio de cada ticket

1. Leer `/AGENTS.md`, `/BACKLOG.md`, `/LIMITACIONES.md` y la seccion del modulo en `/ENDPOINTS.md`.
2. Leer controlador, DTO, servicio, excepciones y tests del modulo real. Ante discrepancia, el codigo actual manda; actualizar docs en el mismo ticket.
3. Revisar el frontend existente afectado: rutas, componentes, servicios, modelos, tests y estilos. La V2 modifica esa base; no se crea otro frontend ni se borran pantallas sin reemplazo probado.
4. Revisar `git status --short`. Hay archivos locales del usuario y no se deben agregar, borrar ni reescribir por accidente.
5. Definir rutas UI, acciones, estados loading/vacio/exito/error, rol/alcance y casos de prueba del ticket. Si existe GAP bloqueante, implementar su ticket backend primero.
6. Crear un checklist de filas exactas de `ENDPOINTS.md` del modulo. Cerrar cada fila solo con accion UI accesible y prueba de request.

## Bucle de implementacion

1. Implementar cliente tipado y modelo de respuesta/error.
2. Implementar pantalla y navegacion reales, con datos obtenidos de API y sin IDs hardcodeados.
3. Agregar guard de acceso, validacion, confirmacion y feedback para cada accion.
4. Probar estados de carga y respuesta tardia, incluyendo cancelacion de GET obsoletos.
5. Probar contrato y UI; ejecutar build. Para cambios backend, correr test de backend relevante y el E2E HTTP.
6. Revisar visualmente desktop/movil y flujos de teclado; corregir solapes y errores.
7. Actualizar la matriz de endpoints, brechas y estado del backlog solo despues de evidencia.
8. Hacer commit del ticket segun `BACKLOG.md`; no incluir archivos ajenos. El usuario hace push.

## Comandos de referencia

Desde la raiz, en PowerShell:

`rg --files src/main/java/com/logistica/demo | rg 'Controller|dto'`

`rg -n '@(GetMapping|PostMapping|PutMapping|PatchMapping|DeleteMapping)|@PreAuthorize|Idempotency-Key' src/main/java/com/logistica/demo -g '*Controller.java'`

`mvn test "-Dtest=DemoApplicationTests#shouldCompleteMvp1EndToEndFlowThroughHttpApi"`

`mvn test "-Dtest=DemoApplicationTests#shouldCompleteAnnualNeedsFlowThroughApiWithIdempotentTransferAndBalances,DemoApplicationTests#shouldCompleteMvp1EndToEndFlowThroughHttpApi"`

Los dos tests anteriores usan perfil test/H2 y no necesitan Docker. Para E2E web usar o agregar scripts en el proyecto Angular existente; documentar sus comandos reales en ese ticket. Para PostgreSQL local, usar `docker-compose.yml` o las instrucciones vigentes del repo y configurar variables en el entorno sin copiar secretos al plan.

## Datos y fixtures

- Fixture minimo reproducible: una compania, ejercicio, 12 periodos, ventanas de registro/revision/consolidacion, centro, fuente, meta, clasificador, item corporativo y logistico con mismo codigo, unidad, almacen, proveedor y usuarios por rol.
- Reutilizar seed/migraciones existentes donde sea posible; crear solo datos adicionales de test mediante API o setup de prueba aislado. No hacer cambios manuales en la DB para que la demo funcione.
- Cada test usa IDs de respuestas y un identificador unico de corrida. Las claves de idempotencia son por accion logica, no valores fijos compartidos entre corridas.
- Los mocks de UI representan contratos reales y estados de fallo; no sustituyen la prueba de integracion final.

## Comprobacion rapida de una accion

| Pregunta | Resultado exigido |
|---|---|
| Quien puede verla y ejecutarla? | Roles, permisos y scope de `me`; verificacion server-side |
| Que datos consume? | Endpoint, filtros/DTO y dependencia de compania/ejercicio |
| Que ve mientras espera? | Skeleton o spinner; boton bloqueado, sin salto de layout |
| Que ve si sale bien? | Estado del servidor, mensaje especifico y datos actualizados |
| Que ve si falla? | Campo o negocio, traceId si 500, ruta de recuperacion |
| Que pasa al reintentar? | GET seguro; POST solo con idempotencia o tras verificar estado |
| Como se prueba? | Unit/componente/contrato/E2E segun el riesgo |

## Prompt para continuar un ticket

`Implementa [CODIGO] de docs/BACKLOG.md sobre el frontend Angular existente. Lee docs/AGENTS.md, LIMITACIONES.md, ENDPOINTS.md, el codigo actual de src/app y los controladores/DTO del modulo. Cubre todas las acciones y estados descritos, prueba los contratos y la UI, actualiza la documentacion afectada y crea un commit exclusivo con la convencion del proyecto. No hagas push.`

Al terminar, informar: ticket, archivos, endpoints cubiertos, pruebas ejecutadas, brechas abiertas y hash de commit. Si un endpoint del codigo aparece nuevo o cambia, actualizar el inventario antes de dar cobertura por completa.

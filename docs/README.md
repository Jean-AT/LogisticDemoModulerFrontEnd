# Frontend ERP MVP1 / Version 2

Plan de implementacion para adaptar el frontend Angular existente al backend versionado y al flujo MVP1 completo. Estado: PLANIFICADO PARA MIGRACION V2; **no se elimina ni se reemplaza** la aplicacion actual.

## Orden de lectura

1. [Idea y experiencia](IDEA_Y_EXPERIENCIA.md): usuarios, navegacion, pantallas y flujo completo.
2. [Arquitectura y contratos](ARQUITECTURA_Y_CONTRATOS.md): Angular, sesion, datos, errores, carga y pruebas.
3. [Inventario de endpoints](ENDPOINTS.md): las 82 operaciones canonicas de `/api/v1` y su lugar en la UI.
4. [Limitaciones](LIMITACIONES.md): brechas comprobadas del backend y decisiones pendientes de implementacion.
5. [Backlog](BACKLOG.md): tickets ordenados, dependencias y criterios de aceptacion.
6. [Flujos y pruebas](FLUJOS_Y_PRUEBAS.md): escenarios de aceptacion y fallos.
7. [Harness IA](HARNESS_IA.md): rutina de trabajo y evidencia para ejecutar los tickets.
8. [AGENTS.md](AGENTS.md): instrucciones para agentes que mantengan este plan.

## Fuentes de verdad

- Controladores y DTO en `src/main/java/com/logistica/demo`, consultados para este inventario el 2026-09-25.
- Aplicacion Angular 21 existente en la raiz del repositorio (`src/app`, `angular.json`, `package.json`).
- `docs/MVP1_DECISIONES_Y_ALCANCE.md` y `docs/MVP1_REQUERIMIENTOS.md` para alcance y Angular 21.
- `docs/MVP1_BACKLOG.md` contiene FE-T01 a FE-T04 como macro tareas; este backlog las descompone sin modificar ese archivo, que tiene cambios locales del usuario.
- `UXUI_PLAN.md` y `UX_UIPlanImplementation.md` son referencias UX locales; algunas afirmaciones sobre endpoints ya no coinciden con los controladores. Verificar siempre el codigo.

El cliente V2 vive sobre la aplicacion Angular ya existente en la raiz del repositorio. La API canonica para la UI es `/api/v1`. Las rutas `/api` son alias legacy/de compatibilidad y no se duplican como pantallas nuevas.

## Contexto del frontend existente

El frontend actual ya cubre una primera version logistica:

- Auth Bearer/JWT, interceptor y guard por un solo `role`.
- Dashboard, requerimientos, aprobaciones, compras/ordenes y maestros logisticos.
- Servicios actuales para `/auth`, `/dashboard`, `/requerimientos`, `/aprobaciones`, `/ordenes-compra`, `/items`, `/almacenes` y `/proveedores`.
- Modelos centrados en requerimiento manual, aprobacion, orden de compra y maestros.

La Version 2 debe migrar gradualmente esas piezas a los contratos nuevos sin borrar pantallas funcionales. Cuando una ruta antigua siga siendo util, se conserva como compatibilidad o se redirige a la ruta nueva equivalente despues de que exista la pantalla V2.

## Meta de cierre

Una persona autorizada debe poder recorrer desde configuracion y Cuadro hasta presupuesto, requerimiento, cotizacion, orden, recepcion, kardex y PDF desde la UI, con permisos, saldos, estados, mensajes y trazabilidad correctos. Cada operacion publicada en la matriz tiene al menos un punto de uso y una prueba de contrato o flujo. El navegador no conserva contrasenas ni refresh tokens legibles por JavaScript.

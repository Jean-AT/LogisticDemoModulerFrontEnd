# Instrucciones para agentes de frontend

Este archivo gobierna el trabajo documental y la migracion V2 del frontend Angular existente en la raiz del repositorio.

## Fuentes y alcance

- Leer `README.md` y `BACKLOG.md` antes de trabajar. `ENDPOINTS.md` enumera las 82 operaciones canonicas actuales; cotejar con controladores/DTO antes de implementar.
- Trabajar sobre la aplicacion actual (`src/app`, `angular.json`, `package.json`). No crear un segundo `frontend/` y no borrar pantallas legacy hasta reemplazarlas con una ruta V2 probada o una redireccion equivalente.
- Conservar `/api/v1` como API del frontend. `/api` es alias legacy, no una segunda integracion.
- Mantener Angular 21 y los modulos existentes del backend. No construir una landing page ni vistas de demo que oculten funciones.
- No declarar una pantalla terminada si alguno de sus endpoints no tiene accion UI, estados de carga/exito/error y prueba de contrato.
- Los GAP de `LIMITACIONES.md` requieren backend; no consultar tablas desde frontend ni simular datos productivos.

## Seguridad y negocio

- Nunca guardar contrasena en cookies, localStorage, sessionStorage, codigo fuente, logs ni fixtures. La cookie del navegador contiene solo refresh/session opaco emitido por backend, `HttpOnly`; access token en memoria.
- Backend manda sobre permisos, alcances, saldos, estados y reglas. La UI anticipa validaciones para ayudar, pero muestra y respeta 400/401/403/404/409/500.
- No reintentar POST automaticamente. En endpoints con `Idempotency-Key` conservar la misma clave para el mismo intento logico.
- No llamar `document-sequences/next` para previsualizar; consume un numero.
- Cuadro y revision siempre cubren 12 meses y sumas coherentes. Requerimiento desde Cuadro comprueba saldo de linea y disponibilidad presupuestal antes de avanzar, sin sustituir la validacion del servidor.

## Calidad de interfaz

- Cada consulta remota: carga, vacio, exito, error y recuperacion. Cada mutacion: bloqueo mientras envia, confirmacion cuando tiene consecuencias, aviso de exito o error especifico.
- Mostrar `ProblemDetail.detail`/`details` utiles; 500 con `traceId` copiable. No exponer stack traces ni credenciales.
- Navegacion operativa, tablas legibles, formularios accesibles y responsive. Comprobar 320/768/1440 px y teclado.
- Mantener fuente de verdad de filtros/paginacion en URL cuando corresponda. Invalidar cache local tras mutaciones y cambio de compania/ejercicio.

## Entrega por ticket

- Seguir dependencias y criterios de `BACKLOG.md`. Probar backend + frontend cuando se toquen contratos; documentar comandos y resultados.
- Usar commits `feat: CODIGO - Descripcion corta` o `fix: CODIGO - Descripcion corta`, uno por ticket. El usuario hace push salvo que lo pida explicitamente.
- Respetar cambios locales ajenos. No agregar `.env`, `node_modules`, `target` ni archivos temporales al commit.
- Actualizar `ENDPOINTS.md`, `LIMITACIONES.md` y el estado del backlog cuando el codigo real cambie.

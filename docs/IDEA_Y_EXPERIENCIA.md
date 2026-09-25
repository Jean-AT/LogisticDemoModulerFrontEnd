# Idea y experiencia

## Producto

ERP operativo para una entidad con centros de costo. La pantalla inicial es el trabajo pendiente segun el perfil, no una pagina promocional. La unidad de navegacion es una tarea de negocio con su estado y su siguiente accion permitida.

## Personas y acceso

| Perfil backend | Trabajo principal | Entrada sugerida |
|---|---|---|
| SOLICITANTE | Registrar Cuadros y requerimientos, corregir observaciones, consultar saldos propios | `/inicio`, `/necesidades/planes`, `/logistica/requerimientos` |
| APROBADOR | Revisar Cuadros y requerimientos, consolidar, PIA/PIM, aprobar OC | `/inicio`, `/necesidades/revision`, `/logistica/aprobaciones` |
| COMPRAS | Cotizar, adjudicar, emitir OC, recibir y revisar inventario | `/inicio`, `/logistica/compras`, `/inventario` |
| ADMIN | Administracion y acceso a todos los flujos permitidos por backend | Todos los modulos segun roles/permisos reales |

El perfil efectivo viene de `GET /api/v1/auth/me`. La UI filtra navegacion y botones con roles, permisos y alcances; el servidor conserva la autoridad final. Cambiar de compania o ejercicio invalida consultas y limpia selecciones dependientes. Un centro fuera del alcance del usuario nunca se presenta como opcion valida.

## Mapa de navegacion

| Area | Vistas | Trabajo |
|---|---|---|
| Inicio | `/inicio` | Pendientes y resumenes existentes; accesos al siguiente paso |
| Plataforma | `/plataforma/catalogo`, `/plataforma/accesos`, `/plataforma/periodos`, `/plataforma/secuencias` | Referencias, perfil de acceso, periodos y numeracion |
| Cuadro | `/necesidades/planes`, `/necesidades/planes/nuevo`, `/necesidades/planes/:id`, `/necesidades/consolidaciones`, `/necesidades/consolidaciones/:id` | Registro, revision, transferencia, saldos y trazabilidad |
| Presupuesto | `/presupuesto/pia`, `/presupuesto/disponibilidad`, `/presupuesto/controles` | Generar/revisar/aprobar PIA, consultar PIM y controles |
| Logistica | `/logistica/requerimientos`, `/logistica/requerimientos/:id`, `/logistica/aprobaciones`, `/logistica/compras`, `/logistica/cotizaciones/:id`, `/logistica/ordenes`, `/logistica/ordenes/:id`, `/logistica/trazabilidad/:id` | Solicitud, decision, cotizacion, adjudicacion, OC y seguimiento |
| Almacen | `/logistica/ordenes/:id/recepciones`, `/logistica/recepciones/:id`, `/inventario` | Recepcion, reversion, kardex y proyeccion |
| Maestros | `/maestros/items`, `/maestros/almacenes`, `/maestros/proveedores` | Datos logisticos vigentes y altas permitidas |

La navegacion de desktop es lateral compacta; en movil se convierte en menu. Barra superior: compania, ejercicio, usuario y cierre de sesion. Tablas con filtros, paginacion server-side cuando existe y acciones por fila. Formularios largos en secciones sin tarjetas anidadas; detalles con cabecera de estado, datos, lineas e historial.

## Flujo principal

1. Admin configura periodo fiscal, secuencias y ventanas de Cuadro para compania/ejercicio. Los catalogos y maestros requeridos deben existir.
2. Solicitante crea Cuadro con linea de catalogo y doce meses, lo envia. Aprobador revisa las doce cantidades mensuales y aprueba u observa/rechaza.
3. Aprobador consolida y transfiere con clave de idempotencia. La UI muestra identificadores de transferencia, cantidad transferida y saldo por linea.
4. Aprobador genera, revisa y aprueba PIA; se crea PIM inicial. Antes de solicitar, la UI consulta disponibilidad por mes y dimension.
5. Solicitante crea requerimiento desde linea transferida, consulta saldo de Cuadro, lo envia. Aprobador decide; el backend precompromete presupuesto y bloquea por falta de saldo.
6. Compras abre cotizacion, registra ofertas, compara, cierra y adjudica; genera OC desde adjudicacion. Aprobador aprueba OC y el backend compromete.
7. Compras registra recepciones parciales o totales; puede revertir una recepcion permitida con motivo. Kardex y proyeccion reflejan el resultado.
8. Los usuarios autorizados consultan trazabilidad y exportan PDFs. El historial usa los eventos reales del backend.

El flujo directo de `POST /ordenes-compra/desde-requerimiento/{id}` y el requerimiento legacy tambien se representan, con las restricciones actuales explicadas en `LIMITACIONES.md`.

## Reglas de pantalla

- No mostrar una accion imposible por estado. Si el estado cambia entre lectura y accion, mostrar el 409 del servidor y recargar el detalle.
- Crear y editar Cuadro usa una grilla de meses 1 a 12 en cada linea. Total anual y suma mensual deben coincidir; en revision, aprobado <= revisado <= solicitado.
- Cantidad y saldo deben mostrarse junto al item al crear desde Cuadro. Disponibilidad presupuestal se muestra por dimension, mes y moneda. Nunca prometer aprobacion basada solo en el saldo visto: el backend valida al confirmar.
- Las acciones irreversibles o con efecto economico (transferir, aprobar PIA, precomprometer, comprometer, liberar, adjudicar, aprobar OC, revertir recepcion, emitir siguiente numero) requieren confirmacion con consecuencias concretas.
- Secuencias: `next` consume un numero. Solo ejecutar al confirmar la accion administrativa; jamas al cargar o previsualizar la pantalla.
- PDFs se descargan como blob autenticado, con nombre del servidor si existe; mostrar progreso y error legible si falla.
- No ofrecer filtros que el backend no soporte como si fueran globales. Los filtros locales deben indicarse como aplicados solo a resultados cargados.

## Direccion visual y accesibilidad

Interfaz institucional clara y de trabajo: fondo blanco/neutro, acento morado medido de los planes UX previos, colores semanticos para exito, advertencia y error. Tablas legibles, numeros alineados, estados con texto e icono, no solo color. Fuente de interfaz comoda y tipografia de encabezados discreta. Sin pagina hero ni superficies decorativas.

Teclado completo, foco visible, labels asociados, errores anunciados con `aria-live`, modales con retorno de foco y contraste WCAG AA. Validar 320, 768 y 1440 px; ningun texto o control debe solaparse. Formatos de dinero y fecha en espanol/Peru y zona funcional America/Lima; enviar a la API fechas y enums en su formato contractual.

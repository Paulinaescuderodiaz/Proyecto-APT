# Documentación técnica de Pethub

Actualización de alcance del 27-10-2026: plataforma web, carnet sanitario, red de donantes y sección educativa planificada. Foro y moderación retirados; notificaciones internas, sin push obligatorio. El chat/contacto, correo y módulos nuevos siguen por definir. HU18 / RF-28 identifica la sección educativa; faltan contenidos, fuentes, validación, criterios detallados y estimación.

Las versiones actualizadas se mantienen también en Drive. `Artefactos-20261007T003236Z-1-001.zip` se conserva como respaldo histórico y no representa el alcance vigente.

| Documento | Contenido y alcance |
| --- | --- |
| [Arquitectura](Pethub_Arquitectura.docx) | Arquitectura web del entorno actual: navegador Angular/Ionic, API Express, Prisma, PostgreSQL y adjuntos locales. Diferencia componentes vigentes y decisiones pendientes. |
| [Modelo de datos](Pethub_Modelo_de_Datos_.docx) | Diagrama entidad-relación y diccionario del modelo previsto de 14 tablas. Debe contrastarse con el esquema operativo de Prisma; no es una copia exacta del modelo actualmente implementado. |
| [Product Vision y Backlog](Pethub_Product_Vision_y_Backlog.docx) | Visión y objetivos web, estados revisados, historias del foro retiradas sin renumeración y HU18 educativa planificada. La ventana de Sprint 5 es tentativa y no acredita esfuerzo ni fecha comprometida. |
| [Acta de inicio](Pethub_Acta_Kickoff.docx) | Alcance inicial, acuerdos, responsabilidades y calendario del proyecto. |
| [Requisitos funcionales y no funcionales](Pethub_Requisitos_Funcionales_y_No_Funcionales.xlsx) | Requisitos alineados con web y avisos internos; RF-23 a RF-27 retirados y RF-28 educativo planificado. Las métricas requieren validación; el archivo no certifica cumplimiento. |
| [Historias de usuario](Pethub_Historias_Usuario_3.xlsx) | Criterios web, HU15–HU17 retiradas y HU18 educativa pendiente de definición detallada. |
| [Carta Gantt](Pethub_Carta_Gantt.xlsx) | Retira barras activas del foro y fechas comprometidas de chat/contacto; distingue la ventana educativa tentativa. |
| [Diagrama de clases](clases_titulo.png) | Diagrama de diseño de referencia; debe contrastarse con el modelo implementado. |

## Referencias del sistema actual

- [Arquitectura del entorno local actual](../../../docs/arquitectura-pethub.svg).
- [Esquema operativo de Prisma](../Evidencias%20de%20sistema/Aplicaci%C3%B3n/backend/prisma/schema.prisma).
- [README del proyecto](../../../README.md).

En el entorno local documentado, el frontend se inicia por separado; la API y PostgreSQL se levantan con Docker Compose y los adjuntos se guardan en `backend/uploads`. Las notificaciones se consultan dentro de la aplicación. Push y almacenamiento externo no son componentes exigidos en esta entrega; chat/contacto permanece pendiente.

El acta de inicio y los documentos de Fase 1 conservan el alcance histórico. El modelo de datos y el diagrama de clases todavía requieren contrastarse y actualizarse respecto de Prisma; esta revisión de alcance no los acredita como modelos actuales.

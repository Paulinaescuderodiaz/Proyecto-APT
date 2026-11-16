# Documentación técnica de Pethub

Estado de implementación revisado el 16-11-2026, con base en los cambios integrados hasta el PR 14: plataforma web, carnet sanitario, red de donantes y sección educativa planificada. Foro y moderación retirados; notificaciones internas, sin push obligatorio. El contacto y la mensajería web entre tutores están implementados, con conversaciones guardadas y actualización manual; correo y módulos nuevos siguen por definir. HU18 / RF-28 identifica la sección educativa; faltan contenidos, fuentes, validación, criterios detallados y estimación.

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

En el entorno local documentado, el frontend se inicia por separado; la API y PostgreSQL se levantan con Docker Compose y los adjuntos se guardan en `backend/uploads`. Las notificaciones se consultan dentro de la aplicación. Push y almacenamiento externo no son componentes exigidos en esta entrega. El contacto desde la búsqueda de donantes abre una conversación con aviso de evaluación veterinaria obligatoria; la mensajería se actualiza manualmente.

El acta de inicio y los documentos de Fase 1 conservan el alcance histórico. El modelo de datos y el diagrama de clases todavía requieren contrastarse y actualizarse respecto de Prisma; esta revisión de alcance no los acredita como modelos actuales.

La descripción de cada documento corresponde a su versión conservada. Los documentos anteriores a la integración del chat requieren actualizar su contenido para reflejar el estado actual; este índice no modifica esos archivos. Las cifras de la última validación automatizada están en el [índice de evidencias grupales](../../Evidencias%20Grupales/README.md#validaci%C3%B3n-automatizada-m%C3%A1s-reciente).

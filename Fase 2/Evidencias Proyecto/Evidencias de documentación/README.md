# Documentación técnica de Pethub

Los documentos de diseño se presentan por separado para su revisión. Son las copias originales disponibles en Drive y coinciden byte por byte con las incluidas en `Artefactos-20261007T003236Z-1-001.zip`. Se conserva el ZIP como respaldo histórico.

| Documento | Contenido y alcance |
| --- | --- |
| [Arquitectura](Pethub_Arquitectura.docx) | Diseño previsto de la solución. Incluye componentes futuros como Socket.io, Firebase Cloud Messaging y almacenamiento S3/R2; no acredita que estén implementados. |
| [Modelo de datos](Pethub_Modelo_de_Datos_.docx) | Diagrama entidad-relación y diccionario del modelo previsto de 14 tablas. Debe contrastarse con el esquema operativo de Prisma; no es una copia exacta del modelo actualmente implementado. |
| [Product Vision y Backlog](Pethub_Product_Vision_y_Backlog.docx) | Visión, límites e historias planificadas. Los estados corresponden a la versión original y requieren actualización para reflejar el avance posterior. |
| [Acta de inicio](Pethub_Acta_Kickoff.docx) | Alcance inicial, acuerdos, responsabilidades y calendario del proyecto. |
| [Requisitos funcionales y no funcionales](Pethub_Requisitos_Funcionales_y_No_Funcionales.xlsx) | Especificación del sistema esperado y criterios de verificación. Las métricas propuestas requieren validación; el archivo no certifica su cumplimiento. |
| [Diagrama de clases](clases_titulo.png) | Diagrama de diseño de referencia; debe contrastarse con el modelo implementado. |

## Referencias del sistema actual

- [Arquitectura del entorno local actual](../../../docs/arquitectura-pethub.svg).
- [Esquema operativo de Prisma](../Evidencias%20de%20sistema/Aplicaci%C3%B3n/backend/prisma/schema.prisma).
- [README del proyecto](../../../README.md).

En el entorno local documentado, el frontend se inicia por separado; la API y PostgreSQL se levantan con Docker Compose y los adjuntos se guardan en `backend/uploads`. Las notificaciones se consultan dentro de la aplicación. Las menciones a push, chat y almacenamiento externo en los diseños originales describen el alcance previsto.

La disponibilidad de estos archivos por separado resuelve su ubicación en el repositorio; actualizar su contenido para alinearlo con el avance actual sigue siendo una tarea de documentación.

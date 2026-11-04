# Validación técnica del Sprint 4

El workflow `Validación Pethub` ejecuta dos comprobaciones independientes al subir cambios a una rama. También comprueba las propuestas dirigidas a `main`.

| Comprobación | Qué ejecuta | Qué permite verificar |
| --- | --- | --- |
| Frontend | Instalación con `npm ci`, pruebas sin modo observación y compilación de producción | Comportamiento de componentes y servicios con HTTP simulado; límites de compilación |
| Backend | PostgreSQL 16 temporal, cliente Prisma, migraciones existentes y todas las pruebas Jest/Supertest | Respuestas de la API y persistencia real en la base de pruebas |

El entorno utiliza Node.js 26, compatible con el requisito de Angular declarado en las dependencias del proyecto. Las credenciales `pethub_ci` y el secreto JWT del workflow son exclusivos del entorno de pruebas. No se carga el `.env` de las integrantes ni se conecta con su base local.

## Evidencia del Sprint 4 que comprueban las pruebas existentes

- `notificacion.test.js`: solicitud compatible y destinatario correcto; consulta y lectura de notificaciones.
- `conversacion.test.js`: contacto entre usuarios, recuperación de conversación, mensajes, rechazo de acceso ajeno y de contacto propio.
- `aviso.test.js`: aviso veterinario al inscribir, contactar, reabrir una conversación y consultar la ficha de un donante; rechazo del campo de aptitud médica.

Los casos anteriores se consideran aprobados únicamente cuando su ejecución finaliza correctamente. Tener el workflow configurado no es evidencia de ejecución satisfactoria.

## Consultar resultados

1. Entrar a **Actions** del repositorio y abrir `Validación Pethub`.
2. Elegir la ejecución del commit que se está revisando; una ejecución de otro commit no valida el cambio actual.
3. Abrir cada comprobación y revisar el paso fallido o el resumen de las pruebas aprobadas.
4. Conservar el enlace de la ejecución y el SHA como evidencia académica.

## Comprobación que continúa siendo manual

Las pruebas del frontend usan respuestas HTTP simuladas. Las pruebas del backend llaman a Express y PostgreSQL; no abren el navegador. Por eso todavía hay que comprobar el Angular real con dos sesiones distintas: buscar donante, contactar, enviar/responder mensajes, actualizar, recargar y verificar el aviso veterinario.

Los pasos están en el [README de Aplicación](../Fase%202/Evidencias%20Proyecto/Evidencias%20de%20sistema/Aplicaci%C3%B3n/README.md#preparar-y-comprobar-el-contacto-web-del-sprint-4).

No se declara cerrada una historia completa por aprobar solo una de sus capas. La mensajería implementada se actualiza manualmente.

Configuración del servicio PostgreSQL basada en la [documentación oficial de GitHub Actions](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers).

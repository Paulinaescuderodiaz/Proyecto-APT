# Pethub — Proyecto APT

Repositorio organizado por fases y tipos de evidencia.

| Fase | Carpetas |
| --- | --- |
| [Fase 1](Fase%201/) | Evidencias Individuales; Evidencias Grupales |
| [Fase 2](Fase%202/) | Evidencias Individuales; Evidencias Grupales; Evidencias Proyecto |
| [Fase 3](Fase%203/) | Evidencias Individuales; Evidencias Grupales |

## Aplicación

El código está en [Fase 2 / Evidencias Proyecto / Evidencias de sistema / Aplicación](Fase%202/Evidencias%20Proyecto/Evidencias%20de%20sistema/Aplicaci%C3%B3n/).

Desde la raíz del repositorio, en PowerShell:

```powershell
cd "Fase 2/Evidencias Proyecto/Evidencias de sistema/Aplicación"
```

Consultar el README de Aplicación para instalar dependencias e iniciar frontend, backend o Docker. Los comandos se ejecutan dentro de frontend o backend, como antes.

## Actualizar una copia existente

Después de sincronizar el repositorio, el código estará en la nueva ubicación. Git no mueve archivos locales ignorados: si ya tienes backend/.env o backend/uploads, cópialos a la nueva carpeta Aplicación/backend antes de iniciar el servidor. Reinstala las dependencias en las nuevas carpetas cuando sea necesario.

Si usabas Docker, conserva el nombre del proyecto Compose anterior al iniciar desde la nueva ruta para reutilizar su volumen de PostgreSQL. Puedes identificarlo con docker compose ls y usar docker compose -p NOMBRE_ANTERIOR up --build. No elimines volúmenes para hacer esta reorganización.

## Evidencias y pendientes

Los archivos existentes se conservaron con su contenido original. Los ZIP de artefactos y diarios se mantienen completos; todavía deben extraerse y clasificarse sus documentos individuales. Los README de cada carpeta enumeran los entregables pendientes según la estructura solicitada; no sustituyen archivos Word o PowerPoint.

La carpeta Base de datos contiene una copia de evidencia del esquema y las migraciones. La versión operativa permanece en Aplicación/backend/prisma.

Esta reorganización no certifica la aprobación de las evidencias ni una nueva ejecución de pruebas.

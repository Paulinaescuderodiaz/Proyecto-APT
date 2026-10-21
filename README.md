# Pethub

## 1. Descripción del proyecto

Pethub es una aplicación web dirigida a tutores de mascotas para organizar su información sanitaria y facilitar la búsqueda de donantes voluntarios de sangre animal. Busca reducir la dispersión de vacunas, diagnósticos y documentos veterinarios, y apoyar la búsqueda de un donante cuando existe una solicitud de sangre.

Incorpora registro e inicio de sesión, gestión de mascotas, vacunas, historial médico, documentos veterinarios, recordatorios dentro de la aplicación, inscripción de donantes, publicación y cierre de solicitudes de sangre y búsqueda por especie y grupo sanguíneo, con prioridad por comuna cuando se indica.

Es un proyecto académico en desarrollo. La búsqueda relaciona datos registrados; la compatibilidad y la aptitud para donar deben confirmarse con un equipo veterinario. El acceso de clínicas, la integración con sus sistemas y el contenido educativo forman parte del alcance por definir.

## 2. Tecnologías utilizadas

- **Lenguajes:** TypeScript, JavaScript, HTML, SCSS y SQL.
- **Frameworks:** Angular 22 e Ionic 9 en el frontend; Node.js y Express 5 en el backend.
- **Base de datos:** PostgreSQL y Prisma ORM 5.22, con migraciones versionadas.
- **Cloud / Infraestructura:** Docker y Docker Compose para la API y PostgreSQL localmente. No se documenta un despliegue productivo en la nube.
- **Autenticación:** JWT y bcryptjs.
- **Pruebas:** Vitest y HttpTestingController en frontend; Jest y Supertest en backend.
- **Control de versiones:** Git y GitHub.

## 3. Instrucciones para ejecutar el proyecto localmente

### Requisitos

Git, Docker Desktop en ejecución con Docker Compose, y Node.js con npm. Para el frontend, utiliza Node.js 24.15 o superior dentro de la versión 24, o Node.js 22 desde la versión 22.22.3, según las dependencias de Angular.

Los comandos siguientes están escritos para **PowerShell en Windows**. En Linux o macOS, utiliza `npm` en lugar de `npm.cmd` y `cp` en lugar de `Copy-Item`.

### Clonar y configurar el backend

```powershell
git clone https://github.com/Paulinaescuderodiaz/Proyecto-APT.git
cd "Proyecto-APT/Fase 2/Evidencias Proyecto/Evidencias de sistema/Aplicación/backend"
Copy-Item .env.example .env
```

Edita `backend/.env` y define `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` y `JWT_SECRET` con valores de desarrollo propios. No publiques `.env`. Docker Compose construye `DATABASE_URL` con las variables de PostgreSQL; el valor de ejemplo de `DATABASE_URL` corresponde a ejecutar la API fuera de Docker.

```powershell
docker compose up --build
```

Este comando inicia **la API y PostgreSQL**. El cliente Prisma se genera durante la construcción y las migraciones se aplican al iniciar. La API queda disponible en **http://localhost:3000**. Mantén esta terminal abierta. PostgreSQL utiliza la red interna de Compose y no publica un puerto en el equipo.

### Iniciar el frontend

Abre otra terminal en la raíz del repositorio:

```powershell
cd "Fase 2/Evidencias Proyecto/Evidencias de sistema/Aplicación/frontend"
npm.cmd ci
npm.cmd start -- --port 4200
```

Abre **http://localhost:4200**. El frontend consulta la API en `http://localhost:3000/api`.

**Cuenta de prueba:** no se incluye una cuenta compartida ni una carga inicial de usuarios. Crea una cuenta desde `/registro` e inicia sesión en `/login`. Para probar la búsqueda con resultados, registra una mascota como donante e indica su grupo sanguíneo.

| Dirección | Acceso después de iniciar sesión |
| --- | --- |
| `/home` | Inicio de la cuenta |
| `/mascotas` | Mascotas, carnet sanitario e inscripción como donante |
| `/solicitudes-sangre` | Publicación y gestión de solicitudes propias |
| `/buscar-donantes` | Búsqueda de donantes |
| `/notificaciones` | Avisos de solicitudes coincidentes y marcado como leídos |
| `/perfil` | Datos de la cuenta y cierre de sesión |

Inicio ofrece accesos a solicitudes, inscripción y búsqueda de donantes. La campana abre las notificaciones, donde puedes consultar todos los avisos, filtrar los no leídos y marcarlos como leídos. Los mensajes y la comunidad todavía muestran “Próximamente”.

### Pruebas y apagado

Desde `frontend`:

```powershell
npm.cmd test -- --watch=false
```

Las pruebas del backend se ejecutan con `npm.cmd test` desde `backend`, después de instalar sus dependencias. Requieren `DATABASE_URL` y `JWT_SECRET` para una base exclusiva de pruebas con las migraciones aplicadas: crean y eliminan registros. Compose no expone PostgreSQL al host; una URL `localhost:5432` no apunta automáticamente a ese contenedor.

Para detener el frontend, presiona `Ctrl + C` en su terminal. Para detener la API y PostgreSQL, ejecuta desde `backend`:

```powershell
docker compose down
```

Este comando conserva el volumen de datos. Si utilizabas Docker antes de la reorganización del repositorio, conserva el nombre del proyecto Compose anterior para reutilizar su volumen.

## 4. Integrantes del equipo y roles

| Integrante | Rol |
| --- | --- |
| Escudero Díaz, Paulina Andrea | Desarrollo frontend, interfaz, validaciones y pruebas del frontend. |
| Barrera Guevara, Evelyn | Desarrollo backend, API, base de datos, migraciones y pruebas del backend. |

Ambas integrantes participan en la integración, documentación, planificación y revisión de las historias de usuario.

## 5. Metodología de trabajo

El equipo utiliza **Scrum adaptado a dos integrantes**, con sprints de dos semanas. El trabajo se organiza mediante historias de usuario y criterios de aceptación, Product Backlog, Sprint Backlog y un tablero de avance.

Se realizan planificación del sprint, reuniones de seguimiento, revisión del incremento y retrospectiva. Los registros Scrum, la Carta Gantt y las evidencias de pruebas se mantienen en los documentos del proyecto. GitHub permite versionar el código y revisar los cambios; las funcionalidades se desarrollan en ramas y se integran a `main` tras su revisión y verificación.

## 6. Arquitectura de la solución

La solución utiliza una arquitectura cliente-servidor. El navegador ejecuta el frontend Angular/Ionic, que envía solicitudes HTTP a la API REST de Express. El backend valida los datos y el token JWT, aplica las reglas de negocio y utiliza Prisma para consultar PostgreSQL. Los documentos adjuntos se almacenan en `backend/uploads`, montado como carpeta persistente en Docker.

| Capa | Responsabilidad | Ubicación |
| --- | --- | --- |
| Presentación | Pantallas, formularios, navegación y consumo de la API. | `frontend/src/app/` |
| Aplicación | Rutas HTTP, autenticación, controladores y reglas de negocio. | `backend/src/` |
| Datos | Modelo relacional y migraciones mediante Prisma y PostgreSQL. | `backend/prisma/` |

Estas rutas parten de `Fase 2/Evidencias Proyecto/Evidencias de sistema/Aplicación/`. La copia del esquema en `Base de datos/` es una evidencia académica; el esquema operativo está en `Aplicación/backend/prisma/`.

El portafolio se organiza en [Fase 1](Fase%201/), [Fase 2](Fase%202/) y [Fase 3](Fase%203/), con evidencias individuales y grupales. La Fase 2 también contiene las evidencias de documentación y sistema. El informe y sus anexos están identificados en el [índice de evidencias grupales](Fase%202/Evidencias%20Grupales/README.md).

---

### Sección de innovación (documento de cierre)

- **¿Qué problema resuelve?** La dispersión del historial sanitario de las mascotas y la dificultad de encontrar rápidamente posibles donantes de sangre animal.
- **¿Qué hace diferente a la solución?** Reúne el carnet sanitario y una red de donantes en una misma aplicación, con solicitudes por nivel de urgencia y búsqueda por especie, grupo sanguíneo y comuna. Esta combinación es la propuesta del proyecto; no implica exclusividad en el mercado.
- **¿Qué valor agrega?** Facilita al tutor la consulta de los antecedentes de su mascota y la identificación de posibles donantes, sin publicar los datos de contacto del dueño en los resultados de búsqueda. La evaluación clínica permanece a cargo del equipo veterinario.

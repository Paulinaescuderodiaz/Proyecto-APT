# Pethub — Proyecto APT

Aplicación para organizar el cuidado de mascotas y desarrollar una comunidad de apoyo a la donación de sangre animal. Proyecto académico en desarrollo.

## Equipo

- **Paulina Escudero:** frontend.
- **Evelyn:** backend.

## Estado actual

Revisión documental: **16 de noviembre de 2026**. Las funciones descritas están integradas en `main`; los pendientes se distinguen a continuación.

### Disponible en la aplicación

- Registro en dos pasos: nombre y correo; contraseña, confirmación, teléfono opcional y comuna.
- Avisos de registro e inicio de sesión. Si el backend rechaza un correo duplicado al enviar el registro, la vista vuelve al primer paso para corregirlo. Todavía no hay una consulta anticipada de disponibilidad del correo.
- Inicio de sesión con JWT y navegación a `/home`.
- Inicio con saludo, listado de mascotas del usuario y alternativa visual cuando no hay foto.
- Creación, listado, detalle y edición de mascotas, con foto, fecha de nacimiento y sexo opcionales. La fecha de nacimiento no puede ser futura.
- Navegación entre Inicio y Mis mascotas.
- Perfil propio con nombre, correo, teléfono y comuna. Permite editar nombre, teléfono y comuna; el correo es de solo lectura. El cierre de sesión elimina la sesión del navegador.
- Comentarios en español en el código para facilitar la revisión del equipo.

### Módulos incorporados después de la primera versión

- Rutas de cuenta protegidas mediante `authGuard`; el backend valida el JWT en las consultas.
- Carnet con vacunas, historial médico, documentos y recordatorios de vacunas. Las vacunas admiten notas de hasta 500 caracteres y edición del estado del refuerzo; la tarjeta distingue refuerzo aplicado, pendiente o sin refuerzo programado.
- Consultas médicas con veterinario, motivo y recomendaciones opcionales, pantalla de detalle y documentos adjuntos. El nombre del veterinario es texto ingresado por el tutor; no acredita autoría profesional.
- Inscripción voluntaria de donantes desde la ficha de mascota, búsqueda y solicitudes de sangre.
- Notificaciones internas de solicitudes de sangre, filtros por tipo y lectura y marcado como leídas. El tipo de API para vacunas es `recordatorio_vacuna`. Los recordatorios del inicio se consultan por separado de la campana; su presencia no implica una notificación de ese tipo.
- Contacto y conversaciones entre tutores integrados en `main`, con envío, conservación y actualización manual de mensajes. El aviso de evaluación veterinaria presencial permanece visible al abrir una conversación. No se implementa mensajería en tiempo real.

### Pendientes y límites de esta versión

- Confirmar visualmente en el equipo local las etiquetas del estado del refuerzo incorporadas en el PR 14; sus escenarios ya tienen pruebas automatizadas.
- Consolidar la evaluación de usabilidad y las capturas finales. Las pruebas automatizadas no sustituyen esa evaluación.
- Definir el contenido y la validación de la sección educativa. Foro y moderación están fuera del alcance web acordado.
- Desarrollar la ficha con pestañas y microchip, desparasitación y procedimientos si se mantienen en el alcance acordado. No se presentan como implementados.
- Agenda, citas, perfil veterinario e integración con clínicas dependen de la definición académica. El filtro «Citas» no acredita una agenda implementada; correo de confirmación y push real son ampliaciones futuras.
- La búsqueda utiliza datos registrados y no certifica compatibilidad ni aptitud para donar: esa evaluación corresponde al equipo veterinario.

## Tecnologías

| Capa | Tecnologías declaradas |
| --- | --- |
| Frontend | Angular 22, Ionic 9, TypeScript, RxJS, SCSS e Ionicons |
| Backend | Node.js, Express 5, JWT, bcryptjs, dotenv, CORS y Multer |
| Datos | PostgreSQL y Prisma 5.22 |
| Pruebas | Jest y Supertest en backend; Angular y Vitest en frontend |
| Plataforma | Configuración de Capacitor 8 incluida; las instrucciones siguientes ejecutan la versión web local |

El frontend consulta la API HTTP del backend. El backend utiliza Prisma para acceder a PostgreSQL. Las solicitudes de mascotas incluyen el token de sesión.

## Organización de la aplicación

| Ruta | Contenido |
| --- | --- |
| `frontend/src/app/home/` | Pantalla de inicio |
| `frontend/src/app/pages/` | Bienvenida, login, registro, mascotas, perfil, notificaciones y conversaciones |
| `frontend/src/app/services/` | Comunicación con la API de cuenta, mascotas, carnet, documentos, donantes, solicitudes, notificaciones y conversaciones |
| `frontend/src/app/app.routes.ts` | Rutas de navegación |
| `backend/index.js` | Inicio del servidor en el puerto 3000 |
| `backend/src/app.js` | Configuración de Express y montaje de rutas |
| `backend/src/controllers/` | Lógica de los endpoints |
| `backend/src/routes/` | Rutas de la API |
| `backend/src/middleware/` | Verificación del token |
| `backend/prisma/` | Modelo de datos y migraciones |
| `backend/tests/` | Pruebas de los módulos de la API, incluidas conversaciones y aviso veterinario |

Modelos de datos: **Usuario, Mascota, Vacuna, RegistroMedico, Documento, Recordatorio, Donante, SolicitudSangre, Notificacion, Conversacion y Mensaje**.

## Preparación local

Necesitas Git, Node.js y npm compatibles con las dependencias del proyecto, y una instancia de PostgreSQL accesible. Comprueba las versiones instaladas con `node --version` y `npm --version`.

Los comandos siguientes están escritos para **PowerShell en Windows**. En otros sistemas utiliza `npm` y `npx` en lugar de `npm.cmd` y `npx.cmd`.

### 1. Obtener el proyecto

```powershell
git clone https://github.com/Paulinaescuderodiaz/Proyecto-APT.git
cd "Proyecto-APT/Fase 2/Evidencias Proyecto/Evidencias de sistema/Aplicación"
```

Si ya tienes una copia, trabaja desde esa carpeta; no necesitas clonarla nuevamente.

### 2. Configurar el backend

Desde la carpeta Aplicación:

```powershell
cd backend
npm.cmd install
```

Crea una base de datos PostgreSQL para desarrollo y el archivo **`backend/.env`** con estos valores de ejemplo:

```dotenv
DATABASE_URL="postgresql://USUARIO:CONTRASENA@localhost:5432/pethub?schema=public"
JWT_SECRET="REEMPLAZAR_POR_UN_SECRETO_ALEATORIO"
```

Sustituye usuario, contraseña, host y nombre de base de datos por los de tu entorno. Para generar un secreto:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado como valor de `JWT_SECRET`. No subas el archivo `.env` ni credenciales al repositorio.

Aplica las migraciones existentes y genera el cliente de Prisma:

```powershell
npx.cmd prisma migrate deploy
npx.cmd prisma generate
```

Para usar la carga de documentos, crea su carpeta de destino desde `backend`:

```powershell
New-Item -ItemType Directory -Force -Path uploads
```

### 3. Iniciar el backend

Desde `backend`:

```powershell
npm.cmd start
```

El servidor usa **http://localhost:3000**. Al abrir esa dirección debe responder:

```json
{"mensaje":"Pethub backend funcionando"}
```

Mantén esta terminal abierta.

### 4. Iniciar el frontend

Abre otra terminal en la carpeta `Aplicación`:

```powershell
cd frontend
npm.cmd install
npm.cmd start -- --port 4200
```

Abre **http://localhost:4200**. La raíz muestra la bienvenida; después de iniciar sesión se abre `/home`.

Si ya tienes Ionic CLI instalado, también puedes iniciar el frontend desde su carpeta con `ionic.cmd serve`.

Las direcciones de la API están definidas en los archivos `frontend/src/app/services/*.service.ts` como `http://localhost:3000/api/...`. Si cambias el host o el puerto del backend, revisa todos los servicios que llaman a la API. En un teléfono, `localhost` apunta al propio teléfono, no al computador.

## Rutas de la aplicación

| Ruta | Pantalla |
| --- | --- |
| `/bienvenida` | Presentación y accesos |
| `/registro` | Creación de cuenta |
| `/login` | Inicio de sesión |
| `/home` | Inicio y resumen de mascotas |
| `/mascotas` | Listado, formulario y detalle |
| `/perfil` | Consulta y edición del perfil propio y cierre de sesión |
| `/solicitudes-sangre` | Publicación y gestión de solicitudes |
| `/buscar-donantes` | Búsqueda y contacto con el tutor |
| `/notificaciones` | Avisos internos de solicitudes |
| `/conversaciones` | Lista de conversaciones propias, integrada en `main` |
| `/conversaciones/:id` | Mensajes propios con actualización manual y aviso veterinario |

## API principal

Base local: `http://localhost:3000`.

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/` | Comprobar que el servidor responde |
| POST | `/api/auth/registro` | Crear una cuenta |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/perfil` | Consultar el perfil propio |
| PUT | `/api/auth/perfil` | Editar nombre, teléfono y comuna del perfil propio |
| GET | `/api/mascotas` | Listar mascotas del usuario |
| POST | `/api/mascotas` | Crear una mascota |
| PUT | `/api/mascotas/:id` | Actualizar una mascota |
| POST | `/api/vacunas` | Crear una vacuna |
| GET | `/api/vacunas/mascota/:mascotaId` | Consultar vacunas |
| PUT | `/api/vacunas/:id` | Actualizar una vacuna |
| POST | `/api/registros-medicos` | Crear un registro médico |
| GET | `/api/registros-medicos/mascota/:mascotaId` | Consultar historial |
| GET | `/api/registros-medicos/:id` | Consultar el detalle de una consulta propia y sus documentos |
| POST | `/api/documentos` | Subir un documento |
| GET | `/api/documentos/registro/:registroMedicoId` | Listar adjuntos de un registro propio |
| GET | `/api/documentos/:id/archivo` | Abrir un archivo propio |
| GET | `/api/documentos/:id/archivo?descargar=1` | Descargar conservando el nombre original |

Las rutas de mascotas, vacunas, registros médicos y documentos requieren la cabecera `Authorization: Bearer <token>`. La carga de documentos utiliza `multipart/form-data`, con los campos `archivo` y `registroMedicoId`.

Los archivos de `uploads` se entregan únicamente por las rutas autenticadas de documentos, que verifican la pertenencia de la mascota. La antigua ruta pública `/uploads` devuelve 404. Los archivos ya existentes se conservan y no se necesitan nuevas migraciones.

### Consultar exámenes desde el historial

1. Inicia sesión y abre **Mascotas → Ver ficha → Historial médico**.
2. Crea o abre un registro médico y adjunta un PDF, JPG o PNG de hasta 5 MB.
3. En **Archivos adjuntos** deben aparecer su nombre, tipo y tamaño. Recarga para comprobar que permanece en la lista.
4. Pulsa **Ver** para abrir la vista previa; ciérrala con **Cerrar vista** o Escape. Si el navegador no muestra el PDF, utiliza **Descargar**.
5. Pulsa **Descargar** y comprueba el nombre y el contenido del archivo guardado.
6. Otra cuenta no debe poder consultar el listado ni abrir o descargar esos archivos.

La prueba automatizada de Chrome está en `.github/tests/documentos.mjs` y se ejecuta con el workflow **Documentos — recorrido de navegador**. Usa exclusivamente datos ficticios y PostgreSQL efímero.

## Sesión

El login guarda `pethub_token` y `pethub_usuario` en el almacenamiento local del navegador. Cerrar sesión elimina ambos valores, pero no elimina la cuenta ni sus mascotas. La presencia del token en el frontend no garantiza su validez: el backend verifica las solicitudes protegidas.

## Preparar y comprobar el contacto web del Sprint 4

El contacto web está integrado en `main`. Usa una copia actualizada de esa rama. Desde la raíz del repositorio entra a la carpeta correcta:

```powershell
cd "Fase 2/Evidencias Proyecto/Evidencias de sistema/Aplicación/backend"
```

Si el backend está ejecutándose, detén **su terminal** con `Ctrl+C` antes de regenerar Prisma. Ejecuta estos comandos uno a uno y continúa solo si cada uno termina correctamente:

```powershell
npx.cmd prisma migrate deploy
npx.cmd prisma generate
npx.cmd prisma migrate status
npm.cmd start
```

`migrate deploy` aplica las migraciones existentes. No uses `migrate reset` para resolver este problema: elimina datos. El estado debe indicar que no quedan migraciones pendientes, incluida `20261027234909_agregar_chat`.

Si `prisma generate` falla con `EPERM` al renombrar `query_engine-windows.dll.node`, algún proceso o protección del sistema puede estar usando el archivo. Comprueba que detuviste el backend de este proyecto y vuelve a generar. No cierres indiscriminadamente todos los procesos Node ni ejecutes comandos que borren la base.

Con el frontend abierto en `http://localhost:4200`, comprueba:

1. Cuenta A: inscribir una mascota donante con grupo conocido. Esto es inscripción voluntaria; no certifica aptitud médica.
2. Cuenta B, en otro perfil del navegador o incógnito: iniciar sesión, buscar ese donante y pulsar **Contactar al tutor**. No uses la misma cuenta dueña de la mascota.
3. Confirmar que se abre la conversación y se muestra el aviso veterinario presencial.
4. Enviar un mensaje desde B. Desde A, abrir **Mis conversaciones**, entrar al mismo contacto y pulsar **Actualizar mensajes** para verlo.
5. Responder desde A y actualizar desde B. Recargar y volver a contactar: debe recuperarse la misma conversación y conservar los mensajes y el aviso.
6. Una tercera cuenta no debe poder leer ni escribir en esa conversación. Debe mostrarse el rechazo de acceso.

El recorrido anterior permite reproducir y revisar el contacto entre cuentas en cada entorno local. No es una lista de pendientes de integración: el contacto ya está en `main`. La validación automatizada se referencia en la sección siguiente; documentar estos pasos no certifica que se hayan ejecutado en otro computador. La actualización de mensajes es manual.

Si aparece un error, abre DevTools → **Network**, selecciona la petición `conversaciones` que falla y revisa **Response**. Guarda el estado HTTP y el mensaje, sin compartir tokens. Un `204` de tipo `preflight` es la comprobación CORS, no el resultado del contacto. Un `400` puede indicar que se intenta contactar a la propia cuenta; un `500` requiere revisar el detalle de la terminal que mantiene el backend iniciado.

## Pruebas y compilación

Desde `backend`:

```powershell
npm.cmd test
```

Las pruebas del backend utilizan PostgreSQL y crean/eliminan datos de prueba. Configura `DATABASE_URL` hacia una base exclusiva de pruebas con las migraciones aplicadas y define `JWT_SECRET` antes de ejecutarlas.

Desde `frontend`:

```powershell
npm.cmd test
npm.cmd run build
```

Estos comandos corresponden a los scripts existentes. La ejecución de [Validación Pethub del 16 de noviembre de 2026](https://github.com/Paulinaescuderodiaz/Proyecto-APT/actions/runs/43895397021), sobre el commit `70360886172a1c70126452a0487c20abce5606a1`, aprobó **119 pruebas del frontend en 17 archivos** y **154 pruebas del backend en 17 suites**: **273 pruebas en total**. La compilación de producción del frontend también fue aprobada. Estas cifras corresponden a esa ejecución; esta corrección documental no constituye una nueva ejecución ni una evaluación de usabilidad o validación clínica.

Comprobación manual del flujo principal:

1. Crear una cuenta e iniciar sesión.
2. Probar credenciales incorrectas y comprobar el aviso.
3. Agregar una mascota y verificar que aparece en Inicio después de recargar.
4. Editar sus datos y comprobar que se conservan.
5. Abrir Perfil, editar nombre, teléfono o comuna y comprobar su conservación tras recargar. El correo permanece de solo lectura. Cerrar sesión.

## Problemas frecuentes

| Síntoma | Qué revisar |
| --- | --- |
| No conecta con la API | Mantener el backend iniciado y comprobar el puerto 3000 |
| `MODULE_NOT_FOUND` al buscar `Proyecto-APT/index.js` | Se ejecutó desde la raíz: entrar a la carpeta `backend` antes de `npm.cmd start` |
| Otro `MODULE_NOT_FOUND` de una dependencia | Ejecutar `npm.cmd install` dentro de `backend` |
| Docker no se reconoce | Usar la preparación local con PostgreSQL y `npm.cmd start` descrita arriba; Docker es una alternativa |
| Contactar devuelve `400` | Revisar Response; si es contacto propio, probar con otra cuenta |
| Contactar devuelve `500` | Revisar el error del backend y el estado de las migraciones, especialmente `agregar_chat` |
| Prisma devuelve `EPERM` sobre la DLL | Detener el backend del proyecto antes de regenerar el cliente |
| `secretOrPrivateKey must have a value` | Definir `JWT_SECRET` en `backend/.env` y reiniciar el backend |
| Error de conexión de Prisma | Revisar PostgreSQL, `DATABASE_URL` y migraciones |
| Registro responde 409 | El correo ya está registrado; iniciar sesión o usar otro |
| Login responde 401 | Revisar correo y contraseña |
| Error CORS | Confirmar que el proceso del puerto 3000 corresponde al backend actualizado y reiniciarlo |
| No se puede cargar un documento | Comprobar que existe `backend/uploads`, el formato y el máximo de 5 MB |


## Alternativa: ejecutar el backend con Docker

Requisitos: tener Docker Desktop instalado y abierto.

1. Entrar a la carpeta del backend:

```
cd backend
```

2. Crear el archivo `.env` copiando el ejemplo y reemplazando los valores:

```
copy .env.example .env
```

3. Levantar la API y la base de datos:

```
docker compose up --build
```

La API queda disponible en `http://localhost:3000`. Las migraciones de Prisma se aplican solas al iniciar.

4. Para apagar todo:

```
docker compose down
```

## Documentación académica

- [Informe del proyecto](../../Evidencias%20de%20documentaci%C3%B3n/Informe_APT_Pethub_Completo_final.pdf)
- [Carta Gantt](../../Evidencias%20de%20documentaci%C3%B3n/Pethub_Carta_Gantt.xlsx)
- [Historias de usuario](../../Evidencias%20de%20documentaci%C3%B3n/Pethub_Historias_Usuario_3.xlsx)
- [Plantillas del Sprint 1](../../Evidencias%20de%20documentaci%C3%B3n/Pethub_Plantillas_Sprint1_Completado.xlsx)

# Pethub — Proyecto APT

Aplicación para organizar el cuidado de mascotas y desarrollar una comunidad de apoyo a la donación de sangre animal. Proyecto académico en desarrollo.

## Equipo

- **Paulina Escudero:** frontend.
- **Evelyn:** backend.

## Estado actual

### Disponible en la aplicación

- Registro en dos pasos: nombre y correo; contraseña, confirmación y comuna.
- Avisos de registro e inicio de sesión. Si el backend rechaza un correo duplicado al enviar el registro, la vista vuelve al primer paso para corregirlo. Todavía no hay una consulta anticipada de disponibilidad del correo.
- Inicio de sesión con JWT y navegación a `/home`.
- Inicio con saludo, listado de mascotas del usuario y alternativa visual cuando no hay foto.
- Creación, listado, detalle y edición de mascotas, con foto opcional.
- Navegación entre Inicio y Mis mascotas.
- Perfil de solo lectura con nombre y correo, y cierre de sesión en el navegador.
- Comentarios en español en el código para facilitar la revisión del equipo.

### Implementado en el backend, pendiente de integrar en pantallas

- Registro, listado y actualización de vacunas.
- Creación y consulta de registros médicos.
- Carga de documentos JPEG, PNG o PDF asociados a un registro médico, hasta 5 MB.

### Pendiente

- Protección de rutas del frontend mediante guards de sesión. El perfil comprueba la presencia del token, pero las rutas aún no tienen guards.
- Solicitudes de donación, inscripción de donantes, comunidad, mensajes y notificaciones. Los accesos correspondientes del inicio se muestran como próximos o deshabilitados.
- Edición del perfil.
- Unificar la ayuda de la foto de mascota: el formulario anuncia 10 MB, mientras la validación del frontend permite 5 MB.
- Completar la integración y las pruebas de los módulos pendientes.

## Tecnologías

| Capa | Tecnologías declaradas |
| --- | --- |
| Frontend | Angular 22, Ionic 9, TypeScript, RxJS, SCSS e Ionicons |
| Backend | Node.js, Express 5, JWT, bcryptjs, dotenv, CORS y Multer |
| Datos | PostgreSQL y Prisma 5.22 |
| Pruebas | Jest y Supertest en backend; Angular y Vitest en frontend |
| Plataforma | Configuración de Capacitor 8 incluida; las instrucciones siguientes ejecutan la versión web local |

El frontend consulta la API HTTP del backend. El backend utiliza Prisma para acceder a PostgreSQL. Las solicitudes de mascotas incluyen el token de sesión.

## Organización del repositorio

| Ruta | Contenido |
| --- | --- |
| `frontend/src/app/home/` | Pantalla de inicio |
| `frontend/src/app/pages/` | Bienvenida, login, registro, mascotas y perfil |
| `frontend/src/app/services/` | Comunicación con autenticación y mascotas |
| `frontend/src/app/app.routes.ts` | Rutas de navegación |
| `backend/index.js` | Inicio del servidor en el puerto 3000 |
| `backend/src/app.js` | Configuración de Express y montaje de rutas |
| `backend/src/controllers/` | Lógica de los endpoints |
| `backend/src/routes/` | Rutas de la API |
| `backend/src/middleware/` | Verificación del token |
| `backend/prisma/` | Modelo de datos y migraciones |
| `backend/tests/` | Pruebas de autenticación y mascotas |

Modelos de datos: **Usuario, Mascota, Vacuna, RegistroMedico y Documento**.

## Preparación local

Necesitas Git, Node.js y npm compatibles con las dependencias del proyecto, y una instancia de PostgreSQL accesible. Comprueba las versiones instaladas con `node --version` y `npm --version`.

Los comandos siguientes están escritos para **PowerShell en Windows**. En otros sistemas utiliza `npm` y `npx` en lugar de `npm.cmd` y `npx.cmd`.

### 1. Obtener el proyecto

```powershell
git clone https://github.com/Paulinaescuderodiaz/Proyecto-APT.git
cd Proyecto-APT
```

Si ya tienes una copia, trabaja desde esa carpeta; no necesitas clonarla nuevamente.

### 2. Configurar el backend

Desde la raíz del repositorio:

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

Abre otra terminal en la raíz de `Proyecto-APT`:

```powershell
cd frontend
npm.cmd install
npm.cmd start -- --port 8100
```

Abre **http://localhost:8100**. La raíz muestra la bienvenida; después de iniciar sesión se abre `/home`.

Si ya tienes Ionic CLI instalado, también puedes iniciar el frontend desde su carpeta con `ionic.cmd serve`.

Las direcciones de la API están definidas actualmente en `auth.service.ts` y `mascota.service.ts` como `http://localhost:3000/api/...`. Si cambias el host o el puerto del backend, actualiza ambos servicios. En un teléfono, `localhost` apunta al propio teléfono, no al computador.

## Rutas de la aplicación

| Ruta | Pantalla |
| --- | --- |
| `/bienvenida` | Presentación y accesos |
| `/registro` | Creación de cuenta |
| `/login` | Inicio de sesión |
| `/home` | Inicio y resumen de mascotas |
| `/mascotas` | Listado, formulario y detalle |
| `/perfil` | Datos de cuenta y cierre de sesión |

## API principal

Base local: `http://localhost:3000`.

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/` | Comprobar que el servidor responde |
| POST | `/api/auth/registro` | Crear una cuenta |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/mascotas` | Listar mascotas del usuario |
| POST | `/api/mascotas` | Crear una mascota |
| PUT | `/api/mascotas/:id` | Actualizar una mascota |
| POST | `/api/vacunas` | Crear una vacuna |
| GET | `/api/vacunas/mascota/:mascotaId` | Consultar vacunas |
| PUT | `/api/vacunas/:id` | Actualizar una vacuna |
| POST | `/api/registros-medicos` | Crear un registro médico |
| GET | `/api/registros-medicos/mascota/:mascotaId` | Consultar historial |
| POST | `/api/documentos` | Subir un documento |

Las rutas de mascotas, vacunas, registros médicos y documentos requieren la cabecera `Authorization: Bearer <token>`. La carga de documentos utiliza `multipart/form-data`, con los campos `archivo` y `registroMedicoId`.

Actualmente los archivos de `uploads` se sirven públicamente en `/uploads`; debe revisarse su control de acceso antes de utilizar documentos sensibles.

## Sesión

El login guarda `pethub_token` y `pethub_usuario` en el almacenamiento local del navegador. Cerrar sesión elimina ambos valores, pero no elimina la cuenta ni sus mascotas. La presencia del token en el frontend no garantiza su validez: el backend verifica las solicitudes protegidas.

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

Estos comandos corresponden a los scripts existentes. La actualización de este README no implica que las pruebas o la compilación se hayan ejecutado ni que estén aprobadas.

Comprobación manual del flujo principal:

1. Crear una cuenta e iniciar sesión.
2. Probar credenciales incorrectas y comprobar el aviso.
3. Agregar una mascota y verificar que aparece en Inicio después de recargar.
4. Editar sus datos y comprobar que se conservan.
5. Abrir Perfil, revisar nombre y correo y cerrar sesión.

## Problemas frecuentes

| Síntoma | Qué revisar |
| --- | --- |
| No conecta con la API | Mantener el backend iniciado y comprobar el puerto 3000 |
| `MODULE_NOT_FOUND` | Ejecutar `npm.cmd install` dentro de `backend` |
| `secretOrPrivateKey must have a value` | Definir `JWT_SECRET` en `backend/.env` y reiniciar el backend |
| Error de conexión de Prisma | Revisar PostgreSQL, `DATABASE_URL` y migraciones |
| Registro responde 409 | El correo ya está registrado; iniciar sesión o usar otro |
| Login responde 401 | Revisar correo y contraseña |
| Error CORS | Confirmar que el proceso del puerto 3000 corresponde al backend actualizado y reiniciarlo |
| No se puede cargar un documento | Comprobar que existe `backend/uploads`, el formato y el máximo de 5 MB |

## Documentación académica

- [Informe del proyecto](Informe_APT_Pethub_Completo_final.pdf)
- [Carta Gantt](Pethub_Carta_Gantt.xlsx)
- [Historias de usuario](Pethub_Historias_Usuario_3.xlsx)
- [Plantillas del Sprint 1](Pethub_Plantillas_Sprint1_Completado.xlsx)

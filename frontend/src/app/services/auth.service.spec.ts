import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Simula las respuestas HTTP: no consulta el backend ni la base de datos.
describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    // Cada prueba comienza sin una sesión guardada.
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Comprueba que no quedaron solicitudes pendientes y limpia la sesión.
    httpMock.verify();
    localStorage.clear();
  });

  it('guarda el token y el usuario cuando el login es exitoso', () => {
    service.login({
      email: 'evelyn@pethub.cl',
      password: 'clave123',
    }).subscribe();

    const req = httpMock.expectOne(
      'http://localhost:3000/api/auth/login'
    );

    expect(req.request.method).toBe('POST');

    // Simula los datos que devuelve el servidor al iniciar sesión.
    req.flush({
      token: 'token-de-prueba',
      usuario: {
        id: 1,
        nombre: 'Evelyn',
        email: 'evelyn@pethub.cl',
      },
    });

    expect(localStorage.getItem('pethub_token')).toBe(
      'token-de-prueba'
    );
    expect(service.estaAutenticado()).toBe(true);
    expect(service.obtenerUsuario().nombre).toBe('Evelyn');
  });

  it('no guarda una sesión cuando el login falla', () => {
    service.login({
      email: 'evelyn@pethub.cl',
      password: 'incorrecta',
    }).subscribe({
      error: () => {
        // El error es esperado: se comprueba que no se guarde la sesión.
      },
    });

    const req = httpMock.expectOne(
      'http://localhost:3000/api/auth/login'
    );

    expect(req.request.method).toBe('POST');

    // Simula el rechazo de credenciales incorrectas.
    req.flush(
      { error: 'Correo o contrasena incorrectos' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(localStorage.getItem('pethub_token')).toBeNull();
    expect(localStorage.getItem('pethub_usuario')).toBeNull();
    expect(service.estaAutenticado()).toBe(false);
  });

  it('logout() borra el token y el usuario guardados', () => {
    // Prepara una sesión para comprobar que logout la elimina.
    localStorage.setItem('pethub_token', 'token-de-prueba');
    localStorage.setItem(
      'pethub_usuario',
      JSON.stringify({
        id: 1,
        nombre: 'Evelyn',
        email: 'evelyn@pethub.cl',
      })
    );

    service.logout();

    expect(localStorage.getItem('pethub_token')).toBeNull();
    expect(localStorage.getItem('pethub_usuario')).toBeNull();
    expect(service.estaAutenticado()).toBe(false);
  });

  it('registro() envía todos los datos al backend', () => {
    // Incluye comuna, que es obligatoria en el contrato RegistroData.
    const datos = {
      nombre: 'Paulina',
      email: 'paulina@pethub.cl',
      password: 'clave456',
      comuna: 'Vina del Mar',
    };

    service.registro(datos).subscribe();

    const req = httpMock.expectOne(
      'http://localhost:3000/api/auth/registro'
    );

    // Verifica el método y el contenido de la solicitud.
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);

    // Simula la creación exitosa de la cuenta.
    req.flush(
      {
        id: 2,
        nombre: 'Paulina',
        email: 'paulina@pethub.cl',
      },
      { status: 201, statusText: 'Created' }
    );
  });
});
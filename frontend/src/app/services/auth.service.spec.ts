import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // falla el test si quedó alguna petición sin responder
    localStorage.clear();
  });

  it('guarda el token y el usuario en localStorage cuando el login es exitoso', () => {
    service.login({ email: 'evelyn@pethub.cl', password: 'clave123' }).subscribe();

    const req = httpMock.expectOne('http://localhost:3000/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({
      token: 'token-de-prueba',
      usuario: { id: 1, nombre: 'Evelyn', email: 'evelyn@pethub.cl' },
    });

    expect(localStorage.getItem('pethub_token')).toBe('token-de-prueba');
    expect(service.estaAutenticado()).toBe(true);
    expect(service.obtenerUsuario().nombre).toBe('Evelyn');
  });

  it('no guarda nada en localStorage cuando el login falla', () => {
    service.login({ email: 'evelyn@pethub.cl', password: 'incorrecta' }).subscribe({
      error: () => {
        // se espera el error; lo que interesa probar es que no se guardó nada
      },
    });

    const req = httpMock.expectOne('http://localhost:3000/api/auth/login');
    req.flush({ error: 'Correo o contrasena incorrectos' }, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('pethub_token')).toBeNull();
    expect(service.estaAutenticado()).toBe(false);
  });

  it('logout() borra el token y el usuario guardados', () => {
    localStorage.setItem('pethub_token', 'algo');
    localStorage.setItem('pethub_usuario', JSON.stringify({ id: 1 }));

    service.logout();

    expect(localStorage.getItem('pethub_token')).toBeNull();
    expect(localStorage.getItem('pethub_usuario')).toBeNull();
    expect(service.estaAutenticado()).toBe(false);
  });

  it('registro() envía los datos tal cual al backend', () => {
    const datos = { nombre: 'Paulina', email: 'paulina@pethub.cl', password: 'clave456' };
    service.registro(datos).subscribe();

    const req = httpMock.expectOne('http://localhost:3000/api/auth/registro');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);
    req.flush({ id: 2, nombre: 'Paulina', email: 'paulina@pethub.cl' });
  });
});

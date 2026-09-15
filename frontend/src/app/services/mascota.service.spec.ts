import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MascotaService } from './mascota.service';

describe('MascotaService', () => {
  let service: MascotaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('pethub_token', 'token-de-prueba');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MascotaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('listar() manda el token guardado en el header Authorization', () => {
    service.listar().subscribe();

    const req = httpMock.expectOne('http://localhost:3000/api/mascotas');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    req.flush([]);
  });

  it('crear() manda los datos de la mascota junto con el token', () => {
    const datos = { nombre: 'Firulais', especie: 'Perro' };
    service.crear(datos).subscribe();

    const req = httpMock.expectOne('http://localhost:3000/api/mascotas');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    req.flush({
      id: 1,
      ...datos,
      raza: null,
      foto: null,
      usuarioId: 1,
      createdAt: new Date().toISOString(),
    });
  });

  it('actualizar() manda la petición PUT al id correcto', () => {
    const datos = { nombre: 'Firulais Editado', especie: 'Perro' };
    service.actualizar(5, datos).subscribe();

    const req = httpMock.expectOne('http://localhost:3000/api/mascotas/5');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(datos);
    req.flush({
      id: 5,
      ...datos,
      raza: null,
      foto: null,
      usuarioId: 1,
      createdAt: new Date().toISOString(),
    });
  });
});

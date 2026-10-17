import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';
import { DonanteComponent } from './donante.component';

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest';

describe('DonanteComponent — S3-HU08', () => {
  let fixture: ComponentFixture<DonanteComponent>;
  let componente: DonanteComponent;
  let httpMock: HttpTestingController;

  const url = 'http://localhost:3000/api/donantes';

  beforeEach(async () => {
    localStorage.setItem('pethub_token', 'token-de-prueba');

    await TestBed.configureTestingModule({
      imports: [DonanteComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DonanteComponent);
    componente = fixture.componentInstance;

    fixture.componentRef.setInput('mascotaId', 7);
    fixture.componentRef.setInput('nombreMascota', 'Kali');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    try {
      httpMock.verify();
    } finally {
      fixture?.destroy();
      TestBed.resetTestingModule();
      localStorage.removeItem('pethub_token');
    }
  });

  async function preparar(conGrupo = false) {
    componente.conoceGrupo = conGrupo;
    componente.grupoSanguineo = conGrupo ? '  A  ' : '';
    componente.acepta = true;

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function enviar() {
    const formulario = fixture.debugElement
      .query(By.directive(NgForm))
      .injector.get(NgForm);

    componente.inscribir(formulario);
    fixture.detectChanges();
  }

  function respuesta(estado: 'activo' | 'pendiente') {
    return {
      id: 10,
      mascotaId: 7,
      grupoSanguineo: estado === 'activo' ? 'A' : null,
      estado,
      createdAt: '2026-10-17T00:00:00.000Z',
    };
  }

  it('bloquea la inscripción sin aceptar la declaración', () => {
    enviar();

    expect(fixture.nativeElement.textContent)
      .toContain('Confirma la inscripción y la declaración de requisitos.');

    httpMock.expectNone(url);
  });

  it('rechaza un grupo compuesto solo por espacios', async () => {
    await preparar(true);
    componente.grupoSanguineo = '   ';

    enviar();

    expect(fixture.nativeElement.textContent)
      .toContain('Ingresa un grupo sanguíneo válido');

    httpMock.expectNone(url);
  });

  it('envía token y grupo normalizado y muestra el estado activo', async () => {
    await preparar(true);
    enviar();

    const solicitud = httpMock.expectOne(url);

    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.headers.get('Authorization'))
      .toBe('Bearer token-de-prueba');
    expect(solicitud.request.body).toEqual({
      mascotaId: 7,
      grupoSanguineo: 'A',
      cumpleRequisitos: true,
    });

    // No confirma una inscripción antes de recibir la respuesta.
    expect(componente.registro).toBeNull();
    expect(componente.guardando).toBe(true);

    solicitud.flush(respuesta('activo'), {
      status: 201,
      statusText: 'Created',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent)
      .toContain('Inscripción registrada');
    expect(fixture.nativeElement.textContent).toContain('Activo');
    expect(fixture.nativeElement.textContent).toContain('Kali');
    expect(componente.guardando).toBe(false);
  });

  it('envía grupo nulo y muestra pendiente de tipificación', async () => {
    await preparar();
    enviar();

    const solicitud = httpMock.expectOne(url);
    expect(solicitud.request.body.grupoSanguineo).toBeNull();

    solicitud.flush(respuesta('pendiente'), {
      status: 201,
      statusText: 'Created',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent)
      .toContain('Pendiente de tipificación');
  });

  it('evita un segundo envío mientras espera al servidor', async () => {
    await preparar();
    enviar();
    enviar();

    // expectOne falla si se crearon dos solicitudes.
    httpMock.expectOne(url).flush(respuesta('pendiente'));
    fixture.detectChanges();
  });

  it('informa cuando la mascota ya está registrada', async () => {
    await preparar();
    enviar();

    httpMock.expectOne(url).flush(
      { error: 'Esta mascota ya está registrada como donante' },
      { status: 409, statusText: 'Conflict' }
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent)
      .toContain('Esta mascota ya está registrada como donante.');
    expect(componente.registro).toBeNull();
    expect(componente.guardando).toBe(false);
  });

  it('informa cuando la sesión no es válida', async () => {
    await preparar();
    enviar();

    httpMock.expectOne(url).flush(
      {},
      { status: 401, statusText: 'Unauthorized' }
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent)
      .toContain('Tu sesión no es válida.');
  });

  it('conserva los datos y permite reintentar después de un error', async () => {
    await preparar(true);
    enviar();

    httpMock.expectOne(url).flush(
      {},
      { status: 500, statusText: 'Server Error' }
    );
    fixture.detectChanges();

    expect(componente.grupoSanguineo).toBe('  A  ');
    expect(componente.acepta).toBe(true);
    expect(componente.registro).toBeNull();
    expect(fixture.nativeElement.textContent)
      .toContain('Conservamos tus datos para reintentar.');

    enviar();
    httpMock.expectOne(url).flush(respuesta('activo'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent)
      .toContain('Inscripción registrada');
    expect(componente.error).toBe('');
  });
});
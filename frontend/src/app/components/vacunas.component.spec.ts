import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { VacunasComponent } from './vacunas.component';
import { Vacuna } from '../services/vacuna.service';

describe('VacunasComponent — S2-HU04', () => {
  let fixture: ComponentFixture<VacunasComponent>;
  let componente: VacunasComponent;
  let httpMock: HttpTestingController;

  const url = 'http://localhost:3000/api/vacunas';

  const vacuna: Vacuna = {
    id: 10,
    mascotaId: 7,
    nombre: 'Triple felina',
    fechaAplicacion: '2026-09-20T00:00:00.000Z',
    fechaProximoRefuerzo: '2026-10-20T00:00:00.000Z',
    aplicada: false,
  };

  beforeEach(async () => {
    localStorage.setItem('pethub_token', 'token-de-prueba');

    await TestBed.configureTestingModule({
      imports: [VacunasComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(VacunasComponent);
    componente = fixture.componentInstance;

    fixture.componentRef.setInput('mascotaId', 7);
    fixture.detectChanges();
  });

  afterEach(() => {
    try {
      httpMock.verify();
    } finally {
      TestBed.resetTestingModule();
      localStorage.clear();
    }
  });

  function cargarLista(datos: Vacuna[] = []) {
    const solicitud = httpMock.expectOne(`${url}/mascota/7`);
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush(datos);
    fixture.detectChanges();
  }

  function completarFormulario(refuerzo = '2026-10-20') {
    componente.formulario.setValue({
      nombre: 'Triple felina',
      fechaAplicacion: '2026-09-20',
      fechaProximoRefuerzo: refuerzo,
    });
  }

  function enviarFormulario() {
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', {
        bubbles: true,
        cancelable: true,
      }));

    fixture.detectChanges();
  }

  it('consulta con token y muestra las vacunas de antigua a reciente', () => {
    const solicitud = httpMock.expectOne(`${url}/mascota/7`);

    expect(solicitud.request.headers.get('Authorization'))
      .toBe('Bearer token-de-prueba');

    solicitud.flush([
      vacuna,
      {
        ...vacuna,
        id: 11,
        nombre: 'Antirrábica',
        fechaAplicacion: '2026-08-01T00:00:00.000Z',
      },
    ]);

    fixture.detectChanges();

    const nombres = Array.from(
      fixture.nativeElement.querySelectorAll('.vacuna h3')
    ).map(elemento => (elemento as HTMLElement).textContent?.trim());

    expect(nombres).toEqual(['Antirrábica', 'Triple felina']);
  });

  it('rechaza un nombre compuesto solo por espacios', () => {
    cargarLista();
    completarFormulario();
    componente.formulario.controls.nombre.setValue('   ');

    enviarFormulario();

    expect(fixture.nativeElement.textContent)
      .toContain('Ingresa un nombre válido');

    httpMock.expectNone(solicitud => solicitud.method === 'POST');
  });

  it('rechaza una vacuna sin fecha de aplicación', () => {
    cargarLista();
    completarFormulario();
    componente.formulario.controls.fechaAplicacion.setValue('');

    enviarFormulario();

    expect(fixture.nativeElement.textContent)
      .toContain('Ingresa una fecha de aplicación válida');

    httpMock.expectNone(solicitud => solicitud.method === 'POST');
  });

  it('rechaza un refuerzo anterior a la aplicación', () => {
    cargarLista();
    completarFormulario('2026-09-19');

    enviarFormulario();

    expect(fixture.nativeElement.textContent)
      .toContain('La fecha de refuerzo debe ser posterior');

    httpMock.expectNone(solicitud => solicitud.method === 'POST');
  });

  it('rechaza un refuerzo igual a la fecha de aplicación', () => {
    cargarLista();
    completarFormulario('2026-09-20');

    enviarFormulario();

    expect(fixture.nativeElement.textContent)
      .toContain('La fecha de refuerzo debe ser posterior');

    httpMock.expectNone(solicitud => solicitud.method === 'POST');
  });

  it('registra sin refuerzo y muestra la respuesta del servidor', () => {
    cargarLista();
    completarFormulario('');
    componente.formulario.controls.nombre.setValue('  Triple felina  ');

    enviarFormulario();

    const solicitud = httpMock.expectOne(url);

    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.headers.get('Authorization'))
      .toBe('Bearer token-de-prueba');
    expect(solicitud.request.body).toEqual({
      mascotaId: 7,
      nombre: 'Triple felina',
      fechaAplicacion: '2026-09-20',
      fechaProximoRefuerzo: null,
    });

    // Todavía no debe aparecer una vacuna que el servidor no confirmó.
    expect(componente.vacunas).toHaveLength(0);

    solicitud.flush({
      ...vacuna,
      fechaProximoRefuerzo: null,
    }, { status: 201, statusText: 'Created' });

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.vacuna').length)
      .toBe(1);
    expect(fixture.nativeElement.textContent)
      .toContain('Vacuna registrada correctamente.');
    expect(componente.formulario.controls.nombre.value).toBe('');
  });

  it('edita con PUT y reemplaza la vacuna sin duplicarla', () => {
    cargarLista([vacuna]);

    const boton = fixture.nativeElement
      .querySelector('.vacuna button') as HTMLButtonElement;
    boton.click();

    componente.formulario.controls.nombre.setValue('Triple felina actualizada');
    componente.formulario.controls.fechaProximoRefuerzo.setValue('');

    enviarFormulario();

    const solicitud = httpMock.expectOne(`${url}/10`);

    expect(solicitud.request.method).toBe('PUT');
    expect(solicitud.request.headers.get('Authorization'))
      .toBe('Bearer token-de-prueba');
    expect(solicitud.request.body.fechaProximoRefuerzo).toBeNull();
    expect(solicitud.request.body.aplicada).toBe(false);

    solicitud.flush({
      ...vacuna,
      nombre: 'Triple felina actualizada',
      fechaProximoRefuerzo: null,
    });

    fixture.detectChanges();

    expect(componente.vacunas).toHaveLength(1);
    expect(componente.vacunas[0].id).toBe(10);
    expect(fixture.nativeElement.querySelector('.vacuna h3').textContent)
      .toContain('Triple felina actualizada');

    httpMock.expectNone(solicitud => solicitud.method === 'POST');
  });

  it('conserva los datos y permite reintentar si falla el guardado', () => {
    cargarLista();
    completarFormulario();

    enviarFormulario();

    httpMock.expectOne(url).flush(
      { error: 'Error al registrar la vacuna' },
      { status: 500, statusText: 'Server Error' }
    );

    fixture.detectChanges();

    expect(componente.formulario.controls.nombre.value)
      .toBe('Triple felina');
    expect(componente.vacunas).toHaveLength(0);
    expect(fixture.nativeElement.textContent)
      .toContain('Conservamos tus datos para reintentar.');

    enviarFormulario();

    httpMock.expectOne(url).flush(vacuna, {
      status: 201,
      statusText: 'Created',
    });

    fixture.detectChanges();

    expect(componente.vacunas).toHaveLength(1);
    expect(componente.errorGuardado).toBe('');
  });
});
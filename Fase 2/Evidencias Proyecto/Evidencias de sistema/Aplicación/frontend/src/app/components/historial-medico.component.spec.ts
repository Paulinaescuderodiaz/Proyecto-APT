import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { HistorialMedicoComponent } from './historial-medico.component';
import { AuthService } from '../services/auth.service';
import { RegistroMedico } from '../services/registro-medico.service';

// Pruebas del historial médico HU05.
// Se usa el componente y el servicio reales con respuestas HTTP simuladas.
describe('HistorialMedicoComponent — HU05', () => {
  let fixture: ComponentFixture<HistorialMedicoComponent>;
  let httpMock: HttpTestingController;

  const apiUrl = 'http://localhost:3000/api/registros-medicos';
  const mascotaId = 1;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistorialMedicoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),

        // Simula una sesión para evitar depender del login.
        {
          provide: AuthService,
          useValue: {
            obtenerToken: () => 'token-de-prueba',
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HistorialMedicoComponent);

    // Al recibir la mascota, el componente consulta su historial.
    fixture.componentRef.setInput('mascotaId', mascotaId);
    fixture.detectChanges();
  });

  afterEach(() => {
    // Detecta solicitudes inesperadas o pendientes de responder.
    httpMock.verify();
  });

  // Responde la consulta inicial y espera la creación del formulario.
  async function cargarHistorial(
    registros: RegistroMedico[] = []
  ): Promise<void> {
    const req = httpMock.expectOne(
      `${apiUrl}/mascota/${mascotaId}`
    );

    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe(
      'Bearer token-de-prueba'
    );

    req.flush(registros);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  // Escribe en los campos HTML como lo haría el usuario.
  async function escribir(
    selector: string,
    valor: string
  ): Promise<void> {
    const campo = fixture.nativeElement.querySelector(selector) as
      | HTMLInputElement
      | HTMLTextAreaElement;

    campo.value = valor;
    campo.dispatchEvent(new Event('input', { bubbles: true }));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  // Envía el formulario real para ejecutar sus validaciones.
  async function enviarFormulario(): Promise<void> {
    const formulario = fixture.nativeElement.querySelector(
      'form'
    ) as HTMLFormElement;

    formulario.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  // Escenario 2: el diagnóstico es obligatorio.
  it('rechaza un diagnóstico vacío y muestra el aviso', async () => {
    await cargarHistorial();

    await escribir('#fecha-registro', '2026-09-20');
    await escribir('#tratamiento', 'Tratamiento de prueba');
    await enviarFormulario();

    const aviso = fixture.nativeElement.querySelector(
      '#error-diagnostico'
    ) as HTMLElement;

    expect(aviso.textContent).toContain(
      'Debes indicar un diagnóstico'
    );

    // No debe enviar una solicitud para guardar.
    httpMock.expectNone((req) => req.method === 'POST');

    expect(
      fixture.nativeElement.querySelectorAll('article.registro').length
    ).toBe(0);
  });

  // También rechaza un campo que aparentemente está lleno,
  // pero contiene únicamente espacios.
  it('rechaza un diagnóstico compuesto solo por espacios', async () => {
    await cargarHistorial();

    await escribir('#diagnostico', '   ');
    await escribir('#fecha-registro', '2026-09-20');
    await enviarFormulario();

    expect(
      fixture.nativeElement.querySelector('#error-diagnostico').textContent
    ).toContain('Debes indicar un diagnóstico');

    httpMock.expectNone((req) => req.method === 'POST');
  });

  // Escenario 1: guarda y muestra el registro confirmado por el servidor.
  it('guarda un registro válido y lo muestra en el historial', async () => {
    await cargarHistorial();

    await escribir('#diagnostico', 'Diagnóstico de prueba');
    await escribir('#fecha-registro', '2026-09-20');
    await escribir('#tratamiento', 'Tratamiento de prueba');
    await enviarFormulario();

    const req = httpMock.expectOne(apiUrl);

    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe(
      'Bearer token-de-prueba'
    );
    expect(req.request.body).toEqual({
      mascotaId,
      diagnostico: 'Diagnóstico de prueba',
      fecha: '2026-09-20',
      tratamiento: 'Tratamiento de prueba',
    });

    // Antes de la confirmación no debe aparecer un registro guardado.
    expect(
      fixture.nativeElement.querySelectorAll('article.registro').length
    ).toBe(0);

    req.flush(
      {
        id: 10,
        mascotaId,
        diagnostico: 'Diagnóstico de prueba',
        fecha: '2026-09-20T00:00:00.000Z',
        tratamiento: 'Tratamiento de prueba',
      },
      { status: 201, statusText: 'Created' }
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.exito').textContent
    ).toContain('Registro médico guardado correctamente.');

    const tarjeta = fixture.nativeElement.querySelector(
      'article.registro'
    ) as HTMLElement;

    expect(tarjeta.textContent).toContain('Diagnóstico de prueba');
    expect(tarjeta.textContent).toContain('Tratamiento de prueba');
    expect(tarjeta.textContent).toContain('20/09/2026');

    // El formulario se limpia después de guardar correctamente.
    expect(
      fixture.nativeElement.querySelector('#diagnostico').value
    ).toBe('');
  });

  // Escenario 3: muestra todos los registros del más reciente al más antiguo.
  it('ordena el historial por fecha descendente', async () => {
    await cargarHistorial([
      {
        id: 1,
        mascotaId,
        diagnostico: 'Registro antiguo',
        fecha: '2026-09-10T00:00:00.000Z',
        tratamiento: null,
      },
      {
        id: 2,
        mascotaId,
        diagnostico: 'Registro reciente',
        fecha: '2026-09-22T00:00:00.000Z',
        tratamiento: null,
      },
      {
        id: 3,
        mascotaId,
        diagnostico: 'Registro intermedio',
        fecha: '2026-09-15T00:00:00.000Z',
        tratamiento: null,
      },
    ]);

    const titulos = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        'article.registro h4'
      )
    ).map((elemento) => elemento.textContent?.trim());

    expect(titulos).toEqual([
      'Registro reciente',
      'Registro intermedio',
      'Registro antiguo',
    ]);
  });

  // Si el servidor falla, conserva los datos para reintentar
  // y no presenta el registro como guardado.
  it('muestra un error y conserva el formulario si falla el guardado', async () => {
    await cargarHistorial();

    await escribir('#diagnostico', 'Diagnóstico de prueba');
    await escribir('#fecha-registro', '2026-09-20');
    await escribir('#tratamiento', 'Tratamiento de prueba');
    await enviarFormulario();

    const req = httpMock.expectOne(apiUrl);

    req.flush(
      { error: 'Error del servidor' },
      { status: 500, statusText: 'Internal Server Error' }
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent
    ).toContain(
      'No pudimos guardar el registro médico. Intenta nuevamente.'
    );

    expect(
      fixture.nativeElement.querySelector('#diagnostico').value
    ).toBe('Diagnóstico de prueba');

    expect(
      fixture.nativeElement.querySelector('#tratamiento').value
    ).toBe('Tratamiento de prueba');

    expect(
      fixture.nativeElement.querySelectorAll('article.registro').length
    ).toBe(0);

    expect(fixture.nativeElement.querySelector('.exito')).toBeNull();
  });
});
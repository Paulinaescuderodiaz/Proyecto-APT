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

import { AdjuntarDocumentoComponent } from './adjuntar-documento.component';
import { AuthService } from '../services/auth.service';

describe('AdjuntarDocumentoComponent — S2-HU06', () => {
  let fixture: ComponentFixture<AdjuntarDocumentoComponent>;
  let httpMock: HttpTestingController;

  const apiUrl = 'http://localhost:3000/api/documentos';
  const registroMedicoId = 10;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdjuntarDocumentoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            obtenerToken: () => 'token-de-prueba',
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(AdjuntarDocumentoComponent);

    fixture.componentRef.setInput(
      'registroMedicoId',
      registroMedicoId
    );

    fixture.detectChanges();
  });

  afterEach(() => {
    // Ninguna solicitud debe quedar pendiente al terminar la prueba.
    httpMock.verify();
  });

  function obtenerSelector(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[type="file"]');
  }

  function obtenerBoton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button');
  }

  function seleccionarArchivo(archivo: File): void {
    const selector = obtenerSelector();

    // Simula la selección de un archivo sin abrir el explorador.
    Object.defineProperty(selector, 'files', {
      configurable: true,
      value: [archivo],
    });

    selector.dispatchEvent(new Event('change', { bubbles: true }));

    fixture.detectChanges();
  }

  function pulsarSubir(): void {
    obtenerBoton().click();
    fixture.detectChanges();
  }

  it('envía un PDF con el registro médico y muestra el éxito al recibir la confirmación', () => {
    const archivo = new File(
      ['contenido de prueba'],
      'informe-veterinario.pdf',
      { type: 'application/pdf' }
    );

    seleccionarArchivo(archivo);

    expect(obtenerBoton().disabled).toBe(false);

    pulsarSubir();

    const solicitud = httpMock.expectOne(apiUrl);

    expect(solicitud.request.method).toBe('POST');

    expect(solicitud.request.headers.get('Authorization')).toBe(
      'Bearer token-de-prueba'
    );

    const formulario = solicitud.request.body as FormData;

    expect(formulario instanceof FormData).toBe(true);

    expect(formulario.get('registroMedicoId')).toBe(
      String(registroMedicoId)
    );

    const archivoEnviado = formulario.get('archivo') as File;

    expect(archivoEnviado.name).toBe('informe-veterinario.pdf');
    expect(archivoEnviado.type).toBe('application/pdf');
    expect(archivoEnviado.size).toBe(archivo.size);

    // El navegador debe asignar el Content-Type de multipart.
    expect(solicitud.request.headers.has('Content-Type')).toBe(false);

    // Mientras espera, bloquea nuevos envíos y aún no anuncia éxito.
    expect(obtenerBoton().disabled).toBe(true);
    expect(obtenerSelector().disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.exito')).toBeNull();

    solicitud.flush(
      {
        id: 1,
        nombreArchivo: archivo.name,
        rutaArchivo: 'uploads/informe-prueba.pdf',
        tipoArchivo: archivo.type,
        tamano: archivo.size,
        registroMedicoId,
      },
      { status: 201, statusText: 'Created' }
    );

    fixture.detectChanges();

    const mensaje = fixture.nativeElement.querySelector('.exito');

    expect(mensaje.textContent).toContain(
      'Archivo adjuntado correctamente al registro médico.'
    );

    expect(obtenerSelector().disabled).toBe(false);
    expect(obtenerSelector().value).toBe('');
    expect(fixture.nativeElement.querySelector('.nombre')).toBeNull();

    // Para volver a subir, primero debe seleccionar otro archivo.
    expect(obtenerBoton().disabled).toBe(true);
  });

  it('rechaza un formato no soportado y no envía solicitudes', () => {
    const archivo = new File(
      ['contenido de texto'],
      'documento.txt',
      { type: 'text/plain' }
    );

    seleccionarArchivo(archivo);

    const mensaje = fixture.nativeElement.querySelector('[role="alert"]');

    expect(mensaje.textContent).toContain(
      'Formato de archivo no soportado'
    );

    expect(obtenerBoton().disabled).toBe(true);
    expect(obtenerSelector().value).toBe('');

    httpMock.expectNone(apiUrl);
  });

  it('rechaza un archivo que supera los 5 MB y no envía solicitudes', () => {
    // Un byte por encima del límite permitido.
    const contenido = new Uint8Array(5 * 1024 * 1024 + 1);

    const archivo = new File(
      [contenido],
      'imagen-grande.png',
      { type: 'image/png' }
    );

    seleccionarArchivo(archivo);

    const mensaje = fixture.nativeElement.querySelector('[role="alert"]');

    expect(mensaje.textContent).toContain(
      'El archivo supera el tamaño máximo permitido'
    );

    expect(obtenerBoton().disabled).toBe(true);
    expect(obtenerSelector().value).toBe('');

    httpMock.expectNone(apiUrl);
  });

  it('muestra un error y conserva el archivo para reintentar si falla el servidor', () => {
    const archivo = new File(
      ['imagen de prueba'],
      'examen.jpg',
      { type: 'image/jpeg' }
    );

    seleccionarArchivo(archivo);
    pulsarSubir();

    const solicitud = httpMock.expectOne(apiUrl);

    solicitud.flush(
      { error: 'Error al guardar el documento' },
      { status: 500, statusText: 'Internal Server Error' }
    );

    fixture.detectChanges();

    const mensaje = fixture.nativeElement.querySelector('[role="alert"]');

    expect(mensaje.textContent).toContain(
      'No pudimos subir el archivo. Intenta nuevamente.'
    );

    expect(fixture.nativeElement.querySelector('.exito')).toBeNull();

    expect(
      fixture.nativeElement.querySelector('.nombre').textContent
    ).toContain('examen.jpg');

    expect(obtenerBoton().disabled).toBe(false);
    expect(obtenerSelector().disabled).toBe(false);

    // Comprueba que realmente se puede volver a enviar el mismo archivo.
    pulsarSubir();

    const reintento = httpMock.expectOne(apiUrl);
    const formulario = reintento.request.body as FormData;

    expect((formulario.get('archivo') as File).name).toBe('examen.jpg');

    reintento.flush(
      {
        id: 2,
        nombreArchivo: archivo.name,
        rutaArchivo: 'uploads/examen-prueba.jpg',
        tipoArchivo: archivo.type,
        tamano: archivo.size,
        registroMedicoId,
      },
      { status: 201, statusText: 'Created' }
    );

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();

    expect(
      fixture.nativeElement.querySelector('.exito').textContent
    ).toContain('Archivo adjuntado correctamente al registro médico.');
  });
});
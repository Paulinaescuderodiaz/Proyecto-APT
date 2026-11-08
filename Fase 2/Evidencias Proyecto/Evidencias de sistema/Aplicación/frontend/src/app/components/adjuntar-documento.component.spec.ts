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
  vi,
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
    httpMock.expectOne(`${apiUrl}/registro/${registroMedicoId}`).flush([]);
    fixture.detectChanges();
  });

  afterEach(() => {
    // Ninguna solicitud debe quedar pendiente al terminar la prueba.
    httpMock.verify();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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

    httpMock.expectOne(`${apiUrl}/registro/${registroMedicoId}`).flush([]);
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

    httpMock.expectOne(`${apiUrl}/registro/${registroMedicoId}`).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();

    expect(
      fixture.nativeElement.querySelector('.exito').textContent
    ).toContain('Archivo adjuntado correctamente al registro médico.');
  });

  const documento = { id: 55, nombreArchivo: 'Examen Luna.pdf', tipoArchivo: 'application/pdf', tamano: 2048, registroMedicoId };
  function listarConDocumento(): void {
    fixture.componentInstance.cargarDocumentos();
    const req = httpMock.expectOne(`${apiUrl}/registro/${registroMedicoId}`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    req.flush([documento]); fixture.detectChanges();
  }
  it('muestra adjuntos recuperados al volver al historial', () => {
    listarConDocumento();
    const lista = fixture.nativeElement.querySelector('ul.documentos');
    expect(lista.textContent).toContain('Examen Luna.pdf');
    expect(lista.textContent).toContain('PDF · 2 KB');
    expect(lista.querySelectorAll('button').length).toBe(2);
  });
  it('permite reintentar una consulta fallida sin confundirla con una lista vacía', () => {
    fixture.componentInstance.cargarDocumentos();
    httpMock.expectOne(`${apiUrl}/registro/${registroMedicoId}`).flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No pudimos consultar los documentos');
    expect(fixture.nativeElement.textContent).not.toContain('Este registro aún no tiene documentos');
    const reintentar = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(b => b.textContent?.includes('Reintentar consulta'))!;
    reintentar.click();
    httpMock.expectOne(`${apiUrl}/registro/${registroMedicoId}`).flush([documento]); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(documento.nombreArchivo);
  });
  it('abre un PDF autenticado y libera su URL al cerrar la vista', () => {
    listarConDocumento();
    const crear = vi.fn(() => 'blob:pethub-prueba'); const liberar = vi.fn();
    vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: crear, revokeObjectURL: liberar }));
    const dialogo = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    Object.defineProperty(dialogo, 'showModal', { value: vi.fn(), configurable: true });
    fixture.componentInstance.abrir(documento);
    const req = httpMock.expectOne(`${apiUrl}/55/archivo`);
    expect(req.request.responseType).toBe('blob');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    req.flush(new Blob(['%PDF-demo'], { type: 'application/pdf' })); fixture.detectChanges();
    expect(dialogo.showModal).toHaveBeenCalled();
    expect(dialogo.querySelector('iframe')?.getAttribute('src')).toBe('blob:pethub-prueba');
    fixture.componentInstance.cerrarVista(); fixture.detectChanges();
    expect(liberar).toHaveBeenCalledWith('blob:pethub-prueba');
    expect(dialogo.querySelector('iframe')).toBeNull();
  });
  it('descarga con el nombre original sin incluir el token en una URL', () => {
    listarConDocumento();
    vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: vi.fn(() => 'blob:descarga'), revokeObjectURL: vi.fn() }));
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    fixture.componentInstance.abrir(documento, true);
    const req = httpMock.expectOne(`${apiUrl}/55/archivo?descargar=1`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    req.flush(new Blob(['%PDF-demo'], { type: 'application/pdf' }));
    expect(clic).toHaveBeenCalledOnce();
    const enlace = clic.mock.contexts[0] as HTMLAnchorElement;
    expect(enlace.download).toBe(documento.nombreArchivo);
    expect(enlace.href).toBe('blob:descarga');
    fixture.destroy();
  });
  it('muestra un aviso si falta el archivo sin eliminarlo de la lista', () => {
    listarConDocumento(); fixture.componentInstance.abrir(documento);
    httpMock.expectOne(`${apiUrl}/55/archivo`).flush(new Blob(), { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('El archivo ya no está disponible.');
    expect(fixture.nativeElement.textContent).toContain(documento.nombreArchivo);
  });
  it('cancela una consulta antigua al cambiar de registro y no conserva sus documentos', () => {
    fixture.componentInstance.cargarDocumentos();
    const anterior = httpMock.expectOne(`${apiUrl}/registro/${registroMedicoId}`);
    fixture.componentRef.setInput('registroMedicoId', 99); fixture.detectChanges();
    expect(anterior.cancelled).toBe(true);
    httpMock.expectOne(`${apiUrl}/registro/99`).flush([]); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain(documento.nombreArchivo);
  });
});
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { of } from 'rxjs';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { HomePage } from './home.page';
import { MascotaService } from '../services/mascota.service';
import { RecordatorioPendiente } from '../services/recordatorio.service';

describe('HomePage — recordatorios S2-HU07', () => {
  let fixture: ComponentFixture<HomePage>;
  let component: HomePage;
  let httpMock: HttpTestingController;

  const apiUrl = 'http://localhost:3000/api/recordatorios/pendientes';

  function crearRecordatorio(
    aplicada = false
  ): RecordatorioPendiente {
    return {
      id: 1,
      estado: 'fallido',
      visto: false,
      vacunaId: 20,
      vacuna: {
        id: 20,
        nombre: 'Triple felina',
        mascotaId: 7,
        aplicada,
        fechaProximoRefuerzo: '2026-09-28T00:00:00.000Z',
      },
    };
  }

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('pethub_token', 'token-de-prueba');
    localStorage.setItem(
      'pethub_usuario',
      JSON.stringify({ id: 1, nombre: 'Paulina' })
    );

    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: MascotaService,
          useValue: {
            listar: () =>
              of([
                {
                  id: 7,
                  nombre: 'Kuro',
                  especie: 'Gato',
                  raza: null,
                  foto: null,
                },
              ]),
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  afterEach(() => {
    try {
      // Sigue detectando solicitudes que quedaron sin responder.
      httpMock.verify();
    } finally {
      // Limpia el entorno incluso cuando una prueba falla,
      // para evitar que afecte a las siguientes.
      TestBed.resetTestingModule();
      localStorage.clear();
    }
  });

  function abrirInicio(): void {
    component.ionViewWillEnter();

    // Marca la vista para reflejar los cambios del ciclo de Ionic
    // que ejecutamos manualmente en la prueba.
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
  }

  function seccionRecordatorios(): HTMLElement {
    return fixture.nativeElement.querySelector(
      '[aria-labelledby="titulo-recordatorios"]'
    );
  }

  it('crea la pantalla de inicio', () => {
    expect(component).toBeTruthy();
  });

  it('consulta con el token y muestra vacuna, mascota, fecha y enlace', () => {
    abrirInicio();

    expect(seccionRecordatorios().textContent).toContain(
      'Cargando recordatorios…'
    );

    const solicitud = httpMock.expectOne(apiUrl);

    expect(solicitud.request.method).toBe('GET');
    expect(solicitud.request.headers.get('Authorization')).toBe(
      'Bearer token-de-prueba'
    );

    solicitud.flush([crearRecordatorio()]);
    fixture.detectChanges();

    const tarjeta = seccionRecordatorios().querySelector(
      '.recordatorio'
    ) as HTMLElement;

    expect(tarjeta.textContent).toContain('Triple felina');
    expect(tarjeta.textContent).toContain('Kuro');
    expect(tarjeta.textContent).toContain('28/09/2026');

    const enlace = tarjeta.querySelector('a') as HTMLAnchorElement;

    expect(enlace.getAttribute('href')).toBe(
      '/mascotas?mascotaId=7'
    );
  });

  it('muestra el estado vacío cuando no hay recordatorios', () => {
    abrirInicio();

    httpMock.expectOne(apiUrl).flush([]);
    fixture.detectChanges();

    expect(seccionRecordatorios().textContent).toContain(
      'No tienes recordatorios nuevos.'
    );

    expect(
      seccionRecordatorios().querySelectorAll('.recordatorio').length
    ).toBe(0);
  });

  it('no muestra recordatorios de vacunas que vienen como aplicadas', () => {
    abrirInicio();

    httpMock.expectOne(apiUrl).flush([crearRecordatorio(true)]);
    fixture.detectChanges();

    expect(
      seccionRecordatorios().querySelectorAll('.recordatorio').length
    ).toBe(0);

    expect(seccionRecordatorios().textContent).not.toContain(
      'Triple felina'
    );
  });

  it('muestra un error y permite reintentar la consulta', () => {
    abrirInicio();

    httpMock.expectOne(apiUrl).flush(
      { error: 'Error del servidor' },
      { status: 500, statusText: 'Internal Server Error' }
    );

    fixture.detectChanges();

    expect(
      seccionRecordatorios().querySelector('[role="alert"]')
        ?.textContent
    ).toContain(
      'No pudimos cargar los recordatorios. Intenta nuevamente.'
    );

    const boton = seccionRecordatorios().querySelector(
      'button'
    ) as HTMLButtonElement;

    boton.click();
    fixture.detectChanges();

    httpMock.expectOne(apiUrl).flush([crearRecordatorio()]);
    fixture.detectChanges();

    expect(
      seccionRecordatorios().querySelector('[role="alert"]')
    ).toBeNull();

    expect(seccionRecordatorios().textContent).toContain(
      'Triple felina'
    );
  });

  it('informa cuando el servidor rechaza la sesión', () => {
    abrirInicio();

    httpMock.expectOne(apiUrl).flush(
      { error: 'Token inválido' },
      { status: 401, statusText: 'Unauthorized' }
    );

    fixture.detectChanges();

    expect(
      seccionRecordatorios().querySelector('[role="alert"]')
        ?.textContent
    ).toContain(
      'Tu sesión no es válida. Vuelve a iniciar sesión.'
    );
  });

  it('conserva los avisos al regresar a Inicio sin repetir la consulta', () => {
    abrirInicio();

    httpMock.expectOne(apiUrl).flush([crearRecordatorio()]);
    fixture.detectChanges();

    component.ionViewWillLeave();
    abrirInicio();

    // El backend marca los avisos como vistos al consultarlos:
    // volver a la misma pantalla no debe borrar lo ya recibido.
    httpMock.expectNone(apiUrl);

    expect(seccionRecordatorios().textContent).toContain(
      'Triple felina'
    );

    expect(
      seccionRecordatorios().querySelectorAll('.recordatorio').length
    ).toBe(1);
  });

  it('limpia los avisos anteriores cuando cambia la sesión', () => {
    abrirInicio();

    httpMock.expectOne(apiUrl).flush([crearRecordatorio()]);
    fixture.detectChanges();

    component.ionViewWillLeave();

    localStorage.setItem('pethub_token', 'token-otra-cuenta');
    localStorage.setItem(
      'pethub_usuario',
      JSON.stringify({ id: 2, nombre: 'Otra persona' })
    );

    abrirInicio();

    // Durante la carga ya no deben verse los avisos anteriores.
    expect(
      seccionRecordatorios().querySelectorAll('.recordatorio').length
    ).toBe(0);

    const solicitud = httpMock.expectOne(apiUrl);

    expect(solicitud.request.headers.get('Authorization')).toBe(
      'Bearer token-otra-cuenta'
    );

    solicitud.flush([]);
    fixture.detectChanges();

    expect(seccionRecordatorios().textContent).not.toContain(
      'Triple felina'
    );

    expect(seccionRecordatorios().textContent).toContain(
      'No tienes recordatorios nuevos.'
    );
  });
});
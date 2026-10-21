import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NotificacionesPage } from './notificaciones.page';
import { Notificacion } from '../../services/notificacion.service';

describe('NotificacionesPage — S4-HU11', () => {
  let fixture: ComponentFixture<NotificacionesPage>;
  let page: NotificacionesPage;
  let http: HttpTestingController;
  const url = 'http://localhost:3000/api/notificaciones';
  const aviso: Notificacion = {
    id: 7, usuarioId: 2, tipo: 'solicitud_compatible', solicitudId: 4,
    mensaje: 'Solicitud de urgencia alta para Gato con grupo A.',
    leida: false, createdAt: '2026-10-20T12:00:00.000Z',
  };
  const texto = () => fixture.nativeElement.textContent as string;
  const tarjetas = () => fixture.nativeElement.querySelectorAll('.notificacion');

  beforeEach(async () => {
    localStorage.setItem('pethub_token', 'token-prueba');
    await TestBed.configureTestingModule({
      imports: [NotificacionesPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NotificacionesPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    page.ionViewWillEnter();
    fixture.detectChanges();
  });

  afterEach(() => {
    try { http.verify(); }
    finally { TestBed.resetTestingModule(); localStorage.clear(); }
  });

  function cargar(datos: Notificacion[] = [aviso]) {
    const req = http.expectOne(url);
    req.flush(datos);
    fixture.detectChanges();
    return req;
  }

  function marcar() {
    (fixture.nativeElement.querySelector('.marcar') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('consulta con token, muestra la carga y conserva el orden del servidor', () => {
    expect(texto()).toContain('Cargando notificaciones');
    const req = cargar([aviso, { ...aviso, id: 8, mensaje: 'Segundo aviso', leida: true }]);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-prueba');
    expect(tarjetas()).toHaveLength(2);
    expect(tarjetas()[0].textContent).toContain(aviso.mensaje);
    expect(tarjetas()[1].textContent).toContain('Segundo aviso');
    expect(texto()).toContain('Notificaciones no leídas: 1');
  });

  it('muestra el estado vacío confirmado por el servidor', () => {
    cargar([]);
    expect(texto()).toContain('No tienes notificaciones todavía.');
    expect(texto()).not.toContain('Cargando notificaciones');
  });

  it('filtra las no leídas sin modificar el historial ni repetir la petición', () => {
    cargar([aviso, { ...aviso, id: 8, leida: true }]);
    const botones = fixture.nativeElement.querySelectorAll('.filtros button');
    botones[1].click();
    fixture.detectChanges();
    expect(tarjetas()).toHaveLength(1);
    expect(botones[1].getAttribute('aria-pressed')).toBe('true');
    botones[0].click();
    fixture.detectChanges();
    expect(tarjetas()).toHaveLength(2);
    http.expectNone(url);
  });

  it('marca con PUT y token actual solo después de la confirmación', () => {
    cargar();
    localStorage.setItem('pethub_token', 'token-renovado');
    marcar();
    const req = http.expectOne(`${url}/7/leida`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-renovado');
    expect(page.notificaciones[0].leida).toBe(false);
    expect(texto()).toContain('Guardando…');
    expect(fixture.nativeElement.querySelector('.marcar').disabled).toBe(true);
    req.flush({ ...aviso, leida: true });
    fixture.detectChanges();
    expect(page.notificaciones[0].leida).toBe(true);
    expect(fixture.nativeElement.querySelector('.marcar')).toBeNull();
    expect(texto()).toContain('Notificación marcada como leída.');
    expect(texto()).toContain('Notificaciones no leídas: 0');
  });

  it('retira del filtro un aviso leído y conserva la tarjeta en Todas', () => {
    cargar();
    fixture.nativeElement.querySelectorAll('.filtros button')[1].click();
    fixture.detectChanges();
    marcar();
    http.expectOne(`${url}/7/leida`).flush({ ...aviso, leida: true });
    fixture.detectChanges();
    expect(texto()).toContain('No tienes notificaciones sin leer.');
    fixture.nativeElement.querySelectorAll('.filtros button')[0].click();
    fixture.detectChanges();
    expect(tarjetas()).toHaveLength(1);
  });

  it('evita duplicar un marcado y no vuelve a enviar los avisos ya leídos', () => {
    cargar();
    page.marcarLeida(aviso);
    page.marcarLeida(aviso);
    http.expectOne(`${url}/7/leida`).flush({ ...aviso, leida: true });
    page.marcarLeida(page.notificaciones[0]);
    http.expectNone(`${url}/7/leida`);
  });

  it('conserva el aviso sin leer y permite reintentar un error de guardado', () => {
    cargar();
    marcar();
    http.expectOne(`${url}/7/leida`).flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(page.notificaciones[0].leida).toBe(false);
    expect(texto()).toContain('No pudimos marcar');
    expect(fixture.nativeElement.querySelector('.marcar').disabled).toBe(false);
    marcar();
    http.expectOne(`${url}/7/leida`).flush({ ...aviso, leida: true });
    fixture.detectChanges();
    expect(page.errorMarcado).toBe('');
  });

  it('muestra el error de carga y reintenta desde la interfaz', () => {
    http.expectOne(url).flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(texto()).toContain('No pudimos cargar tus notificaciones');
    expect(texto()).not.toContain('No tienes notificaciones todavía.');
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    cargar();
    expect(tarjetas()).toHaveLength(1);
  });

  it('informa que la sesión no es válida cuando la consulta devuelve 401', () => {
    http.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(texto()).toContain('Tu sesión no es válida.');
    expect(fixture.nativeElement.querySelector('[role="alert"] a').getAttribute('href'))
      .toBe('/login');
  });

  it('informa un rechazo de sesión al marcar y conserva el estado', () => {
    cargar();
    marcar();
    http.expectOne(`${url}/7/leida`).flush({}, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(texto()).toContain('Tu sesión no es válida.');
    expect(page.notificaciones[0].leida).toBe(false);
  });

  it('permite actualizar cuando el aviso ya no está disponible', () => {
    cargar();
    marcar();
    http.expectOne(`${url}/7/leida`).flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(texto()).toContain('Actualiza la lista.');
    fixture.nativeElement.querySelector('.actualizar').click();
    cargar([]);
    expect(texto()).not.toContain('Actualiza la lista.');
    expect(tarjetas()).toHaveLength(0);
  });

  it('cancela consultas al salir y limpia los avisos al volver con otra sesión', () => {
    cargar();
    page.marcarLeida(aviso);
    const anterior = http.expectOne(`${url}/7/leida`);
    page.ionViewWillLeave();
    expect(anterior.cancelled).toBe(true);
    expect(page.notificaciones).toHaveLength(0);
    localStorage.setItem('pethub_token', 'otra-cuenta');
    page.ionViewWillEnter();
    const nueva = http.expectOne(url);
    expect(nueva.request.headers.get('Authorization')).toBe('Bearer otra-cuenta');
    expect(page.notificaciones).toHaveLength(0);
    nueva.flush([]);
    fixture.detectChanges();
    expect(texto()).toContain('No tienes notificaciones todavía.');
  });
});

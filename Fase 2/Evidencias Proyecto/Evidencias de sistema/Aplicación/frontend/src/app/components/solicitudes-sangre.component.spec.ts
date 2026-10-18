import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SolicitudesSangreComponent } from './solicitudes-sangre.component';
import { SolicitudSangre } from '../services/solicitud-sangre.service';

describe('SolicitudesSangreComponent — S3-HU09', () => {
  let fixture: ComponentFixture<SolicitudesSangreComponent>;
  let componente: SolicitudesSangreComponent;
  let http: HttpTestingController;
  const url = 'http://localhost:3000/api/solicitudes';
  const solicitud: SolicitudSangre = { id: 10, usuarioId: 2, especie: 'Gato', grupoSanguineo: 'A', urgencia: 'alta', estado: 'activa', createdAt: '2026-10-18T12:00:00.000Z' };

  beforeEach(async () => {
    localStorage.setItem('pethub_token', 'token-prueba');
    await TestBed.configureTestingModule({ imports: [SolicitudesSangreComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SolicitudesSangreComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });
  afterEach(() => { try { http.verify(); } finally { fixture?.destroy(); TestBed.resetTestingModule(); localStorage.clear(); } });
  function cargar(datos: SolicitudSangre[] = []) { const req = http.expectOne(url); expect(req.request.method).toBe('GET'); expect(req.request.headers.get('Authorization')).toBe('Bearer token-prueba'); req.flush(datos); fixture.detectChanges(); }
  async function completar(grupo = '  A  ') {
    const especie = fixture.nativeElement.querySelector('#especie-solicitud') as HTMLSelectElement;
    especie.value = 'Gato'; especie.dispatchEvent(new Event('change'));
    const campo = fixture.nativeElement.querySelector('#grupo-solicitud') as HTMLInputElement;
    campo.value = grupo; campo.dispatchEvent(new Event('input'));
    const urgencia = fixture.nativeElement.querySelector('#urgencia-solicitud') as HTMLSelectElement;
    urgencia.value = 'alta'; urgencia.dispatchEvent(new Event('change'));
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
  }
  async function enviar() { fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); fixture.detectChanges(); await fixture.whenStable(); }

  it('consulta con token y muestra activas y resueltas por separado', () => { cargar([solicitud, { ...solicitud, id: 11, estado: 'resuelta' }]); expect(componente.activas.map(s => s.id)).toEqual([10]); expect(componente.resueltas.map(s => s.id)).toEqual([11]); expect(fixture.nativeElement.querySelectorAll('.solicitud').length).toBe(2); });
  it('muestra los estados vacíos', () => { cargar(); expect(fixture.nativeElement.textContent).toContain('No tienes solicitudes activas.'); expect(fixture.nativeElement.textContent).toContain('No tienes solicitudes resueltas.'); });
  it('bloquea una publicación sin urgencia', async () => { cargar(); await enviar(); expect(fixture.nativeElement.textContent).toContain('Debes indicar el nivel de urgencia'); http.expectNone(r => r.method === 'POST'); });
  it('rechaza un grupo formado solo por espacios', async () => { cargar(); await completar('   '); await enviar(); expect(componente.errorPublicacion).toContain('grupo sanguíneo válido'); http.expectNone(r => r.method === 'POST'); });
  it('publica datos normalizados con token y muestra solo la respuesta confirmada', async () => { cargar(); await completar(); await enviar(); const req = http.expectOne(url); expect(req.request.method).toBe('POST'); expect(req.request.headers.get('Authorization')).toBe('Bearer token-prueba'); expect(req.request.body).toEqual({ especie: 'Gato', grupoSanguineo: 'A', urgencia: 'alta' }); expect(componente.solicitudes).toHaveLength(0); req.flush(solicitud, { status: 201, statusText: 'Created' }); fixture.detectChanges(); await fixture.whenStable(); expect(componente.activas).toHaveLength(1); expect(componente.grupoSanguineo).toBe(''); expect(fixture.nativeElement.textContent).toContain('Solicitud publicada correctamente.'); });
  it('evita publicaciones duplicadas durante el envío', async () => { cargar(); await completar(); await enviar(); await enviar(); http.expectOne(url).flush(solicitud); fixture.detectChanges(); });
  it('conserva el formulario y permite reintentar un guardado fallido', async () => { cargar(); await completar(); await enviar(); http.expectOne(url).flush({}, { status: 500, statusText: 'Server Error' }); fixture.detectChanges(); expect(componente.grupoSanguineo).toBe('  A  '); expect(componente.solicitudes).toHaveLength(0); expect(componente.errorPublicacion).toContain('Conservamos tus datos'); await enviar(); http.expectOne(url).flush(solicitud); fixture.detectChanges(); expect(componente.activas).toHaveLength(1); });
  it('resuelve con PUT autenticado y mueve la solicitud sin duplicarla', () => { cargar([solicitud]); (fixture.nativeElement.querySelector('.solicitud button') as HTMLButtonElement).click(); fixture.detectChanges(); const req = http.expectOne(url + '/10/resolver'); expect(req.request.method).toBe('PUT'); expect(req.request.headers.get('Authorization')).toBe('Bearer token-prueba'); expect(componente.activas).toHaveLength(1); req.flush({ ...solicitud, estado: 'resuelta' }); fixture.detectChanges(); expect(componente.activas).toHaveLength(0); expect(componente.resueltas).toHaveLength(1); expect(componente.solicitudes).toHaveLength(1); });
  it('conserva la solicitud activa cuando falla su resolución', () => { cargar([solicitud]); componente.resolver(solicitud); http.expectOne(url + '/10/resolver').flush({}, { status: 500, statusText: 'Server Error' }); fixture.detectChanges(); expect(componente.activas).toHaveLength(1); expect(componente.resolviendo.size).toBe(0); expect(componente.errorResolucion).toContain('No pudimos resolver'); });
  it('recarga el listado ante una resolución ya realizada', () => { cargar([solicitud]); componente.resolver(solicitud); http.expectOne(url + '/10/resolver').flush({}, { status: 409, statusText: 'Conflict' }); http.expectOne(url).flush([{ ...solicitud, estado: 'resuelta' }]); fixture.detectChanges(); expect(componente.activas).toHaveLength(0); expect(componente.resueltas).toHaveLength(1); });
  it('permite reintentar una carga fallida', () => { http.expectOne(url).flush({}, { status: 500, statusText: 'Server Error' }); fixture.detectChanges(); expect(componente.errorCarga).toContain('No pudimos cargar'); (fixture.nativeElement.querySelector('[role=alert] button') as HTMLButtonElement).click(); http.expectOne(url).flush([solicitud]); fixture.detectChanges(); expect(componente.errorCarga).toBe(''); expect(componente.activas).toHaveLength(1); });
  it('muestra aviso de sesión inválida en la carga', () => { http.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' }); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Tu sesión no es válida'); });
});

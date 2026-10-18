import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BuscarDonantesComponent } from './buscar-donantes.component';

describe('BuscarDonantesComponent — S3-HU10', () => {
 let fixture: ComponentFixture<BuscarDonantesComponent>;
 let componente: BuscarDonantesComponent;
 let http: HttpTestingController;
 const url = 'http://localhost:3000/api/donantes/buscar';
 const donante = { id: 3, mascota: 'Kuro', especie: 'Gato', raza: null, grupoSanguineo: 'A', comuna: 'Valparaíso' };
 beforeEach(async () => { localStorage.setItem('pethub_token', 'token-prueba'); await TestBed.configureTestingModule({ imports: [BuscarDonantesComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] }).compileComponents(); http = TestBed.inject(HttpTestingController); fixture = TestBed.createComponent(BuscarDonantesComponent); componente = fixture.componentInstance; fixture.detectChanges(); await fixture.whenStable(); });
 afterEach(() => { try { http.verify(); } finally { fixture?.destroy(); TestBed.resetTestingModule(); localStorage.clear(); } });
 async function completar(grupo = '  A  ', comuna = '') { componente.especie = 'Gato'; componente.grupoSanguineo = grupo; componente.comuna = comuna; fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); }
 async function enviar() { fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); fixture.detectChanges(); await fixture.whenStable(); }
 function solicitud() { return http.expectOne(r => r.url === url); }
 it('no consulta antes de enviar el formulario', () => { http.expectNone(r => r.url === url); expect(fixture.nativeElement.textContent).toContain('Completa los datos'); });
 it('bloquea la búsqueda sin datos', async () => { await enviar(); expect(componente.error).toContain('Selecciona la especie'); http.expectNone(r => r.url === url); });
 it('rechaza un grupo compuesto solo por espacios', async () => { await completar('   '); await enviar(); expect(componente.error).toContain('grupo sanguíneo válido'); http.expectNone(r => r.url === url); });
 it('consulta con token y parámetros normalizados y muestra los datos', async () => { await completar('  A  ', 'Valparaíso'); await enviar(); const req = solicitud(); expect(req.request.method).toBe('GET'); expect(req.request.headers.get('Authorization')).toBe('Bearer token-prueba'); expect(req.request.params.get('especie')).toBe('Gato'); expect(req.request.params.get('grupoSanguineo')).toBe('A'); expect(req.request.params.get('comuna')).toBe('Valparaíso'); expect(componente.buscando).toBe(true); req.flush({ donantes: [donante] }); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Kuro'); expect(fixture.nativeElement.textContent).toContain('Valparaíso'); expect(fixture.nativeElement.textContent).toContain('Sin especificar'); expect(componente.buscando).toBe(false); });
 it('conserva la prioridad de comuna enviada por el servidor', async () => { await completar('A', 'Valparaíso'); await enviar(); solicitud().flush({ donantes: [donante, { ...donante, id: 4, mascota: 'Luna', comuna: 'Viña del Mar' }] }); fixture.detectChanges(); const nombres = Array.from(fixture.nativeElement.querySelectorAll('.tarjeta h3')).map(e => (e as HTMLElement).textContent?.trim()); expect(nombres).toEqual(['Kuro', 'Luna']); });
 it('muestra el mensaje cuando no hay resultados', async () => { await completar(); await enviar(); solicitud().flush({ donantes: [] }); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('No se encontraron donantes compatibles en este momento'); expect(fixture.nativeElement.querySelectorAll('.tarjeta').length).toBe(0); });
 it('evita búsquedas duplicadas mientras espera la respuesta', async () => { await completar(); await enviar(); await enviar(); solicitud().flush({ donantes: [] }); fixture.detectChanges(); });
 it('limpia resultados anteriores y permite reintentar tras un error', async () => { await completar(); await enviar(); solicitud().flush({ donantes: [donante] }); fixture.detectChanges(); await enviar(); expect(componente.donantes).toHaveLength(0); solicitud().flush({}, { status: 500, statusText: 'Server Error' }); fixture.detectChanges(); expect(componente.busquedaRealizada).toBe(false); expect(componente.error).toContain('No pudimos buscar'); await enviar(); solicitud().flush({ donantes: [donante] }); fixture.detectChanges(); expect(componente.error).toBe(''); expect(componente.donantes).toHaveLength(1); });
 it('informa cuando la sesión no es válida', async () => { await completar(); await enviar(); solicitud().flush({}, { status: 401, statusText: 'Unauthorized' }); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Tu sesión no es válida'); });
});

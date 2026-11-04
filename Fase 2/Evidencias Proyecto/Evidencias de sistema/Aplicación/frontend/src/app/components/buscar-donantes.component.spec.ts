import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
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
 it('abre o recupera el contacto con el id de donante y evita duplicados', async () => {
   const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
   componente.contactar(3); componente.contactar(3);
   const req = http.expectOne('http://localhost:3000/api/conversaciones');
   expect(req.request.body).toEqual({ donanteId: 3 });
   expect(req.request.headers.get('Authorization')).toBe('Bearer token-prueba');
   req.flush({ id: 4, aviso: 'Evaluación veterinaria presencial' });
   await fixture.whenStable();
   expect(navegar).toHaveBeenCalledWith(['/conversaciones', 4]);
   expect(componente.contactando).toBeNull();
 });
 it('informa cuando el donante ya no está disponible y permite reintentar', () => {
   componente.contactar(3);
   http.expectOne('http://localhost:3000/api/conversaciones').flush({}, { status: 404, statusText: 'Not Found' });
   expect(componente.errorContacto).toContain('ya no está disponible');
   expect(componente.contactando).toBeNull();
 });

 it('reabre una conversación existente devuelta por el backend con HTTP 200', async () => {
   const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
   componente.contactar(3);
   http.expectOne('http://localhost:3000/api/conversaciones').flush(
     { id: 4, aviso: 'Evaluación veterinaria presencial' },
     { status: 200, statusText: 'OK' }
   );
   await fixture.whenStable();
   expect(navegar).toHaveBeenCalledWith(['/conversaciones', 4]);
 });
 it('no navega cuando el backend rechaza contactar a la propia mascota', () => {
   const navegar = vi.spyOn(TestBed.inject(Router), 'navigate');
   componente.contactar(3);
   http.expectOne('http://localhost:3000/api/conversaciones').flush({}, { status: 400, statusText: 'Bad Request' });
   expect(navegar).not.toHaveBeenCalled();
   expect(componente.errorContacto).toContain('propia mascota');
 });
 it('informa que la sesión caducó al intentar contactar', () => {
   componente.contactar(3);
   http.expectOne('http://localhost:3000/api/conversaciones').flush({}, { status: 401, statusText: 'Unauthorized' });
   expect(componente.errorContacto).toContain('Vuelve a iniciar sesión');
   expect(componente.contactando).toBeNull();
 });
 it('permite recuperar la conversación si falla la navegación', async () => {
   vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(false);
   componente.contactar(3);
   http.expectOne('http://localhost:3000/api/conversaciones').flush({ id: 4 });
   await fixture.whenStable();
   expect(componente.errorContacto).toContain('Mis conversaciones');
   expect(componente.contactando).toBeNull();
 });

});

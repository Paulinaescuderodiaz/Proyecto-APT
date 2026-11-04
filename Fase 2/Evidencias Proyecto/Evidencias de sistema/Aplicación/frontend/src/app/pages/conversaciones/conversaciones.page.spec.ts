import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConversacionesPage } from './conversaciones.page';

describe('Contacto web — HU12 / aviso HU13', () => {
  let fixture: ComponentFixture<ConversacionesPage>;
  let pagina: ConversacionesPage;
  let http: HttpTestingController;
  let parametros: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  const url = 'http://localhost:3000/api/conversaciones';
  const aviso = 'La aptitud médica para donar debe ser validada siempre por un veterinario de forma presencial.';
  beforeEach(async () => {
    localStorage.setItem('pethub_token', 'sesion');
    parametros = new BehaviorSubject(convertToParamMap({ id: '4' }));
    await TestBed.configureTestingModule({
      imports: [ConversacionesPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: parametros } }],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ConversacionesPage);
    pagina = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => { http.verify(); fixture.destroy(); TestBed.resetTestingModule(); });
  function abrir() {
    const consulta = http.expectOne(`${url}/4`);
    expect(consulta.request.headers.get('Authorization')).toBe('Bearer sesion');
    consulta.flush({ id: 4, con: { id: 8, nombre: 'Evelyn' }, aviso });
    http.expectOne(`${url}/4/mensajes`).flush([]);
    fixture.detectChanges();
  }
  it('muestra el aviso presencial al abrir una conversación existente', () => {
    abrir();
    expect(fixture.nativeElement.textContent).toContain(aviso);
    expect(fixture.nativeElement.textContent).toContain('Evelyn');
    expect(fixture.nativeElement.querySelector('[name="aptaParaDonar"]')).toBeNull();
  });
  it('envía texto normalizado sin duplicar y espera confirmación', () => {
    abrir(); pagina.texto = ' Hola '; pagina.enviar(); pagina.enviar();
    const req = http.expectOne(`${url}/4/mensajes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ texto: 'Hola' });
    expect(pagina.mensajes).toHaveLength(0);
    req.flush({ id: 1, texto: 'Hola', esMio: true, createdAt: '2026-11-03' });
    expect(pagina.mensajes).toHaveLength(1);
    expect(pagina.texto).toBe('');
  });
  it('bloquea mensajes vacíos y demasiado largos', () => {
    abrir(); pagina.texto = '   '; pagina.enviar();
    pagina.texto = 'a'.repeat(1001); pagina.enviar();
    http.expectNone(`${url}/4/mensajes`);
    expect(pagina.error).toContain('1000');
  });
  it('conserva el borrador si no se confirma el envío', () => {
    abrir(); pagina.texto = 'Necesito coordinar'; pagina.enviar();
    http.expectOne(`${url}/4/mensajes`).flush({}, { status: 500, statusText: 'Error' });
    expect(pagina.texto).toBe('Necesito coordinar');
    expect(pagina.enviando).toBe(false);
    expect(pagina.error).toContain('antes de reintentar');
    expect(pagina.mensajes).toHaveLength(0);
  });
  it('actualiza mensajes conservando el borrador y renderiza texto sin HTML', () => {
    abrir(); pagina.texto = 'Borrador'; pagina.actualizar();
    http.expectOne(`${url}/4/mensajes`).flush([{ id: 1, texto: '<script>peligro</script>', esMio: false, createdAt: '2026-11-03' }]);
    fixture.detectChanges();
    expect(pagina.texto).toBe('Borrador');
    expect(fixture.nativeElement.textContent).toContain('<script>peligro</script>');
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
  });
  it('no muestra una conversación ajena o inexistente', () => {
    http.expectOne(`${url}/4`).flush({}, { status: 404, statusText: 'Not Found' });
    expect(pagina.seleccionada).toBeNull();
    expect(pagina.error).toContain('sin acceso');
    // forkJoin cancela la segunda consulta si la primera falla.
    http.match(`${url}/4/mensajes`);
  });
  it('rechaza un id inválido sin consultar otra conversación', () => {
    abrir(); parametros.next(convertToParamMap({ id: 'abc' }));
    expect(pagina.seleccionada).toBeNull(); expect(pagina.mensajes).toEqual([]);
    expect(pagina.error).toBe('Conversación inválida.');
    http.expectNone(`${url}/abc`);
  });
  it('lista conversaciones al entrar sin id y permite abrirlas', () => {
    abrir(); parametros.next(convertToParamMap({}));
    http.expectOne(url).flush([{ id: 4, con: { id: 8, nombre: 'Evelyn' }, ultimoMensaje: 'Hola' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/conversaciones/4"]')).not.toBeNull();
    expect(pagina.seleccionada).toBeNull();
  });
});

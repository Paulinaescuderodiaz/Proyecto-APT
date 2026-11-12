import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NgForm } from '@angular/forms';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { PerfilPage } from './perfil.page';

describe('Perfil: consulta y edición persistida', () => {
  const url = 'http://localhost:3000/api/auth/perfil';
  const ana = { id: 1, nombre: 'Ana Demo', email: 'ana.demo@example.com', telefono: null, comuna: 'Viña del Mar' };
  let http: HttpTestingController;
  beforeEach(async () => {
    localStorage.setItem('pethub_token', 'token-ana');
    await TestBed.configureTestingModule({ imports: [PerfilPage], providers: [
      provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
    ] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.clear(); TestBed.resetTestingModule(); });
  function abrir() {
    const fixture = TestBed.createComponent(PerfilPage); fixture.detectChanges();
    const req = http.expectOne(url);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-ana');
    req.flush(ana); fixture.detectChanges(); return fixture;
  }
  it('muestra datos de la API en la primera apertura', () => {
    const f = abrir(); expect(f.nativeElement.textContent).toContain(ana.nombre);
    expect(f.nativeElement.textContent).toContain(ana.email);
    expect(JSON.parse(localStorage.getItem('pethub_usuario')!).comuna).toBe('Viña del Mar');
  });
  it('guarda con PUT, actualiza la sesión y vuelve a consultar al entrar', async () => {
    const f = abrir(); const c = f.componentInstance; c.editar(); f.detectChanges(); await f.whenStable();
    c.datos = { nombre: ' Ana Editada ', telefono: ' 912345678 ', comuna: ' Quilpué ' };
    c.guardar({ invalid: false } as NgForm);
    const req = http.expectOne(url); expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nombre: 'Ana Editada', telefono: '912345678', comuna: 'Quilpué' });
    const editada = { ...ana, ...req.request.body }; req.flush(editada); f.detectChanges();
    expect(c.editando()).toBe(false); expect(c.nombre()).toBe('Ana Editada');
    expect(JSON.parse(localStorage.getItem('pethub_usuario')!).nombre).toBe('Ana Editada');
    c.ionViewWillEnter(); http.expectOne(url).flush(editada); f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Quilpué');
  });
  it('conserva el formulario si falla el servidor', () => {
    const f = abrir(); const c = f.componentInstance; c.editar(); c.datos.nombre = 'Ana nueva';
    c.guardar({ invalid: false } as NgForm);
    http.expectOne(url).flush({}, { status: 500, statusText: 'Error' });
    expect(c.editando()).toBe(true); expect(c.datos.nombre).toBe('Ana nueva');
    expect(c.error()).toContain('reintentar'); expect(c.guardando()).toBe(false);
  });
  it('descarta ediciones al cancelar', () => {
    const c = abrir().componentInstance; c.editar(); c.datos.nombre = 'Descartar'; c.cancelar();
    c.editar(); expect(c.datos.nombre).toBe(ana.nombre); http.expectNone(r => r.method === 'PUT');
  });
  it('no muestra el perfil anterior si la siguiente carga falla', () => {
    const c = abrir().componentInstance; c.ionViewWillEnter();
    http.expectOne(url).flush({}, {status: 500, statusText: 'Error'});
    expect(c.nombre()).toBe(''); expect(c.correo()).toBe(''); expect(c.error()).toContain('cargar');
  });
  it('cancela solicitudes al salir para evitar respuestas de otra sesión', () => {
    const f = TestBed.createComponent(PerfilPage); f.detectChanges();
    const req = http.expectOne(url); f.componentInstance.ionViewWillLeave(); expect(req.cancelled).toBe(true);
  });
});

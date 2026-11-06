import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { PerfilPage } from './perfil.page';
import { AuthService } from '../../services/auth.service';

describe('Perfil: datos visibles de la sesión', () => {
  let usuario = { nombre: 'Ana Demo', email: 'ana.demo@example.com' };
  beforeEach(async () => {
    usuario = { nombre: 'Ana Demo', email: 'ana.demo@example.com' };
    await TestBed.configureTestingModule({
      imports: [PerfilPage], providers: [provideRouter([]), {
        provide: AuthService, useValue: {
          estaAutenticado: () => true, obtenerUsuario: () => usuario, logout: () => {},
        },
      }],
    }).compileComponents();
  });
  it('muestra nombre y correo en la primera apertura', async () => {
    const fixture = TestBed.createComponent(PerfilPage);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Ana Demo');
    expect(fixture.nativeElement.textContent).toContain('ana.demo@example.com');
    expect(fixture.nativeElement.textContent).not.toContain('Sin información');
  });
  it('actualiza la vista al volver con otra sesión sin un clic adicional', async () => {
    const fixture = TestBed.createComponent(PerfilPage);
    fixture.detectChanges(); await fixture.whenStable();
    usuario = { nombre: 'Mateo Demo', email: 'mateo.demo@example.com' };
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Mateo Demo');
    expect(fixture.nativeElement.textContent).toContain('mateo.demo@example.com');
    expect(fixture.nativeElement.textContent).not.toContain('Ana Demo');
  });
});

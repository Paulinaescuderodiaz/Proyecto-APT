import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MascotasPage } from './mascotas.page';

// Prueba básica de creación del componente; no comprueba el flujo completo de la pantalla.
describe('MascotasPage', () => {
  let component: MascotasPage;
  let fixture: ComponentFixture<MascotasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MascotasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

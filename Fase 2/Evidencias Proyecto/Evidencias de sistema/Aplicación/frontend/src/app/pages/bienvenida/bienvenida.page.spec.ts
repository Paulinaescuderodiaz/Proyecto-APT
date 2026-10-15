import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BienvenidaPage } from './bienvenida.page';

// Prueba básica de creación del componente; no comprueba el flujo completo de la pantalla.
describe('BienvenidaPage', () => {
  let component: BienvenidaPage;
  let fixture: ComponentFixture<BienvenidaPage>;

  beforeEach(async () => {
    // La página usa un RouterLink, así que la prueba necesita un router simulado
    // (vacío basta) para poder resolver ActivatedRoute. Sin esto, "should create" fallaba.
    await TestBed.configureTestingModule({
      imports: [BienvenidaPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BienvenidaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

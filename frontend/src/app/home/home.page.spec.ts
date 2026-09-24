import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { HomePage } from './home.page';
import { MascotaService } from '../services/mascota.service';

// Comprueba que Inicio se puede crear con sus dependencias configuradas.
describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        // Proporciona el router requerido por los enlaces de la pantalla.
        provideRouter([]),

        // Simula el listado sin llamar al backend real.
        {
          provide: MascotaService,
          useValue: {
            listar: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea la pantalla de inicio', () => {
    expect(component).toBeTruthy();
  });
});
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { MascotasPage } from './mascotas.page';
import { MascotaService } from '../../services/mascota.service';

// Comprueba que la pantalla de mascotas se puede crear.
describe('MascotasPage', () => {
  let component: MascotasPage;
  let fixture: ComponentFixture<MascotasPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MascotasPage],
      providers: [
        // Proporciona ActivatedRoute y las dependencias de RouterLink.
        provideRouter([]),

        // ngOnInit consulta las mascotas; respondemos con una lista vacía.
        {
          provide: MascotaService,
          useValue: {
            listar: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MascotasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea la pantalla de mascotas', () => {
    expect(component).toBeTruthy();
  });
});
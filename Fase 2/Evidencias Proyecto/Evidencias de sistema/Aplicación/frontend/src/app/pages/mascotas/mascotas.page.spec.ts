import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { DonanteComponent } from '../../components/donante.component';
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
        provideHttpClient(),

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

  it('mantiene el donante y el aviso de la API al cargar y reabrir una mascota', async () => {
    const donante = { id: 3, mascotaId: 7, grupoSanguineo: 'A', estado: 'activo' as const, createdAt: '2026-11-02' };
    const aviso = 'Validación veterinaria presencial obligatoria';
    const servicio = TestBed.inject(MascotaService);
    servicio.listar = () => of([{
      id: 7, nombre: 'Kali', especie: 'Gato', raza: null, foto: null,
      usuarioId: 1, createdAt: '2026-11-02', donante, aviso,
    }]);
    component.cargarMascotas();
    fixture.nativeElement.querySelector('.tarjeta').click();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    let panel = fixture.debugElement.query(By.directive(DonanteComponent)).componentInstance;
    expect(panel.registro).toEqual(donante);
    expect(panel.avisoVeterinario).toBe(aviso);
    fixture.nativeElement.querySelector('.volver').click();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.tarjeta').click();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    panel = fixture.debugElement.query(By.directive(DonanteComponent)).componentInstance;
    expect(panel.registro).toEqual(donante);
    expect(fixture.nativeElement.textContent).toContain(aviso);
  });

  it('crea la pantalla de mascotas', () => {
    expect(component).toBeTruthy();
  });
});
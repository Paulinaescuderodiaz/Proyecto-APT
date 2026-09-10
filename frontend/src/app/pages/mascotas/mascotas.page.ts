import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { IonContent } from '@ionic/angular';
import { MascotaService } from '../../services/mascota.service';

interface Mascota {
  id: number;
  nombre: string;
  especie: string;
  raza: string;
  foto?: string;
}

@Component({
  selector: 'app-mascotas',
  standalone: true,
  templateUrl: './mascotas.page.html',
  styleUrls: ['./mascotas.page.scss'],
  imports: [IonContent, FormsModule],
})
export class MascotasPage implements OnInit {
  mascotas: Mascota[] = [];
  mostrarFormulario = false;

  nombre = '';
  especie = '';
  raza = '';

  mascotaSeleccionada: Mascota | null = null;

  foto = '';
  errorFoto = '';
  cargandoFoto = false;

  editandoId: number | null = null;

  constructor(
    private mascotaService: MascotaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarMascotas();
  }

  ionViewWillEnter(): void {
    this.cargarMascotas();
  }

  cargarMascotas(): void {
    this.mascotaService.listar().subscribe({
      next: (mascotasBackend) => {
        this.mascotas = mascotasBackend.map((m) => ({
          id: m.id,
          nombre: m.nombre,
          especie: m.especie,
          raza: m.raza ?? '',
          foto: m.foto ?? '',
        }));
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar las mascotas', error);
      },
    });
  }

  async seleccionarFoto(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) return;

    this.errorFoto = '';

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
      this.errorFoto = 'Selecciona una imagen JPG, PNG o WebP.';
      input.value = '';
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      this.errorFoto = 'La imagen debe pesar como máximo 5 MB.';
      input.value = '';
      return;
    }

    this.cargandoFoto = true;

    try {
      const imagen = await new Promise<string>((resolve, reject) => {
        const lector = new FileReader();

        lector.onload = () => resolve(lector.result as string);
        lector.onerror = () => reject(new Error('No se pudo leer la imagen'));
        lector.readAsDataURL(archivo);
      });

      this.foto = imagen;
    } catch {
      this.errorFoto = 'No pudimos cargar la foto. Intenta con otra imagen.';
    } finally {
      this.cargandoFoto = false;
      input.value = '';
    }
  }

  verDetalle(mascota: Mascota): void {
    this.mascotaSeleccionada = mascota;
  }

  volverAlListado(): void {
    this.mascotaSeleccionada = null;
  }

  abrirFormulario(): void {
    this.editandoId = null;
    this.nombre = '';
    this.especie = '';
    this.raza = '';
    this.mascotaSeleccionada = null;
    this.mostrarFormulario = true;
    this.foto = '';
    this.errorFoto = '';
  }

  agregar(formulario: NgForm): void {
    if (this.cargandoFoto) return;
    if (
      formulario.invalid ||
      !this.nombre.trim() ||
      !['Perro', 'Gato'].includes(this.especie)
    ) {
      formulario.control.markAllAsTouched();
      return;
    }

    const datos = {
      nombre: this.nombre.trim(),
      especie: this.especie,
      raza: this.raza.trim(),
      foto: this.foto,
    };

    if (this.editandoId !== null) {
      this.mascotaService.actualizar(this.editandoId, datos).subscribe({
        next: (mascotaActualizada) => {
          const actualizada: Mascota = {
            id: mascotaActualizada.id,
            nombre: mascotaActualizada.nombre,
            especie: mascotaActualizada.especie,
            raza: mascotaActualizada.raza ?? '',
            foto: mascotaActualizada.foto ?? '',
          };

          this.mascotas = this.mascotas.map(mascota =>
            mascota.id === this.editandoId ? actualizada : mascota
          );

          this.editandoId = null;
          this.mostrarFormulario = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al actualizar la mascota', error);
        },
      });
    } else {
      this.mascotaService.crear(datos).subscribe({
        next: (mascotaCreada) => {
          this.mascotas = [
            ...this.mascotas,
            {
              id: mascotaCreada.id,
              nombre: mascotaCreada.nombre,
              especie: mascotaCreada.especie,
              raza: mascotaCreada.raza ?? '',
              foto: mascotaCreada.foto ?? '',
            },
          ];
          this.mostrarFormulario = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al crear la mascota', error);
        },
      });
    }
  }

  editarMascota(mascota: Mascota): void {
    this.editandoId = mascota.id;
    this.nombre = mascota.nombre;
    this.especie = mascota.especie;
    this.raza = mascota.raza;

    this.mascotaSeleccionada = null;
    this.mostrarFormulario = true;
    this.foto = mascota.foto ?? '';
    this.errorFoto = '';
  }

  cancelarFormulario(): void {
    if (this.editandoId !== null) {
      this.mascotaSeleccionada =
        this.mascotas.find(m => m.id === this.editandoId) ?? null;
    }

    this.editandoId = null;
    this.mostrarFormulario = false;
  }
}

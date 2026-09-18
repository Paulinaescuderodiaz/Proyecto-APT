import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { IonContent } from '@ionic/angular';
import { MascotaService } from '../../services/mascota.service';

// Modelo de la vista: los valores null de la API se convierten en cadenas vacías al cargar.
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
  // Estado de pantalla: colección obtenida de la API y visibilidad del formulario.
  mascotas: Mascota[] = [];
  mostrarFormulario = false;

  nombre = '';
  especie = '';
  raza = '';

  // Una selección abre la ficha de detalle; null permite mostrar el listado o el formulario.
  mascotaSeleccionada: Mascota | null = null;

  // La foto se guarda como Data URL para previsualizarla y enviarla en el JSON.
  foto = '';
  errorFoto = '';
  cargandoFoto = false;

  // null significa alta nueva; un id indica que el formulario está editando una mascota existente.
  editandoId: number | null = null;

  constructor(
    private mascotaService: MascotaService,
    private cdr: ChangeDetectorRef
  ) {}

  // Carga inicial del componente.
  ngOnInit(): void {
    this.cargarMascotas();
  }

  // Refresca al entrar o regresar a esta vista. En la primera entrada también se ejecuta ngOnInit.
  ionViewWillEnter(): void {
    this.cargarMascotas();
  }

  // Recupera datos persistidos para reconstruir el listado, incluso después de recargar la página.
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

  // Valida tipo y tamaño antes de leer el archivo. El límite efectivo de este método es 5 MB.
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
        // Convierte el archivo en una cadena con tipo y contenido; todavía no envía la foto al servidor.
        lector.readAsDataURL(archivo);
      });

      this.foto = imagen;
    } catch {
      this.errorFoto = 'No pudimos cargar la foto. Intenta con otra imagen.';
    } finally {
      this.cargandoFoto = false;
      // Permite seleccionar de nuevo el mismo archivo después de terminar la lectura.
      input.value = '';
    }
  }

  // Abre la ficha usando los datos que ya están cargados.
  verDetalle(mascota: Mascota): void {
    this.mascotaSeleccionada = mascota;
  }

  // Cierra la ficha sin volver a consultar la API.
  volverAlListado(): void {
    this.mascotaSeleccionada = null;
  }

  // Inicia un alta con campos vacíos para no reutilizar datos de una edición anterior.
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

  // El mismo envío sirve para crear o editar; espera a que termine la lectura de la foto.
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

    // Normaliza espacios del nombre y la raza antes de enviar el formulario.
    const datos = {
      nombre: this.nombre.trim(),
      especie: this.especie,
      raza: this.raza.trim(),
      foto: this.foto,
    };

    // La edición reemplaza el elemento por id solo después de que el backend confirme el cambio.
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
      // En el alta se conserva el listado previo y se agrega la respuesta con el id asignado por el backend.
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

  // Copia los datos a los campos para editar sin alterar la ficha original antes de guardar.
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

  // Descarta los campos sin enviarlos; si era una edición, vuelve a la ficha del listado.
  cancelarFormulario(): void {
    if (this.editandoId !== null) {
      this.mascotaSeleccionada =
        this.mascotas.find(m => m.id === this.editandoId) ?? null;
    }

    this.editandoId = null;
    this.mostrarFormulario = false;
  }
}

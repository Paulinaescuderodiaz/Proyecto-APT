import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { IonContent } from '@ionic/angular';
import { MascotaService } from '../../services/mascota.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HistorialMedicoComponent } from '../../components/historial-medico.component';
import { VacunasComponent } from '../../components/vacunas.component';
import { Donante } from '../../services/donante.service';
import { DonanteComponent } from '../../components/donante.component';
// Modelo de la vista: los valores null de la API se convierten en cadenas vacías al cargar.
interface Mascota {
  id: number;
  nombre: string;
  especie: string;
  raza: string;
  fechaNacimiento?: string;
  sexo?: string;
  foto?: string;
  donante?: Donante | null;
  aviso?: string;
}

@Component({
  selector: 'app-mascotas',
  standalone: true,
  templateUrl: './mascotas.page.html',
  styleUrls: ['./mascotas.page.scss'],
  imports: [
    IonContent,
    FormsModule,
    RouterLink,
    HistorialMedicoComponent,
    VacunasComponent,
    DonanteComponent,
  ],

})
export class MascotasPage implements OnInit {
  // Estado de pantalla: colección obtenida de la API y visibilidad del formulario.
  mascotas: Mascota[] = [];
  mostrarFormulario = false;

  nombre = '';
  especie = '';
  raza = '';
  fechaNacimiento = '';
  sexo = '';
  errorGuardado = '';
  guardando = false;
  hoy = new Date().toISOString().slice(0, 10);

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
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) { }

  // Carga inicial del componente.
  ngOnInit(): void {
    this.cargarMascotas();
  }

  // Al entrar, restablece la vista y consulta las mascotas del usuario.
  ionViewWillEnter(): void {
    this.mascotaSeleccionada = null;
    this.mostrarFormulario = false;
    this.editandoId = null;
    this.cargarMascotas();
  }

  // Carga las mascotas y abre la ficha solicitada desde Inicio.
  cargarMascotas(): void {
    this.mascotaService.listar().subscribe({
      next: (mascotasBackend) => {
        this.mascotas = mascotasBackend.map((m) => ({
          id: m.id,
          nombre: m.nombre,
          especie: m.especie,
          raza: m.raza ?? '',
          fechaNacimiento: m.fechaNacimiento?.slice(0, 10) || '',
          sexo: m.sexo || '',
          foto: m.foto ?? '',
          donante: m.donante ?? null,
          aviso: m.aviso,
        }));

        // Ejemplo de URL: /mascotas?mascotaId=1.
        const parametro = this.route.snapshot.queryParamMap.get('mascotaId');
        const mascotaId = Number(parametro);

        // Busca únicamente entre las mascotas devueltas para este usuario.
        if (parametro && Number.isInteger(mascotaId) && mascotaId > 0) {
          this.mascotaSeleccionada =
            this.mascotas.find((mascota) => mascota.id === mascotaId) ?? null;
        }

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

  // Conserva la inscripción y el aviso al cerrar y reabrir la ficha.
  registrarDonante(donante: Donante): void {
    const mascota = this.mascotas.find(m => m.id === donante.mascotaId);
    if (mascota) {
      mascota.donante = donante;
      mascota.aviso = donante.aviso;
    }
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
    this.fechaNacimiento = ''; this.sexo = ''; this.errorGuardado = '';
    this.mascotaSeleccionada = null;
    this.mostrarFormulario = true;
    this.foto = '';
    this.errorFoto = '';
  }

  // El mismo envío sirve para crear o editar; espera a que termine la lectura de la foto.
  agregar(formulario: NgForm): void {
    if (this.cargandoFoto || this.guardando) return;
    if (
      formulario.invalid ||
      !this.nombre.trim() ||
      !['Perro', 'Gato'].includes(this.especie)
    ) {
      formulario.control.markAllAsTouched();
      return;
    }

    this.errorGuardado = '';
    if (this.fechaNacimiento && (!/^\d{4}-\d{2}-\d{2}$/.test(this.fechaNacimiento) || !Number.isFinite(Date.parse(this.fechaNacimiento)) || this.fechaNacimiento > this.hoy)) {
      this.errorGuardado = 'La fecha de nacimiento debe ser válida y no puede ser futura.'; return;
    }
    if (this.sexo && !['macho', 'hembra'].includes(this.sexo)) { this.errorGuardado = 'Selecciona macho o hembra.'; return; }
    this.guardando = true;
    // Normaliza espacios del nombre y la raza antes de enviar el formulario.
    const datos = {
      nombre: this.nombre.trim(),
      especie: this.especie,
      raza: this.raza.trim(),
      foto: this.foto,
      ...(this.editandoId !== null || this.fechaNacimiento ? { fechaNacimiento: this.fechaNacimiento || null } : {}),
      ...(this.editandoId !== null || this.sexo ? { sexo: this.sexo || null } : {}),
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
            fechaNacimiento: mascotaActualizada.fechaNacimiento?.slice(0, 10) || '',
            sexo: mascotaActualizada.sexo || '',
            foto: mascotaActualizada.foto ?? '',
            // La actualización de datos no devuelve la relación de donante.
            donante: this.mascotas.find(m => m.id === mascotaActualizada.id)?.donante,
            aviso: this.mascotas.find(m => m.id === mascotaActualizada.id)?.aviso,
          };

          this.mascotas = this.mascotas.map(mascota =>
            mascota.id === this.editandoId ? actualizada : mascota
          );

          this.editandoId = null;
          this.guardando = false;
          this.mostrarFormulario = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.guardando = false; this.errorGuardado = 'No pudimos guardar la mascota. Conservamos tus datos para reintentar.'; this.cdr.markForCheck();
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
              fechaNacimiento: mascotaCreada.fechaNacimiento?.slice(0, 10) || '',
              sexo: mascotaCreada.sexo || '',
              foto: mascotaCreada.foto ?? '',
            },
          ];
          this.guardando = false;
          this.mostrarFormulario = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.guardando = false; this.errorGuardado = 'No pudimos guardar la mascota. Conservamos tus datos para reintentar.'; this.cdr.markForCheck();
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
    this.fechaNacimiento = mascota.fechaNacimiento || ''; this.sexo = mascota.sexo || ''; this.errorGuardado = '';

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

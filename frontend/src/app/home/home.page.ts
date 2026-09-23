import { Component, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  pawOutline,
  waterOutline,
  peopleOutline,
  personOutline,
  heartOutline,
  addOutline,
  chatbubbleOutline,
  notificationsOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import {
  MascotaService,
  MascotaBackend,
} from '../services/mascota.service';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [IonContent, IonFooter, IonIcon, RouterLink],
})
export class HomePage {
  nombreUsuario = '';
  mascotas: MascotaBackend[] = [];
  cargando = false;
  mensaje = '';

  // Permite cancelar la consulta al abandonar la pantalla.
  private consulta?: Subscription;

  constructor(
    private mascotaService: MascotaService,
    private cdr: ChangeDetectorRef
  ) {
    // Registra los iconos utilizados en la página de Inicio.
    addIcons({
      homeOutline,
      pawOutline,
      waterOutline,
      peopleOutline,
      personOutline,
      heartOutline,
      addOutline,
      chatbubbleOutline,
      notificationsOutline,
    });
  }

  // Actualiza el saludo y las mascotas cada vez que se abre Inicio.
  ionViewWillEnter(): void {
    this.cargarNombre();
    this.cargarMascotas();
  }

  private cargarNombre(): void {
    // Recupera el nombre guardado al iniciar sesión.
    // Este dato se usa para el saludo; no autoriza solicitudes al backend.
    this.nombreUsuario = '';

    try {
      const usuario = JSON.parse(
        localStorage.getItem('pethub_usuario') || 'null'
      );

      if (typeof usuario?.nombre === 'string') {
        this.nombreUsuario = usuario.nombre.trim().split(/\s+/)[0];
      }
    } catch {
      // Si los datos guardados no son válidos, muestra un saludo general.
      this.nombreUsuario = '';
    }
  }

  cargarMascotas(): void {
    // Cancela una consulta anterior antes de comenzar otra.
    this.consulta?.unsubscribe();

    this.cargando = true;
    this.mensaje = '';
    this.mascotas = [];

    // El backend devuelve las mascotas pertenecientes al usuario.
    this.consulta = this.mascotaService.listar().subscribe({
      next: (mascotas) => {
        // Conserva todos los campos del modelo MascotaBackend.
        this.mascotas = mascotas;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.cargando = false;

        this.mensaje =
          error.status === 401
            ? 'Tu sesión no es válida. Vuelve a iniciar sesión.'
            : 'No pudimos cargar tus mascotas. Intenta nuevamente.';

        this.cdr.detectChanges();
      },
    });
  }

  ocultarFotoConError(mascota: MascotaBackend): void {
    // Si la imagen no carga, el HTML muestra una huella.
    mascota.foto = null;
  }

  ionViewWillLeave(): void {
    // Detiene la consulta cuando se abandona Inicio.
    this.consulta?.unsubscribe();
  }
}
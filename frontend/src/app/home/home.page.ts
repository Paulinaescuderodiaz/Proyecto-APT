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

  // Permite cancelar la consulta cuando el usuario abandona la pantalla.
  private consulta?: Subscription;

  constructor(
    private mascotaService: MascotaService,
    private cdr: ChangeDetectorRef
  ) {
    // Registra los iconos utilizados en el HTML.
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

  // Ionic conserva las páginas: actualizamos los datos en cada entrada.
  ionViewWillEnter(): void {
    this.cargarNombre();
    this.cargarMascotas();
  }

  private cargarNombre(): void {
    // El login guarda el usuario de la sesión en el almacenamiento local.
    // Este nombre sirve para el saludo; no autoriza el acceso a la API.
    this.nombreUsuario = '';

    try {
      const usuario = JSON.parse(
        localStorage.getItem('pethub_usuario') || 'null'
      );

      if (typeof usuario?.nombre === 'string') {
        this.nombreUsuario = usuario.nombre.trim().split(/\s+/)[0];
      }
    } catch {
      // Si el dato no es válido, el HTML muestra un saludo general.
      this.nombreUsuario = '';
    }
  }

  cargarMascotas(): void {
    this.consulta?.unsubscribe();
    this.cargando = true;
    this.mensaje = '';
    this.mascotas = [];

    // El servicio envía el token; el backend devuelve las mascotas del dueño.
    this.consulta = this.mascotaService.listar().subscribe({
      next: (mascotas) => {
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

        // Actualiza el aviso al recibir la respuesta de la API.
        this.cdr.detectChanges();
      },
    });
  }

  ocultarFotoConError(mascota: MascotaBackend): void {
    // Si una imagen falla, mostramos una huella como alternativa.
    mascota.foto = null;
  }

  ionViewWillLeave(): void {
    this.consulta?.unsubscribe();
  }
}
import {
  Component,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import { DatePipe } from '@angular/common';
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
import {
  RecordatorioService,
  RecordatorioPendiente,
} from '../services/recordatorio.service';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [IonContent, IonFooter, IonIcon, RouterLink, DatePipe],
})
export class HomePage implements OnDestroy {
  nombreUsuario = '';
  mascotas: MascotaBackend[] = [];
  cargando = false;
  mensaje = '';

  recordatorios: RecordatorioPendiente[] = [];
  cargandoRecordatorios = false;
  errorRecordatorios = '';

  private consulta?: Subscription;
  private consultaRecordatorios?: Subscription;

  private recordatoriosConsultados = false;
  private tokenSesion: string | null = null;
  private pantallaActiva = false;

  constructor(
    private mascotaService: MascotaService,
    private cdr: ChangeDetectorRef,
    private recordatorioService: RecordatorioService
  ) {
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

  ionViewWillEnter(): void {
    this.pantallaActiva = true;

    // Si cambió la sesión, no conserva avisos de la cuenta anterior.
    const tokenActual = localStorage.getItem('pethub_token');

    if (tokenActual !== this.tokenSesion) {
      this.consultaRecordatorios?.unsubscribe();
      this.tokenSesion = tokenActual;
      this.recordatorios = [];
      this.recordatoriosConsultados = false;
      this.cargandoRecordatorios = false;
      this.errorRecordatorios = '';
    }

    this.cargarNombre();
    this.cargarMascotas();
    this.cargarRecordatorios();
  }

  private cargarNombre(): void {
    this.nombreUsuario = '';

    try {
      const usuario = JSON.parse(
        localStorage.getItem('pethub_usuario') || 'null'
      );

      if (typeof usuario?.nombre === 'string') {
        this.nombreUsuario = usuario.nombre.trim().split(/\s+/)[0];
      }
    } catch {
      this.nombreUsuario = '';
    }
  }

  cargarMascotas(): void {
    this.consulta?.unsubscribe();
    this.cargando = true;
    this.mensaje = '';
    this.mascotas = [];

    this.consulta = this.mascotaService.listar().subscribe({
      next: (mascotas) => {
        this.mascotas = mascotas;
        this.cargando = false;
        this.actualizarVista();
      },
      error: (error) => {
        this.cargando = false;
        this.mensaje =
          error.status === 401
            ? 'Tu sesión no es válida. Vuelve a iniciar sesión.'
            : 'No pudimos cargar tus mascotas. Intenta nuevamente.';

        this.actualizarVista();
      },
    });
  }

  cargarRecordatorios(): void {
    // Conserva los avisos al volver desde una ficha.
    // No repite el GET que los marca como vistos en el backend.
    if (this.cargandoRecordatorios || this.recordatoriosConsultados) {
      return;
    }

    this.cargandoRecordatorios = true;
    this.errorRecordatorios = '';

    // Muestra el estado de carga antes de esperar la respuesta.
    this.actualizarVista();

    this.consultaRecordatorios = this.recordatorioService
      .listarPendientes()
      .subscribe({
        next: (recordatorios) => {
          this.recordatorios = recordatorios.filter(
            (recordatorio) => !recordatorio.vacuna.aplicada
          );

          this.recordatoriosConsultados = true;
          this.cargandoRecordatorios = false;
          this.actualizarVista();
        },
        error: (error) => {
          this.cargandoRecordatorios = false;
          this.errorRecordatorios =
            error.status === 401
              ? 'Tu sesión no es válida. Vuelve a iniciar sesión.'
              : 'No pudimos cargar los recordatorios. Intenta nuevamente.';

          this.actualizarVista();
        },
      });
  }

  nombreMascota(mascotaId: number): string {
    return (
      this.mascotas.find((mascota) => mascota.id === mascotaId)?.nombre
      ?? 'tu mascota'
    );
  }

  ocultarFotoConError(mascota: MascotaBackend): void {
    mascota.foto = null;
  }

  private actualizarVista(): void {
    if (this.pantallaActiva) {
      this.cdr.detectChanges();
    }
  }

  ionViewWillLeave(): void {
    this.pantallaActiva = false;
    this.consulta?.unsubscribe();

    // Deja terminar la consulta de recordatorios para conservar
    // su respuesta aunque el usuario abra otra pantalla.
  }

  ngOnDestroy(): void {
    this.pantallaActiva = false;
    this.consulta?.unsubscribe();
    this.consultaRecordatorios?.unsubscribe();
  }
}
import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Notificacion, NotificacionService } from '../../services/notificacion.service';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [IonContent, RouterLink, DatePipe],
  templateUrl: './notificaciones.page.html',
  styleUrls: ['./notificaciones.page.scss'],
})
export class NotificacionesPage implements OnDestroy {
  notificaciones: Notificacion[] = [];
  cargando = true;
  soloNoLeidas = false;
  errorCarga = '';
  errorMarcado = '';
  mensaje = '';
  guardando = new Set<number>();

  private consulta?: Subscription;
  private actualizaciones = new Subscription();

  constructor(
    private servicio: NotificacionService,
    private cdr: ChangeDetectorRef,
  ) {}

  // Ionic conserva las páginas: actualiza los datos al entrar, incluso tras cambiar de cuenta.
  ionViewWillEnter(): void {
    this.soloNoLeidas = false;
    this.cargar();
  }

  get visibles(): Notificacion[] {
    return this.soloNoLeidas
      ? this.notificaciones.filter((aviso) => !aviso.leida)
      : this.notificaciones;
  }

  get noLeidas(): number {
    return this.notificaciones.filter((aviso) => !aviso.leida).length;
  }

  cargar(): void {
    this.cancelarConsultas();
    this.actualizaciones = new Subscription();
    this.notificaciones = [];
    this.cargando = true;
    this.errorCarga = '';
    this.errorMarcado = '';
    this.mensaje = '';
    this.consulta = this.servicio.listar().subscribe({
      next: (avisos) => {
        // Conserva el orden del backend, de más reciente a más antiguo.
        this.notificaciones = avisos;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.cargando = false;
        this.errorCarga = this.errorDeSesion(error.status)
          || 'No pudimos cargar tus notificaciones. Intenta nuevamente.';
        this.cdr.detectChanges();
      },
    });
  }

  filtrar(soloNoLeidas: boolean): void {
    this.soloNoLeidas = soloNoLeidas;
    this.mensaje = '';
  }

  marcarLeida(aviso: Notificacion): void {
    if (aviso.leida || this.guardando.has(aviso.id) || this.cargando) return;
    this.guardando.add(aviso.id);
    this.errorMarcado = '';
    this.mensaje = '';
    this.actualizaciones.add(this.servicio.marcarLeida(aviso.id).subscribe({
      next: (actualizada) => {
        // Cambia el estado únicamente después de la confirmación del servidor.
        this.notificaciones = this.notificaciones.map((item) =>
          item.id === aviso.id ? actualizada : item);
        this.guardando.delete(aviso.id);
        this.mensaje = 'Notificación marcada como leída.';
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.guardando.delete(aviso.id);
        this.errorMarcado = this.errorDeSesion(error.status)
          || (error.status === 404
            ? 'La notificación ya no está disponible. Actualiza la lista.'
            : 'No pudimos marcar la notificación como leída. Intenta nuevamente.');
        this.cdr.detectChanges();
      },
    }));
  }

  private errorDeSesion(status: number): string {
    return status === 401 || status === 403
      ? 'Tu sesión no es válida. Vuelve a iniciar sesión.' : '';
  }

  private cancelarConsultas(): void {
    this.consulta?.unsubscribe();
    this.actualizaciones.unsubscribe();
    this.guardando.clear();
  }

  ionViewWillLeave(): void {
    this.cancelarConsultas();
    this.notificaciones = [];
  }

  ngOnDestroy(): void {
    this.cancelarConsultas();
  }
}

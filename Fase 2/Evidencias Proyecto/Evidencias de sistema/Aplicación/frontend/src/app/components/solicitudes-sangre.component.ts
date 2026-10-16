import {
    Component,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { Subscription } from 'rxjs';
import {
    SolicitudSangre,
    SolicitudSangreService,
} from '../services/solicitud-sangre.service';

@Component({
    selector: 'app-solicitudes-sangre',
    standalone: true,
    imports: [FormsModule, RouterLink, IonContent],
    template: `
    <ion-content>
      <main class="pagina">
        <a routerLink="/home">← Inicio</a>

        <h1>Solicitudes de sangre</h1>
        <p>Publica una solicitud y administra las que has creado.</p>

        <section class="panel" aria-labelledby="titulo-publicar">
          <h2 id="titulo-publicar">Publicar solicitud</h2>

          <form
            #formulario="ngForm"
            (ngSubmit)="publicar(formulario)"
            novalidate
          >
            <fieldset [disabled]="publicando">
              <legend>Datos de la solicitud</legend>

              <label for="especie-solicitud">Especie</label>
              <select
                id="especie-solicitud"
                name="especie"
                [(ngModel)]="especie"
                required
              >
                <option value="" disabled>Selecciona una especie</option>
                <option value="Perro">Perro</option>
                <option value="Gato">Gato</option>
              </select>

              <label for="grupo-solicitud">Grupo sanguíneo</label>
              <input
                id="grupo-solicitud"
                name="grupoSanguineo"
                [(ngModel)]="grupoSanguineo"
                required
                maxlength="40"
                aria-describedby="ayuda-grupo-solicitud"
              />
              <p id="ayuda-grupo-solicitud">
                Escríbelo tal como aparece en el examen veterinario.
              </p>

              <label for="urgencia-solicitud">Nivel de urgencia</label>
              <select
                id="urgencia-solicitud"
                name="urgencia"
                [(ngModel)]="urgencia"
                required
              >
                <option value="" disabled>Selecciona la urgencia</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>

              <button type="submit">
                {{ publicando ? 'Publicando…' : 'Publicar solicitud' }}
              </button>
            </fieldset>

            @if (errorPublicacion) {
              <p class="error" role="alert">{{ errorPublicacion }}</p>
            }

            @if (mensaje) {
              <p class="exito" role="status">{{ mensaje }}</p>
            }
          </form>
        </section>

        <section class="panel" aria-labelledby="titulo-mis-solicitudes">
          <h2 id="titulo-mis-solicitudes">Mis solicitudes</h2>

          @if (cargando) {
            <p role="status">Cargando solicitudes…</p>
          } @else if (errorCarga) {
            <div role="alert">
              <p class="error">{{ errorCarga }}</p>
              <button type="button" (click)="cargar()">Reintentar</button>
            </div>
          } @else {
            <h3>Activas</h3>

            @for (solicitud of activas; track solicitud.id) {
              <article class="solicitud">
                <h4>{{ solicitud.especie }} · {{ solicitud.grupoSanguineo }}</h4>
                <p>Urgencia: {{ solicitud.urgencia }}</p>
                <p>Estado: Activa</p>

                <button
                  type="button"
                  [disabled]="resolviendo.has(solicitud.id)"
                  (click)="resolver(solicitud)"
                >
                  {{
                    resolviendo.has(solicitud.id)
                      ? 'Guardando…'
                      : 'Marcar como resuelta'
                  }}
                </button>
              </article>
            } @empty {
              <p>No tienes solicitudes activas.</p>
            }

            <h3>Resueltas</h3>

            @for (solicitud of resueltas; track solicitud.id) {
              <article class="solicitud resuelta">
                <h4>{{ solicitud.especie }} · {{ solicitud.grupoSanguineo }}</h4>
                <p>Estado: Resuelta</p>
              </article>
            } @empty {
              <p>No tienes solicitudes resueltas.</p>
            }
          }

          @if (errorResolucion) {
            <p class="error" role="alert">{{ errorResolucion }}</p>
          }

          @if (mensajeResolucion) {
            <p class="exito" role="status">{{ mensajeResolucion }}</p>
          }
        </section>
      </main>
    </ion-content>
  `,
    styles: [`
    .pagina {
      max-width: 640px;
      margin: 0 auto;
      padding: 24px 16px 48px;
      color: #243c38;
    }

    a { color: #236b5d; }

    h1 { margin-top: 24px; }

    p { line-height: 1.5; }

    .panel {
      margin-top: 24px;
      padding: 24px;
      border: 1px solid #dce7e5;
      border-radius: 20px;
      background: #fff;
    }

    fieldset {
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }

    legend {
      margin-bottom: 16px;
      font-weight: 600;
    }

    label {
      display: block;
      margin: 16px 0 8px;
      font-weight: 600;
    }

    input, select {
      width: 100%;
      box-sizing: border-box;
      padding: 12px;
      border: 1px solid #849d97;
      border-radius: 10px;
      background: #fff;
      color: #243c38;
      font: inherit;
    }

    button {
      margin-top: 16px;
      padding: 12px 18px;
      border: 0;
      border-radius: 12px;
      background: #236b5d;
      color: #fff;
      font: inherit;
      cursor: pointer;
    }

    button:disabled,
    fieldset:disabled button {
      opacity: 0.65;
      cursor: wait;
    }

    button:focus-visible,
    input:focus-visible,
    select:focus-visible,
    a:focus-visible {
      outline: 3px solid #a96b00;
      outline-offset: 3px;
    }

    .solicitud {
      margin: 16px 0;
      padding: 16px;
      border: 1px solid #dce7e5;
      border-radius: 12px;
      background: #f3f8f7;
    }

    .solicitud h4 { margin-top: 0; }

    .resuelta { background: #edf7f2; }
    .error { color: #a32121; }
    .exito { color: #236b5d; }

    ion-content {
  --background: #faf8f5;
}
  `],
})
export class SolicitudesSangreComponent implements OnInit, OnDestroy {
    especie: '' | 'Perro' | 'Gato' = '';
    grupoSanguineo = '';
    urgencia: '' | 'alta' | 'media' | 'baja' = '';

    solicitudes: SolicitudSangre[] = [];

    cargando = false;
    publicando = false;
    resolviendo = new Set<number>();

    errorCarga = '';
    errorPublicacion = '';
    errorResolucion = '';
    mensaje = '';
    mensajeResolucion = '';

    private consultas = new Subscription();
    private consultaLista?: Subscription;

    constructor(
        private servicio: SolicitudSangreService,
        private cdr: ChangeDetectorRef
    ) { }

    get activas(): SolicitudSangre[] {
        return this.solicitudes.filter(s => s.estado === 'activa');
    }

    get resueltas(): SolicitudSangre[] {
        return this.solicitudes.filter(s => s.estado === 'resuelta');
    }

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.consultaLista?.unsubscribe();
        this.cargando = true;
        this.errorCarga = '';

        this.consultaLista = this.servicio.listarMisSolicitudes().subscribe({
            next: (solicitudes) => {
                this.solicitudes = solicitudes;
                this.cargando = false;
                this.cdr.detectChanges();
            },
            error: (error) => {
                this.cargando = false;
                this.errorCarga = error.status === 401
                    ? 'Tu sesión no es válida. Vuelve a iniciar sesión.'
                    : 'No pudimos cargar tus solicitudes.';
                this.cdr.detectChanges();
            },
        });
    }

    publicar(formulario: NgForm): void {
        if (this.publicando) return;

        this.errorPublicacion = '';
        this.mensaje = '';

        // Mensaje exigido por el escenario 2 de HU09.
        if (!this.urgencia) {
            this.errorPublicacion = 'Debes indicar el nivel de urgencia';
            formulario.control.markAllAsTouched();
            return;
        }

        const grupo = this.grupoSanguineo.trim();

        if (
            (this.especie !== 'Perro' && this.especie !== 'Gato') ||
            !grupo ||
            grupo.length > 40 ||
            formulario.invalid
        ) {
            this.errorPublicacion =
                'Selecciona la especie e ingresa un grupo sanguíneo válido.';
            formulario.control.markAllAsTouched();
            return;
        }

        this.publicando = true;

        const consulta = this.servicio.publicar({
            especie: this.especie,
            grupoSanguineo: grupo,
            urgencia: this.urgencia,
        }).subscribe({
            next: (solicitud) => {
                // Agrega únicamente la solicitud confirmada por el servidor.
                this.solicitudes = [
                    solicitud,
                    ...this.solicitudes.filter(s => s.id !== solicitud.id),
                ];

                this.publicando = false;
                formulario.resetForm({
                    especie: '',
                    grupoSanguineo: '',
                    urgencia: '',
                });

                this.mensaje = 'Solicitud publicada correctamente.';
                this.cdr.detectChanges();
            },
            error: (error) => {
                this.publicando = false;
                this.errorPublicacion = error.status === 401
                    ? 'Tu sesión no es válida. Vuelve a iniciar sesión.'
                    : 'No pudimos publicar. Conservamos tus datos para reintentar.';
                this.cdr.detectChanges();
            },
        });

        this.consultas.add(consulta);
    }

    resolver(solicitud: SolicitudSangre): void {
        if (
            solicitud.estado !== 'activa' ||
            this.resolviendo.has(solicitud.id)
        ) return;

        this.errorResolucion = '';
        this.mensajeResolucion = '';
        this.resolviendo.add(solicitud.id);

        const consulta = this.servicio.resolver(solicitud.id).subscribe({
            next: (actualizada) => {
                // Reemplaza el registro existente, sin duplicarlo.
                this.solicitudes = this.solicitudes.map(s =>
                    s.id === actualizada.id ? actualizada : s
                );

                this.resolviendo.delete(solicitud.id);
                this.mensajeResolucion = 'Solicitud marcada como resuelta.';
                this.cdr.detectChanges();
            },
            error: (error) => {
                this.resolviendo.delete(solicitud.id);

                this.errorResolucion = error.status === 401
                    ? 'Tu sesión no es válida. Vuelve a iniciar sesión.'
                    : error.status === 409
                        ? 'Esta solicitud ya estaba resuelta. Actualizaremos el listado.'
                        : 'No pudimos resolver la solicitud. Intenta nuevamente.';

                if (error.status === 409) this.cargar();

                this.cdr.detectChanges();
            },
        });

        this.consultas.add(consulta);
    }

    ngOnDestroy(): void {
        this.consultaLista?.unsubscribe();
        this.consultas.unsubscribe();
    }
}
import {
  Component,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { Subscription } from 'rxjs';
import {
  DonanteEncontrado,
  DonanteService,
} from '../services/donante.service';

@Component({
  selector: 'app-buscar-donantes',
  standalone: true,
  imports: [FormsModule, RouterLink, IonContent],
  template: `
    <ion-content>
      <main class="pagina">
        <a routerLink="/home">← Inicio</a>

        <h1>Buscar donantes</h1>
        <p>
          Busca por especie y grupo sanguíneo. Puedes indicar una comuna
          para ver primero los resultados de esa zona.
        </p>

        <section class="panel" aria-labelledby="titulo-busqueda">
          <h2 id="titulo-busqueda">Datos de búsqueda</h2>

          <form
            #formulario="ngForm"
            (ngSubmit)="buscar(formulario)"
            novalidate
          >
            <fieldset [disabled]="buscando">
              <legend>Selecciona los datos</legend>

              <label for="especie-busqueda">Especie</label>
              <select
                id="especie-busqueda"
                name="especie"
                [(ngModel)]="especie"
                required
              >
                <option value="" disabled>Selecciona una especie</option>
                <option value="Perro">Perro</option>
                <option value="Gato">Gato</option>
              </select>

              <label for="grupo-busqueda">Grupo sanguíneo</label>
              <input
                id="grupo-busqueda"
                name="grupoSanguineo"
                [(ngModel)]="grupoSanguineo"
                required
                maxlength="40"
                aria-describedby="ayuda-grupo"
              />
              <p id="ayuda-grupo">
                Escríbelo tal como aparece en el examen veterinario.
              </p>

              <label for="comuna-busqueda">Comuna (opcional)</label>
              <select
                id="comuna-busqueda"
                name="comuna"
                [(ngModel)]="comuna"
              >
                <option value="">Sin preferencia</option>
                @for (opcion of comunas; track opcion) {
                  <option [value]="opcion">{{ opcion }}</option>
                }
              </select>

              <button type="submit">
                {{ buscando ? 'Buscando…' : 'Buscar donantes' }}
              </button>
            </fieldset>
          </form>

          @if (error) {
            <p class="error" role="alert">{{ error }}</p>
          }
        </section>

        <section class="panel" aria-labelledby="titulo-resultados">
          <h2 id="titulo-resultados">Resultados</h2>

          @if (buscando) {
            <p role="status">Buscando donantes…</p>
          } @else if (busquedaRealizada) {
            <p role="status">
              {{
                donantes.length
                  ? 'Donantes encontrados: ' + donantes.length
                  : 'No se encontraron donantes compatibles en este momento'
              }}
            </p>

            @for (donante of donantes; track donante.id) {
              <article class="tarjeta">
                <h3>{{ donante.mascota }}</h3>
                <p><strong>Especie:</strong> {{ donante.especie }}</p>
                <p>
                  <strong>Raza:</strong>
                  {{ donante.raza || 'Sin especificar' }}
                </p>
                <p>
                  <strong>Grupo sanguíneo:</strong>
                  {{ donante.grupoSanguineo }}
                </p>
                <p>
                  <strong>Comuna:</strong>
                  {{ donante.comuna || 'Sin especificar' }}
                </p>
              </article>
            }

            <p class="nota">
              Los resultados coinciden con la especie y el grupo
              registrados. La compatibilidad y aptitud para donar deben
              confirmarse con el equipo veterinario.
            </p>
          } @else if (!error) {
            <p>Completa los datos para comenzar la búsqueda.</p>
          }
        </section>
      </main>
    </ion-content>
  `,
  styles: [`
    ion-content {
      --background: #faf8f5;
    }

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

    legend { font-weight: 600; }

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
      margin-top: 20px;
      padding: 12px 18px;
      border: 0;
      border-radius: 12px;
      background: #236b5d;
      color: #fff;
      font: inherit;
      cursor: pointer;
    }

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

    .tarjeta {
      margin-top: 16px;
      padding: 16px;
      border: 1px solid #dce7e5;
      border-radius: 12px;
      background: #f3f8f7;
    }

    .tarjeta h3 { margin-top: 0; }
    .error { color: #a32121; }
    .nota { font-size: 14px; }
  `],
})
export class BuscarDonantesComponent implements OnDestroy {
  especie = '';
  grupoSanguineo = '';
  comuna = '';

  comunas = [
    'Valparaíso',
    'Viña del Mar',
    'Quilpué',
    'Villa Alemana',
    'Concón',
    'Casablanca',
  ];

  donantes: DonanteEncontrado[] = [];
  buscando = false;
  busquedaRealizada = false;
  error = '';

  private consulta?: Subscription;

  constructor(
    private servicio: DonanteService,
    private cdr: ChangeDetectorRef
  ) {}

  buscar(formulario: NgForm): void {
    if (this.buscando) return;

    this.error = '';
    this.donantes = [];
    this.busquedaRealizada = false;

    const grupo = this.grupoSanguineo.trim();

    if (
      !['Perro', 'Gato'].includes(this.especie) ||
      !grupo ||
      grupo.length > 40 ||
      formulario.invalid
    ) {
      formulario.control.markAllAsTouched();
      this.error =
        'Selecciona la especie e ingresa un grupo sanguíneo válido.';
      return;
    }

    this.buscando = true;

    // Conserva el orden enviado por el backend, incluida la prioridad por comuna.
    this.consulta = this.servicio.buscar(
      this.especie,
      grupo,
      this.comuna
    ).subscribe({
      next: (respuesta) => {
        this.donantes = respuesta.donantes;
        this.buscando = false;
        this.busquedaRealizada = true;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.buscando = false;
        this.error = error.status === 401
          ? 'Tu sesión no es válida. Vuelve a iniciar sesión.'
          : 'No pudimos buscar donantes. Intenta nuevamente.';
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
  }
}
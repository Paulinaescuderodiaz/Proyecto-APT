import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Donante, DonanteService } from '../services/donante.service';

@Component({
  selector: 'app-donante',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="donante" aria-labelledby="titulo-donante">
      <h2 id="titulo-donante">Donante voluntario</h2>

      <p>Inscribe a {{ nombreMascota || 'tu mascota' }} en la red de donantes.</p>

      @if (registro; as datos) {
        <div class="resultado" role="status">
          <h3>Inscripción registrada</h3>
          <p>
            <strong>Mascota:</strong>
            {{ nombreMascota || 'Tu mascota' }}
          </p>
          <p>
            <strong>Grupo sanguíneo:</strong>
            {{ datos.grupoSanguineo || 'Desconocido' }}
          </p>
          <p>
            <strong>Estado:</strong>
            {{ datos.estado === 'activo' ? 'Activo' : 'Pendiente de tipificación' }}
          </p>
          <p>La inscripción se guardó correctamente.</p>
        </div>
      } @else {
        <form
          #formulario="ngForm"
          (ngSubmit)="inscribir(formulario)"
          novalidate
        >
          <fieldset [disabled]="guardando">
            <legend>Datos de inscripción</legend>

            <label class="opcion">
              <input
                type="checkbox"
                name="conoceGrupo"
                [(ngModel)]="conoceGrupo"
                (ngModelChange)="cambiarConocimiento()"
              />
              Conozco su grupo sanguíneo
            </label>

            @if (conoceGrupo) {
              <label for="grupo-donante">Grupo sanguíneo</label>
              <input
                id="grupo-donante"
                class="campo"
                name="grupoSanguineo"
                [(ngModel)]="grupoSanguineo"
                required
                maxlength="40"
                aria-describedby="ayuda-grupo"
              />
              <p id="ayuda-grupo">
                Escríbelo tal como aparece en su examen veterinario.
              </p>
            } @else {
              <p>
                Si desconoces su grupo, la inscripción quedará pendiente
                de tipificación.
              </p>
            }

            <label class="opcion">
              <input
                type="checkbox"
                name="acepta"
                [(ngModel)]="acepta"
                required
              />
              Quiero inscribir voluntariamente a mi mascota y declaro
              que cumple los requisitos para donar, sujetos a evaluación
              veterinaria.
            </label>

            <button type="submit">
              {{ guardando ? 'Inscribiendo…' : 'Inscribir como donante' }}
            </button>
          </fieldset>

          @if (error) {
            <p class="error" role="alert">{{ error }}</p>
          }
        </form>
      }

      <p class="nota">
        La inscripción no confirma que la mascota sea apta para donar.
        Esa evaluación corresponde al equipo veterinario.
      </p>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      margin: 24px 0;
    }

    .donante {
      padding: 24px;
      border: 1px solid #dce7e5;
      border-radius: 20px;
      background: #fff;
      color: #243c38;
    }

    h2 { margin-bottom: 8px; }
    p { line-height: 1.5; }

    fieldset {
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }

    legend {
      margin-top: 16px;
      font-weight: 600;
    }

    .opcion {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin: 20px 0;
      cursor: pointer;
    }

    .opcion input { margin-top: 4px; }

    .campo {
      display: block;
      width: 100%;
      box-sizing: border-box;
      margin-top: 8px;
      padding: 12px;
      border: 1px solid #849d97;
      border-radius: 10px;
      background: #fff;
      color: #243c38;
      font: inherit;
    }

    button {
      padding: 12px 18px;
      border: 0;
      border-radius: 12px;
      background: #236b5d;
      color: white;
      font: inherit;
      cursor: pointer;
    }

    fieldset:disabled button {
      opacity: 0.65;
      cursor: wait;
    }

    button:focus-visible,
    input:focus-visible {
      outline: 3px solid #a96b00;
      outline-offset: 3px;
    }

    .resultado {
      margin-top: 20px;
      padding: 16px;
      border-radius: 12px;
      background: #edf7f2;
    }

    .error { color: #a32121; }

    .nota {
      margin-top: 20px;
      font-size: 14px;
      color: #526660;
    }
  `],
})
export class DonanteComponent implements OnChanges, OnDestroy {
  @Input() mascotaId = 0;
  @Input() nombreMascota = '';

  conoceGrupo = false;
  grupoSanguineo = '';
  acepta = false;
  error = '';
  guardando = false;

  registro: Donante | null = null;
  private consulta?: Subscription;

  constructor(
    private donanteService: DonanteService,
    private cdr: ChangeDetectorRef
  ) {}

  // Limpia la vista si se selecciona otra mascota.
  ngOnChanges(): void {
    this.consulta?.unsubscribe();
    this.conoceGrupo = false;
    this.grupoSanguineo = '';
    this.acepta = false;
    this.error = '';
    this.guardando = false;
    this.registro = null;
  }

  cambiarConocimiento(): void {
    this.grupoSanguineo = '';
    this.error = '';
  }

  inscribir(formulario: NgForm): void {
    // Evita solicitudes repetidas mientras esperamos al servidor.
    if (this.guardando || this.registro) return;

    this.error = '';
    const grupo = this.grupoSanguineo.trim();

    if (!Number.isInteger(this.mascotaId) || this.mascotaId <= 0) {
      this.error = 'Abre la ficha de una mascota para inscribirla.';
      return;
    }

    if (this.conoceGrupo && (!grupo || grupo.length > 40)) {
      this.error =
        'Ingresa un grupo sanguíneo válido de hasta 40 caracteres.';
      formulario.control.markAllAsTouched();
      return;
    }

    if (!this.acepta) {
      this.error =
        'Confirma la inscripción y la declaración de requisitos.';
      formulario.control.markAllAsTouched();
      return;
    }

    if (formulario.invalid) {
      formulario.control.markAllAsTouched();
      this.error = 'Revisa los campos del formulario.';
      return;
    }

    this.guardando = true;

    this.consulta = this.donanteService.registrar({
      mascotaId: this.mascotaId,
      grupoSanguineo: this.conoceGrupo ? grupo : null,
      cumpleRequisitos: this.acepta,
    }).subscribe({
      next: (donante) => {
        // Usa la respuesta real para mostrar la inscripción confirmada.
        this.registro = donante;
        this.guardando = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.guardando = false;

        if (error.status === 401) {
          this.error = 'Tu sesión no es válida. Vuelve a iniciar sesión.';
        } else if (error.status === 409) {
          this.error = 'Esta mascota ya está registrada como donante.';
        } else if (error.status === 404) {
          this.error = 'No encontramos esta mascota en tu cuenta.';
        } else {
          this.error =
            'No pudimos registrar la inscripción. Conservamos tus datos para reintentar.';
        }

        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
  }
}
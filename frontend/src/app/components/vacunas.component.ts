import {
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { Vacuna, VacunaService } from '../services/vacuna.service';

// Evita guardar nombres formados únicamente por espacios.
function nombreValido(
  control: AbstractControl
): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim()
    ? null
    : { nombreVacio: true };
}

// Comprueba que sea una fecha real con formato AAAA-MM-DD.
function fechaValida(
  control: AbstractControl
): ValidationErrors | null {
  const valor = control.value;

  if (!valor) return null;

  if (typeof valor !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return { fechaInvalida: true };
  }

  const fecha = new Date(`${valor}T00:00:00.000Z`);

  return Number.isFinite(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
    ? null
    : { fechaInvalida: true };
}

// El refuerzo es opcional, pero debe ser posterior a la aplicación.
function ordenFechas(
  control: AbstractControl
): ValidationErrors | null {
  const aplicacion = control.get('fechaAplicacion')?.value;
  const refuerzo = control.get('fechaProximoRefuerzo')?.value;

  return aplicacion && refuerzo && refuerzo <= aplicacion
    ? { refuerzoNoPosterior: true }
    : null;
}

@Component({
  selector: 'app-vacunas',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <section class="panel" aria-labelledby="titulo-vacunas">
      <h2 id="titulo-vacunas">Vacunas</h2>
      <p>Registra las vacunas y sus próximas fechas de refuerzo.</p>

      @if (cargando) {
        <p role="status">Cargando vacunas…</p>
      } @else if (errorCarga) {
        <div role="alert" class="error">
          <p>{{ errorCarga }}</p>
          <button type="button" (click)="cargar()">Reintentar</button>
        </div>
      } @else {
        <div class="listado">
          @for (vacuna of vacunas; track vacuna.id) {
            <article class="vacuna">
              <h3>{{ vacuna.nombre }}</h3>

              <p>
                Aplicación:
                {{ vacuna.fechaAplicacion | date:'dd/MM/yyyy':'UTC' }}
              </p>

              @if (vacuna.fechaProximoRefuerzo) {
                <p>
                  Próximo refuerzo:
                  {{ vacuna.fechaProximoRefuerzo | date:'dd/MM/yyyy':'UTC' }}
                </p>
              } @else {
                <p>Sin fecha de refuerzo.</p>
              }

              <button
                type="button"
                [disabled]="guardando"
                (click)="editar(vacuna)"
              >
                Editar vacuna
              </button>
            </article>
          } @empty {
            <p>No hay vacunas registradas.</p>
          }
        </div>

        <h3>
          {{ editandoId === null ? 'Registrar vacuna' : 'Editar vacuna' }}
        </h3>

        <form [formGroup]="formulario" (ngSubmit)="guardar()" novalidate>
          <fieldset [disabled]="guardando">
            <label for="nombre-vacuna">Nombre de la vacuna</label>
            <input
              id="nombre-vacuna"
              formControlName="nombre"
              maxlength="100"
            />

            @if (
              formulario.controls.nombre.invalid &&
              formulario.controls.nombre.touched
            ) {
              <p class="error" role="alert">
                Ingresa un nombre válido de hasta 100 caracteres.
              </p>
            }

            <label for="fecha-aplicacion">Fecha de aplicación</label>
            <input
              id="fecha-aplicacion"
              type="date"
              formControlName="fechaAplicacion"
            />

            @if (
              formulario.controls.fechaAplicacion.invalid &&
              formulario.controls.fechaAplicacion.touched
            ) {
              <p class="error" role="alert">
                Ingresa una fecha de aplicación válida.
              </p>
            }

            <label for="fecha-refuerzo">
              Próximo refuerzo (opcional)
            </label>
            <input
              id="fecha-refuerzo"
              type="date"
              formControlName="fechaProximoRefuerzo"
            />

            @if (
              formulario.controls.fechaProximoRefuerzo.invalid &&
              formulario.controls.fechaProximoRefuerzo.touched
            ) {
              <p class="error" role="alert">
                Ingresa una fecha de refuerzo válida.
              </p>
            }

            @if (
              formulario.hasError('refuerzoNoPosterior') &&
              formulario.touched
            ) {
              <p class="error" role="alert">
                La fecha de refuerzo debe ser posterior a la fecha de aplicación.
              </p>
            }

            <div class="acciones">
              <button type="submit" class="primario">
                {{
                  guardando
                    ? 'Guardando…'
                    : editandoId === null
                      ? 'Registrar vacuna'
                      : 'Guardar cambios'
                }}
              </button>

              @if (editandoId !== null) {
                <button type="button" (click)="cancelar()">
                  Cancelar edición
                </button>
              }
            </div>
          </fieldset>
        </form>

        @if (errorGuardado) {
          <p class="error" role="alert">{{ errorGuardado }}</p>
        }

        @if (exito) {
          <p role="status">{{ exito }}</p>
        }
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
      margin-top: 24px;
    }

    .panel {
      padding: 22px;
      border: 1px solid #e4ded7;
      border-radius: 20px;
      background: #fff;
      color: #243b3d;
    }

    h2, h3 { margin-top: 0; }

    p { line-height: 1.5; }

    .vacuna {
      padding: 16px;
      margin: 16px 0;
      border-radius: 12px;
      background: #f3f8f7;
    }

    .listado { margin-bottom: 24px; }

    fieldset {
      border: 0;
      padding: 0;
      margin: 0;
      min-width: 0;
    }

    label {
      display: block;
      margin: 16px 0 8px;
    }

    input {
      width: 100%;
      box-sizing: border-box;
      padding: 12px;
      border: 1px solid #cbd7d5;
      border-radius: 10px;
      background: #fff;
      color: #243b3d;
      font: inherit;
    }

    button {
      padding: 11px 16px;
      border: 1px solid #2e6e70;
      border-radius: 10px;
      background: #fff;
      color: #2e6e70;
      font: inherit;
      cursor: pointer;
    }

    .primario {
      background: #2e6e70;
      color: #fff;
    }

    button:disabled,
    fieldset:disabled button {
      opacity: .6;
      cursor: default;
    }

    .acciones {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }

    .error { color: #b42318; }
  `],
})
export class VacunasComponent implements OnChanges, OnDestroy {
  @Input() mascotaId!: number;

  vacunas: Vacuna[] = [];
  cargando = false;
  guardando = false;
  errorCarga = '';
  errorGuardado = '';
  exito = '';
  editandoId: number | null = null;

  // Conserva el estado existente durante una edición de datos.
  private aplicadaOriginal = false;
  private consulta?: Subscription;
  private envio?: Subscription;

  formulario = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [nombreValido, Validators.maxLength(100)],
    }),
    fechaAplicacion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, fechaValida],
    }),
    fechaProximoRefuerzo: new FormControl('', {
      nonNullable: true,
      validators: [fechaValida],
    }),
  }, { validators: ordenFechas });

  constructor(
    private servicio: VacunaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(): void {
    // Evita que una respuesta anterior aparezca en otra mascota.
    this.consulta?.unsubscribe();
    this.envio?.unsubscribe();
    this.guardando = false;
    this.cargando = false;
    this.vacunas = [];
    this.errorCarga = '';
    this.cancelar();

    if (Number.isInteger(this.mascotaId) && this.mascotaId > 0) {
      this.cargar();
    }
  }

  cargar(): void {
    this.consulta?.unsubscribe();
    this.cargando = true;
    this.errorCarga = '';

    this.consulta = this.servicio.listar(this.mascotaId).subscribe({
      next: (vacunas) => {
        this.vacunas = this.ordenar(vacunas);
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.errorCarga = error.status === 401
          ? 'Tu sesión no es válida. Vuelve a iniciar sesión.'
          : 'No pudimos cargar las vacunas. Intenta nuevamente.';
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  guardar(): void {
    if (this.guardando || this.cargando || this.errorCarga) return;

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const datos = {
      nombre: valores.nombre.trim(),
      fechaAplicacion: valores.fechaAplicacion,
      fechaProximoRefuerzo: valores.fechaProximoRefuerzo || null,
    };

    const id = this.editandoId;
    const solicitud = id === null
      ? this.servicio.crear(this.mascotaId, datos)
      : this.servicio.actualizar(id, {
          ...datos,
          aplicada: this.aplicadaOriginal,
        });

    this.guardando = true;
    this.errorGuardado = '';
    this.exito = '';

    this.envio = solicitud.subscribe({
      next: (vacuna) => {
        // Usa la respuesta del servidor y evita duplicados por id.
        this.vacunas = this.ordenar([
          ...this.vacunas.filter(item => item.id !== vacuna.id),
          vacuna,
        ]);

        this.guardando = false;
        this.cancelar();
        this.exito = id === null
          ? 'Vacuna registrada correctamente.'
          : 'Vacuna actualizada correctamente.';
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.guardando = false;
        this.errorGuardado = error.status === 401
          ? 'Tu sesión no es válida. Vuelve a iniciar sesión.'
          : 'No pudimos guardar la vacuna. Conservamos tus datos para reintentar.';
        this.cdr.markForCheck();
      },
    });
  }

  editar(vacuna: Vacuna): void {
    if (this.guardando) return;

    this.editandoId = vacuna.id;
    this.aplicadaOriginal = vacuna.aplicada;
    this.errorGuardado = '';
    this.exito = '';

    this.formulario.reset({
      nombre: vacuna.nombre,
      fechaAplicacion: vacuna.fechaAplicacion.slice(0, 10),
      fechaProximoRefuerzo:
        vacuna.fechaProximoRefuerzo?.slice(0, 10) || '',
    });
  }

  cancelar(): void {
    this.editandoId = null;
    this.aplicadaOriginal = false;
    this.errorGuardado = '';
    this.exito = '';
    this.formulario.reset({
      nombre: '',
      fechaAplicacion: '',
      fechaProximoRefuerzo: '',
    });
  }

  private ordenar(vacunas: Vacuna[]): Vacuna[] {
    return [...vacunas].sort((a, b) =>
      Date.parse(a.fechaAplicacion) - Date.parse(b.fechaAplicacion) ||
      a.id - b.id
    );
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
    this.envio?.unsubscribe();
  }
}
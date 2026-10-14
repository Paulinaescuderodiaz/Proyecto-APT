import { Component, Input, OnChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
    selector: 'app-donante',
    standalone: true,
    imports: [FormsModule],
    template: `
    <section class="donante" aria-labelledby="titulo-donante">
      <span class="etiqueta">Demostración · Sin conexión al servidor</span>

      <h2 id="titulo-donante">Donante voluntario</h2>
    <p>
        Inscribe a {{ nombreMascota || 'tu mascota de demostración' }}
        en la red de donantes.
    </p>

      @if (registro; as datos) {
        <div class="resultado" role="status">
          <h3>Inscripción simulada</h3>
          <p>
  <strong>Mascota:</strong>
  {{ nombreMascota || 'Mascota de demostración' }}
</p>
          <p>
            <strong>Grupo sanguíneo:</strong>
            {{ datos.grupoSanguineo || 'Desconocido' }}
          </p>
          <p>
            <strong>Estado:</strong>
            {{ datos.estado === 'activo' ? 'Activo' : 'Pendiente de tipificación' }}
          </p>
          <p>Estos datos no se han enviado al servidor.</p>
        </div>
      } @else {
        <form #formulario="ngForm" (ngSubmit)="inscribir(formulario)" novalidate>
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
            Quiero inscribir voluntariamente a mi mascota.
          </label>

          @if (error) {
            <p class="error" role="alert">{{ error }}</p>
          }

          <button type="submit">Simular inscripción</button>
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

    .etiqueta {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 8px;
      background: #fff2cf;
      color: #695016;
      font-size: 13px;
    }

    h2 { margin-bottom: 8px; }

    p { line-height: 1.5; }

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

    button:focus-visible, input:focus-visible {
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
export class DonanteComponent implements OnChanges {
    // Los valores predeterminados permiten abrir la demostración sin una API.
    @Input() mascotaId = 0;
    @Input() nombreMascota = 'Mascota de demostración';

    conoceGrupo = false;
    grupoSanguineo = '';
    acepta = false;
    error = '';

    registro: {
        grupoSanguineo: string | null;
        estado: 'activo' | 'pendiente';
    } | null = null;

    // Reinicia la demostración si se selecciona otra mascota.
    ngOnChanges(): void {
        this.conoceGrupo = false;
        this.grupoSanguineo = '';
        this.acepta = false;
        this.error = '';
        this.registro = null;
    }

    cambiarConocimiento(): void {
        this.grupoSanguineo = '';
        this.error = '';
    }

    inscribir(formulario: NgForm): void {
        // Evita repetir una inscripción dentro de esta demostración.
        if (this.registro) return;

        this.error = '';
        const grupo = this.grupoSanguineo.trim();

        if (this.conoceGrupo && (!grupo || grupo.length > 40)) {
            this.error = 'Ingresa un grupo sanguíneo válido de hasta 40 caracteres.';
            formulario.control.markAllAsTouched();
            return;
        }

        if (!this.acepta) {
            this.error = 'Confirma que quieres inscribir voluntariamente a tu mascota.';
            formulario.control.markAllAsTouched();
            return;
        }

        if (formulario.invalid) {
            formulario.control.markAllAsTouched();
            this.error = 'Revisa los campos del formulario.';
            return;
        }

        // Simulación local: no crea registros reales ni realiza solicitudes HTTP.
        this.registro = {
            grupoSanguineo: this.conoceGrupo ? grupo : null,
            estado: this.conoceGrupo ? 'activo' : 'pendiente',
        };
    }
}
import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { DocumentoService } from '../services/documento.service';

@Component({
  selector: 'app-adjuntar-documento',
  standalone: true,
  template: `
    <section class="adjuntos" aria-label="Adjuntar documento veterinario">
      <h5>Documentos veterinarios</h5>

      <label>
        Seleccionar imagen o PDF

        <input
          #selector
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
          [disabled]="subiendo"
          (change)="seleccionarArchivo($event)"
        />
      </label>

      <p class="ayuda">JPG, PNG o PDF. Máximo 5 MB.</p>

      @if (archivoSeleccionado) {
        <p class="nombre">
          Archivo seleccionado: {{ archivoSeleccionado.name }}
        </p>
      }

      <button
        type="button"
        [disabled]="subiendo || !archivoSeleccionado"
        (click)="subirArchivo(selector)"
      >
        {{ subiendo ? 'Subiendo…' : 'Subir archivo' }}
      </button>

      @if (error) {
        <p class="error" role="alert">{{ error }}</p>
      }

      @if (mensajeExito) {
        <p class="exito" role="status">{{ mensajeExito }}</p>
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .adjuntos {
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid #e4ded8;
    }

    h5 {
      margin: 0 0 12px;
      font-size: 15px;
      color: #263c3f;
    }

    label {
      display: block;
      font-size: 14px;
      color: #263c3f;
    }

    input {
      display: block;
      width: 100%;
      margin-top: 8px;
      font: inherit;
    }

    .ayuda {
      color: #6f888d;
      font-size: 12px;
    }

    .nombre {
      overflow-wrap: anywhere;
      font-size: 13px;
    }

    button {
      padding: 11px 18px;
      border: none;
      border-radius: 8px;
      background: #2e6e70;
      color: white;
      font: inherit;
      cursor: pointer;
    }

    button:disabled {
      opacity: 0.55;
      cursor: default;
    }

    button:focus-visible,
    input:focus-visible {
      outline: 2px solid #2e6e70;
      outline-offset: 3px;
    }

    .error,
    .exito {
      padding: 10px;
      border-radius: 8px;
      font-size: 13px;
      overflow-wrap: anywhere;
    }

    .error {
      color: #a32929;
      background: #fff0f0;
    }

    .exito {
      color: #276c40;
      background: #edf7f0;
    }
  `],
})
export class AdjuntarDocumentoComponent implements OnChanges, OnDestroy {
  @Input() registroMedicoId!: number;

  archivoSeleccionado: File | null = null;
  subiendo = false;
  error = '';
  mensajeExito = '';

  private solicitud?: Subscription;

  private readonly tiposPermitidos = [
    'image/jpeg',
    'image/png',
    'application/pdf',
  ];

  private readonly tamanoMaximo = 5 * 1024 * 1024;

  constructor(
    private documentoService: DocumentoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(): void {
    // Limpia el estado si el componente recibe otro registro médico.
    this.solicitud?.unsubscribe();
    this.archivoSeleccionado = null;
    this.subiendo = false;
    this.error = '';
    this.mensajeExito = '';
  }

  seleccionarArchivo(evento: Event): void {
    const selector = evento.target as HTMLInputElement;
    const archivo = selector.files?.[0];

    this.archivoSeleccionado = null;
    this.error = '';
    this.mensajeExito = '';

    if (!archivo) return;

    // Valida extensión y tipo antes de enviar el archivo.
    const extensionValida = /\.(jpe?g|png|pdf)$/i.test(archivo.name);

    if (
      !extensionValida ||
      !this.tiposPermitidos.includes(archivo.type)
    ) {
      this.error = 'Formato de archivo no soportado';
      selector.value = '';
      return;
    }

    if (archivo.size > this.tamanoMaximo) {
      this.error = 'El archivo supera el tamaño máximo permitido';
      selector.value = '';
      return;
    }

    this.archivoSeleccionado = archivo;
  }

  subirArchivo(selector: HTMLInputElement): void {
    if (this.subiendo) return;

    this.error = '';
    this.mensajeExito = '';

    const archivo = this.archivoSeleccionado;

    if (!archivo) {
      this.error = 'Selecciona un archivo antes de subirlo.';
      return;
    }

    if (
      !Number.isInteger(this.registroMedicoId) ||
      this.registroMedicoId <= 0
    ) {
      this.error = 'No se pudo identificar el registro médico.';
      return;
    }

    this.subiendo = true;

    this.solicitud = this.documentoService
      .subir(this.registroMedicoId, archivo)
      .subscribe({
        next: () => {
          // Confirma el éxito únicamente cuando responde el servidor.
          this.mensajeExito =
            'Archivo adjuntado correctamente al registro médico.';

          this.archivoSeleccionado = null;
          selector.value = '';
          this.subiendo = false;
          this.cdr.detectChanges();
        },
        error: (respuesta) => {
          if (respuesta.status === 401) {
            this.error = 'Tu sesión expiró. Vuelve a iniciar sesión.';
          } else if (
            [400, 404].includes(respuesta.status) &&
            typeof respuesta.error?.error === 'string'
          ) {
            this.error = respuesta.error.error;
          } else {
            this.error =
              'No pudimos subir el archivo. Intenta nuevamente.';
          }

          // Conserva la selección para permitir un nuevo intento.
          this.subiendo = false;
          this.cdr.detectChanges();
        },
      });
  }

  ngOnDestroy(): void {
    this.solicitud?.unsubscribe();
  }
}
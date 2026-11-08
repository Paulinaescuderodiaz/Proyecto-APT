import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Documento, DocumentoService } from '../services/documento.service';

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
      <h5>Archivos adjuntos</h5>
      @if (cargandoDocumentos) {
        <p role="status">Cargando documentos…</p>
      } @else if (errorListado) {
        <p class="error" role="alert">{{ errorListado }}</p>
        <button type="button" (click)="cargarDocumentos()">Reintentar consulta</button>
      } @else {
        <ul class="documentos" aria-label="Archivos del registro médico">
          @for (documento of documentos; track documento.id) {
            <li>
              <span class="archivo-nombre">{{ documento.nombreArchivo }}</span>
              <small>{{ tipoLegible(documento.tipoArchivo) }} · {{ tamanoLegible(documento.tamano) }}</small>
              <div class="acciones-documento">
                <button type="button" [disabled]="archivoEnCurso !== null"
                  [attr.aria-label]="'Ver ' + documento.nombreArchivo" (click)="abrir(documento)">Ver</button>
                <button type="button" [disabled]="archivoEnCurso !== null"
                  [attr.aria-label]="'Descargar ' + documento.nombreArchivo" (click)="abrir(documento, true)">Descargar</button>
              </div>
            </li>
          } @empty {
            <li class="ayuda">Este registro aún no tiene documentos adjuntos.</li>
          }
        </ul>
      }
      @if (archivoEnCurso !== null) { <p role="status">Preparando archivo…</p> }
      @if (errorArchivo) { <p class="error" role="alert">{{ errorArchivo }}</p> }
      <dialog #visor aria-label="Vista del documento" (close)="cerrarVista()" (cancel)="cerrarVista()">
        @if (documentoAbierto) {
          <header class="visor-cabecera">
            <strong>{{ documentoAbierto.nombreArchivo }}</strong>
            <button type="button" (click)="cerrarVista()">Cerrar vista</button>
          </header>
          @if (documentoAbierto.tipoArchivo === 'application/pdf') {
            <iframe [src]="vistaPdf" [title]="documentoAbierto.nombreArchivo"></iframe>
          } @else {
            <img [src]="vistaUrl" [alt]="documentoAbierto.nombreArchivo" />
          }
          <p class="ayuda">Si no se visualiza, cierra esta vista y utiliza Descargar.</p>
        }
      </dialog>
    </section>
  `,
  styles: [`
    .documentos { list-style: none; padding: 0; }
    .documentos li { padding: 12px 0; border-bottom: 1px solid #e4ded8; }
    .archivo-nombre { display: block; overflow-wrap: anywhere; color: #263c3f; }
    small { display: block; margin: 6px 0; color: #546b70; }
    .acciones-documento { display: flex; gap: 8px; flex-wrap: wrap; }
    dialog { width: min(900px, 90vw); max-height: 90vh; border: 1px solid #b9cdcd;
      border-radius: 12px; padding: 20px; color: #263c3f; }
    dialog::backdrop { background: #0009; }
    .visor-cabecera { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
    .visor-cabecera strong { overflow-wrap: anywhere; min-width: 0; }
    iframe { display: block; width: 100%; height: 65vh; border: 0; }
    dialog img { display: block; max-width: 100%; max-height: 65vh; margin: auto; object-fit: contain; }

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

  documentos: Documento[] = [];
  cargandoDocumentos = false;
  errorListado = '';
  errorArchivo = '';
  archivoEnCurso: number | null = null;
  documentoAbierto: Documento | null = null;
  vistaUrl = '';
  vistaPdf: SafeResourceUrl | null = null;
  @ViewChild('visor') visor?: ElementRef<HTMLDialogElement>;

  private consulta?: Subscription;
  private lectura?: Subscription;
  private urlsDescarga = new Map<string, ReturnType<typeof setTimeout>>();
  private solicitud?: Subscription;

  private readonly tiposPermitidos = [
    'image/jpeg',
    'image/png',
    'application/pdf',
  ];

  private readonly tamanoMaximo = 5 * 1024 * 1024;

  constructor(
    private documentoService: DocumentoService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  ngOnChanges(): void {
    // Limpia el estado si el componente recibe otro registro médico.
    this.solicitud?.unsubscribe();
    this.lectura?.unsubscribe();
    this.cerrarVista();
    this.archivoEnCurso = null;
    this.errorArchivo = '';
    this.archivoSeleccionado = null;
    this.subiendo = false;
    this.error = '';
    this.mensajeExito = '';
    this.cargarDocumentos();
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
          this.cargarDocumentos();
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

  cargarDocumentos(): void {
    this.consulta?.unsubscribe();
    this.documentos = [];
    this.errorListado = '';
    this.cargandoDocumentos = false;
    if (!Number.isSafeInteger(this.registroMedicoId) || this.registroMedicoId <= 0) return;
    this.cargandoDocumentos = true;
    this.consulta = this.documentoService.listar(this.registroMedicoId).subscribe({
      next: documentos => {
        this.documentos = documentos;
        this.cargandoDocumentos = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorListado = 'No pudimos consultar los documentos. Intenta nuevamente.';
        this.cargandoDocumentos = false;
        this.cdr.markForCheck();
      },
    });
  }

  tipoLegible(tipo: string): string {
    return ({ 'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG' } as Record<string, string>)[tipo] || 'Archivo';
  }

  tamanoLegible(bytes: number): string {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.ceil(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  abrir(documento: Documento, descargar = false): void {
    if (this.archivoEnCurso !== null) return;
    this.errorArchivo = '';
    this.archivoEnCurso = documento.id;
    this.lectura = this.documentoService.obtenerArchivo(documento.id, descargar).subscribe({
      next: contenido => {
        this.archivoEnCurso = null;
        const url = URL.createObjectURL(contenido);
        if (descargar) {
          const enlace = document.createElement('a');
          enlace.href = url;
          enlace.download = documento.nombreArchivo;
          document.body.append(enlace);
          enlace.click(); enlace.remove();
          const temporizador = setTimeout(() => { URL.revokeObjectURL(url); this.urlsDescarga.delete(url); }, 1000);
          this.urlsDescarga.set(url, temporizador);
        } else {
          this.cerrarVista();
          this.documentoAbierto = documento;
          this.vistaUrl = url;
          // URL local creada a partir del Blob de la ruta autenticada; nunca una ruta de la base de datos.
          this.vistaPdf = this.sanitizer.bypassSecurityTrustResourceUrl(url);
          this.cdr.detectChanges();
          this.visor?.nativeElement.showModal();
        }
        this.cdr.markForCheck();
      },
      error: respuesta => {
        this.archivoEnCurso = null;
        this.errorArchivo = respuesta.status === 401
          ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
          : respuesta.status === 404
            ? 'El archivo ya no está disponible.'
            : 'No pudimos abrir el archivo. Intenta nuevamente.';
        this.cdr.markForCheck();
      },
    });
  }

  cerrarVista(): void {
    if (this.visor?.nativeElement.open) this.visor.nativeElement.close();
    if (this.vistaUrl) URL.revokeObjectURL(this.vistaUrl);
    this.vistaUrl = '';
    this.vistaPdf = null;
    this.documentoAbierto = null;
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.solicitud?.unsubscribe();
    this.consulta?.unsubscribe();
    this.lectura?.unsubscribe();
    this.cerrarVista();
    for (const [url, temporizador] of this.urlsDescarga) {
      clearTimeout(temporizador);
      URL.revokeObjectURL(url);
    }
    this.urlsDescarga.clear();
  }
}

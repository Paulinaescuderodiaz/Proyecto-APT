import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  RegistroMedico,
  RegistroMedicoService,
} from '../services/registro-medico.service';

@Component({
  selector: 'app-historial-medico',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './historial-medico.component.html',
  styleUrls: ['./historial-medico.component.scss'],
})
export class HistorialMedicoComponent implements OnChanges, OnDestroy {
  // La ficha de mascotas indica de quién es este historial.
  @Input() mascotaId!: number;

  registros: RegistroMedico[] = [];

  diagnostico = '';
  fecha = '';
  tratamiento = '';

  cargando = false;
  guardando = false;
  errorCarga = '';
  errorGuardado = '';
  mensajeExito = '';
  enviado = false;

  private consulta?: Subscription;
  private guardado?: Subscription;

  constructor(
    private registroService: RegistroMedicoService,
    private cdr: ChangeDetectorRef
  ) {}

  // Al cambiar de mascota, limpia los datos de la ficha anterior.
  ngOnChanges(): void {
    this.consulta?.unsubscribe();
    this.guardado?.unsubscribe();

    this.registros = [];
    this.diagnostico = '';
    this.fecha = '';
    this.tratamiento = '';
    this.errorGuardado = '';
    this.mensajeExito = '';
    this.enviado = false;
    this.guardando = false;

    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.consulta?.unsubscribe();
    this.cargando = true;
    this.errorCarga = '';

    this.consulta = this.registroService.listar(this.mascotaId).subscribe({
      next: (registros) => {
        this.registros = this.ordenar(registros);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorCarga = error.status === 401
          ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
          : 'No pudimos cargar el historial médico. Intenta nuevamente.';

        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  guardar(formulario: NgForm): void {
    // Evita envíos repetidos mientras se guarda o se consulta el historial.
    if (this.guardando || this.cargando || this.errorCarga) return;

    this.enviado = true;
    this.errorGuardado = '';
    this.mensajeExito = '';

    // trim también rechaza un diagnóstico compuesto solo por espacios.
    if (!this.diagnostico.trim() || formulario.invalid) {
      formulario.control.markAllAsTouched();
      return;
    }

    this.guardando = true;

    this.guardado = this.registroService.crear({
      mascotaId: this.mascotaId,
      diagnostico: this.diagnostico.trim(),
      // El input entrega YYYY-MM-DD; el backend lo convierte a Date.
      fecha: this.fecha,
      tratamiento: this.tratamiento.trim(),
    }).subscribe({
      next: (registro) => {
        // Se agrega únicamente cuando el servidor confirma que fue guardado.
        this.registros = this.ordenar([...this.registros, registro]);
        this.guardando = false;
        this.enviado = false;

        formulario.resetForm({
          diagnostico: '',
          fecha: '',
          tratamiento: '',
        });

        this.mensajeExito = 'Registro médico guardado correctamente.';
        this.cdr.detectChanges();
      },
      error: (error) => {
        // Conserva lo escrito para que el usuario pueda corregir o reintentar.
        this.errorGuardado = error.status === 401
          ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
          : error.status === 400 && typeof error.error?.error === 'string'
            ? error.error.error
            : 'No pudimos guardar el registro médico. Intenta nuevamente.';

        this.guardando = false;
        this.cdr.detectChanges();
      },
    });
  }

  private ordenar(registros: RegistroMedico[]): RegistroMedico[] {
    // Mantiene el orden también después de agregar un registro con fecha antigua.
    return [...registros].sort(
      (a, b) => Date.parse(b.fecha) - Date.parse(a.fecha) || b.id - a.id
    );
  }

  ngOnDestroy(): void {
    // Evita actualizar una ficha que ya se cerró.
    this.consulta?.unsubscribe();
    this.guardado?.unsubscribe();
  }
}
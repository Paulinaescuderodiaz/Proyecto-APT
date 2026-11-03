import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { Subscription, forkJoin } from 'rxjs';
import { ConversacionService, Conversacion, Mensaje } from '../../services/conversacion.service';

@Component({
  selector: 'app-conversaciones', standalone: true,
  imports: [FormsModule, RouterLink, IonContent],
  templateUrl: './conversaciones.page.html',
  styleUrls: ['./conversaciones.page.scss'],
})
export class ConversacionesPage implements OnInit, OnDestroy {
  conversaciones: Conversacion[] = [];
  seleccionada: Conversacion | null = null;
  mensajes: Mensaje[] = [];
  texto = '';
  cargando = false;
  enviando = false;
  error = '';
  readonly aviso = 'La aptitud médica para donar debe ser validada siempre por un veterinario de forma presencial.';
  private consulta?: Subscription;
  private envio?: Subscription;
  private parametros?: Subscription;
  constructor(private servicio: ConversacionService, private ruta: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.parametros = this.ruta.paramMap.subscribe(parametros => {
      const valor = parametros.get('id');
      if (valor === null) { this.cargarLista(); return; }
      const id = Number(valor);
      if (!Number.isSafeInteger(id) || id <= 0) {
        this.consulta?.unsubscribe();
        this.envio?.unsubscribe();
        this.enviando = false;
        this.texto = '';
        this.seleccionada = null;
        this.mensajes = [];
        this.cargando = false;
        this.error = 'Conversación inválida.';
        this.cdr.detectChanges();
        return;
      }
      this.abrir(id);
    });
  }
  cargarLista(): void {
    this.consulta?.unsubscribe();
    this.envio?.unsubscribe();
    this.enviando = false;
    this.seleccionada = null;
    this.mensajes = [];
    this.texto = '';
    this.error = '';
    this.cargando = true;
    this.consulta = this.servicio.listar().subscribe({
      next: datos => { this.conversaciones = datos; this.cargando = false; this.cdr.detectChanges(); },
      error: error => this.fallar(error),
    });
  }
  abrir(id: number): void {
    this.consulta?.unsubscribe();
    this.envio?.unsubscribe();
    this.enviando = false;
    this.seleccionada = null;
    this.mensajes = [];
    this.texto = '';
    this.error = '';
    this.cargando = true;
    // La API comprueba que el usuario participe en la conversación.
    this.consulta = forkJoin({ conversacion: this.servicio.ver(id), mensajes: this.servicio.mensajes(id) }).subscribe({
      next: datos => {
        this.seleccionada = datos.conversacion;
        this.mensajes = datos.mensajes;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: error => this.fallar(error),
    });
  }
  actualizar(): void {
    if (!this.seleccionada || this.cargando || this.enviando) return;
    this.error = '';
    this.cargando = true;
    this.consulta = this.servicio.mensajes(this.seleccionada.id).subscribe({
      next: mensajes => { this.mensajes = mensajes; this.cargando = false; this.cdr.detectChanges(); },
      error: error => this.fallar(error),
    });
  }
  enviar(): void {
    if (!this.seleccionada || this.enviando || this.cargando) return;
    const texto = this.texto.trim();
    if (!texto || texto.length > 1000) {
      this.error = 'Escribe un mensaje de entre 1 y 1000 caracteres.';
      return;
    }
    this.error = '';
    this.enviando = true;
    this.envio = this.servicio.enviar(this.seleccionada.id, texto).subscribe({
      next: mensaje => {
        this.mensajes = [...this.mensajes, mensaje];
        this.texto = '';
        this.enviando = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.enviando = false;
        this.error = error.status === 401 ? 'Tu sesión no es válida. Vuelve a iniciar sesión.'
          : error.status === 404 ? 'La conversación ya no está disponible.'
          : 'No se confirmó el envío. Conservamos el texto; actualiza los mensajes antes de reintentar.';
        this.cdr.detectChanges();
      },
    });
  }
  private fallar(error: { status: number }): void {
    this.cargando = false;
    this.error = error.status === 401 ? 'Tu sesión no es válida. Vuelve a iniciar sesión.'
      : error.status === 404 ? 'Conversación no encontrada o sin acceso.'
      : 'No pudimos cargar las conversaciones. Intenta nuevamente.';
    this.cdr.detectChanges();
  }
  ngOnDestroy(): void {
    this.consulta?.unsubscribe(); this.envio?.unsubscribe(); this.parametros?.unsubscribe();
  }
}

import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { IonContent } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService, PerfilUsuario } from '../../services/auth.service';

@Component({ selector: 'app-perfil', standalone: true, templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'], imports: [IonContent, RouterLink, FormsModule] })
export class PerfilPage implements OnInit, OnDestroy {
  nombre = signal(''); correo = signal(''); telefono = signal(''); comuna = signal('');
  cargando = signal(false); guardando = signal(false); editando = signal(false);
  error = signal(''); exito = signal('');
  datos = { nombre: '', telefono: '', comuna: '' };
  comunas = ['Valparaíso', 'Viña del Mar', 'Quilpué', 'Villa Alemana', 'Concón', 'Casablanca'];
  private consulta?: Subscription;
  private envio?: Subscription;
  constructor(private authService: AuthService, private router: Router) {}
  ngOnInit(): void { this.ionViewWillEnter(); }
  ionViewWillEnter(): void {
    this.cancelarConsultas(); this.editando.set(false); this.error.set(''); this.exito.set('');
    if (!this.authService.estaAutenticado()) { this.cerrarSesion(); return; }
    this.nombre.set(''); this.correo.set(''); this.telefono.set(''); this.comuna.set('');
    this.cargando.set(true);
    this.consulta = this.authService.verPerfil().subscribe({
      next: perfil => { this.mostrar(perfil); this.cargando.set(false); },
      error: respuesta => {
        this.cargando.set(false);
        if (respuesta.status === 401 || respuesta.status === 403) { this.cerrarSesion(); return; }
        this.error.set('No pudimos cargar tu perfil. Intenta nuevamente.');
      },
    });
  }
  private mostrar(perfil: PerfilUsuario): void {
    this.nombre.set(perfil.nombre); this.correo.set(perfil.email);
    this.telefono.set(perfil.telefono || ''); this.comuna.set(perfil.comuna || '');
  }
  editar(): void {
    this.datos = { nombre: this.nombre(), telefono: this.telefono(), comuna: this.comuna() };
    this.error.set(''); this.exito.set(''); this.editando.set(true);
  }
  cancelar(): void { if (!this.guardando()) { this.editando.set(false); this.error.set(''); } }
  guardar(formulario: NgForm): void {
    if (this.guardando() || formulario.invalid || !this.datos.nombre.trim()) {
      formulario.control.markAllAsTouched(); return;
    }
    this.guardando.set(true); this.error.set(''); this.exito.set('');
    this.envio = this.authService.actualizarPerfil({
      nombre: this.datos.nombre.trim(), telefono: this.datos.telefono.trim(), comuna: this.datos.comuna.trim(),
    }).subscribe({
      next: perfil => { this.mostrar(perfil); this.guardando.set(false); this.editando.set(false); this.exito.set('Perfil actualizado correctamente.'); },
      error: respuesta => {
        this.guardando.set(false);
        if (respuesta.status === 401 || respuesta.status === 403) { this.cerrarSesion(); return; }
        this.error.set('No pudimos guardar tu perfil. Conservamos tus datos para reintentar.');
      },
    });
  }
  cerrarSesion(): void {
    this.cancelarConsultas(); this.authService.logout();
    this.nombre.set(''); this.correo.set(''); this.telefono.set(''); this.comuna.set('');
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
  private cancelarConsultas(): void { this.consulta?.unsubscribe(); this.envio?.unsubscribe(); this.guardando.set(false); }
  ionViewWillLeave(): void { this.cancelarConsultas(); this.editando.set(false); }
  ngOnDestroy(): void { this.cancelarConsultas(); }
}

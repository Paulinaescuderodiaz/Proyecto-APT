import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  imports: [IonContent, RouterLink],
})
export class PerfilPage {
  nombre = '';
  correo = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // Actualiza los datos cada vez que se abre la página.
  ionViewWillEnter(): void {
    this.nombre = '';
    this.correo = '';

    if (!this.authService.estaAutenticado()) {
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }

    try {
      // Estos datos son de presentación; no se consultan ni editan en la API.
      const usuario = this.authService.obtenerUsuario();
      this.nombre = usuario?.nombre || '';
      this.correo = usuario?.email || '';
    } catch {
      // Si los datos guardados están dañados, permite iniciar sesión otra vez.
      this.cerrarSesion();
    }
  }

  cerrarSesion(): void {
    // Elimina únicamente los datos de sesión de Pethub.
    this.authService.logout();
    this.nombre = '';
    this.correo = '';

    // Reemplaza esta entrada del historial por la pantalla de login.
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
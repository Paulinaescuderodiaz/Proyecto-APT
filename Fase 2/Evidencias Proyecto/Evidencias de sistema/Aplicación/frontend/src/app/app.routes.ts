import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { isDevMode } from '@angular/core';


// Cada loadComponent carga una página bajo demanda. Estas rutas todavía no tienen guards de sesión.
export const routes: Routes = [
  {
    // Plantilla inicial de Ionic; el login exitoso lleva a /mascotas.
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },

  {
    path: 'demo-donante',
    canMatch: [() => isDevMode()],
    loadComponent: () =>
      import('./components/donante.component')
        .then(m => m.DonanteComponent),
  },
  {
    // La URL raíz abre la bienvenida; full evita redirigir las demás rutas.
    path: '',
    redirectTo: 'bienvenida',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro.page').then(m => m.RegistroPage)
  },
  {
    path: 'mascotas',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/mascotas/mascotas.page').then(m => m.MascotasPage)
  },

  {
    path: 'bienvenida',
    loadComponent: () => import('./pages/bienvenida/bienvenida.page').then(m => m.BienvenidaPage)
  },
  {
    // Perfil del usuario y cierre de sesión.
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/perfil/perfil.page').then((m) => m.PerfilPage),
  },

  {
    path: 'solicitudes-sangre',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/solicitudes-sangre.component')
        .then(m => m.SolicitudesSangreComponent),
  },
];


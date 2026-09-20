import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Antes de abrir una página protegida, comprueba si hay un token guardado.
// El backend sigue siendo responsable de verificar su validez.
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.estaAutenticado()
    ? true
    : router.createUrlTree(['/login']);
};
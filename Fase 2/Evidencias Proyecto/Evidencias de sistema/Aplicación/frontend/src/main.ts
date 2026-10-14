import { bootstrapApplication } from "@angular/platform-browser";
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from "@angular/router";
import { IonicRouteStrategy, provideIonicAngular } from "@ionic/angular";
import { provideHttpClient } from "@angular/common/http";

import { routes } from "./app/app.routes";
import { AppComponent } from "./app/app.component";

// Arranque de Angular: registra navegación Ionic, rutas y HttpClient para los servicios de la API.
bootstrapApplication(AppComponent, {
  providers: [
    // Ionic puede conservar las páginas al navegar; sus hooks actualizan datos al volver a entrar.
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    // Permite inyectar HttpClient en AuthService y MascotaService.
    provideHttpClient(),
  ],
});

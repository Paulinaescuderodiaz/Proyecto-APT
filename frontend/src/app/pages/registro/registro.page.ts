import { Component, ChangeDetectorRef } from "@angular/core";
import { FormsModule, NgForm } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { IonContent } from "@ionic/angular";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-registro",
  standalone: true,
  templateUrl: "./registro.page.html",
  styleUrls: ["./registro.page.scss"],
  imports: [IonContent, FormsModule, RouterLink],
})
export class RegistroPage {
  // Los datos se conservan al cambiar entre los dos pasos.
  paso = 1;
  nombre = "";
  correo = "";
  clave = "";
  confirmacion = "";
  comuna = "";
  mostrarClave = false;

  // El HTML muestra este mensaje con {{ mensaje }}.
  mensaje = "";

  // Comunas incluidas en el prototipo.
  comunas = [
    "Valparaiso",
    "Vina del Mar",
    "Quilpue",
    "Villa Alemana",
    "Concon",
    "Casablanca",
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  // Valida nombre y correo antes de avanzar; todavía no crea la cuenta.
  continuar(formulario: NgForm): void {
    if (formulario.invalid || !this.nombre.trim()) {
      formulario.control.markAllAsTouched();
      return;
    }

    this.mensaje = "";
    this.paso = 2;
  }

  // Vuelve al primer paso para corregir los datos básicos.
  volver(): void {
    this.paso = 1;
    this.mensaje = "";
  }

  // Valida el segundo paso y solicita la creación de la cuenta.
  registrar(formulario: NgForm): void {
    this.mensaje = "";

    if (
      formulario.invalid ||
      this.clave !== this.confirmacion ||
      !this.comunas.includes(this.comuna)
    ) {
      formulario.control.markAllAsTouched();
      return;
    }

    // Envía los datos de ambos pasos.
    // La confirmación se valida aquí y no se envía al backend.
    this.authService
      .registro({
        nombre: this.nombre.trim(),
        email: this.correo.trim(),
        password: this.clave,
        comuna: this.comuna,
      })
      .subscribe({
        next: () => {
          this.mensaje =
            "Cuenta creada con éxito. Ya puedes iniciar sesión.";

          // Muestra el resultado sin esperar otro clic del usuario.
          this.cdr.detectChanges();

          // Deja un breve intervalo para leer el aviso antes de navegar.
          setTimeout(() => {
            this.router.navigateByUrl("/login");
          }, 1500);
        },
        error: (error) => {
          // 409: el backend encontró una cuenta con ese correo.
          if (error.status === 409) {
            // Vuelve a los datos básicos para corregir el correo duplicado.
            this.paso = 1;
            this.mensaje =
              "Ya existe una cuenta con ese correo. Cámbialo o selecciona Ingresar.";
          } else if (error.status === 0) {
            // 0: no se obtuvo una respuesta HTTP del servidor.
            this.mensaje =
              "No pudimos conectar con el servidor. Intenta nuevamente.";
          } else {
            this.mensaje =
              "Ocurrió un error al crear la cuenta. Intenta nuevamente más tarde.";
          }

          // Actualiza el aviso cuando llega el error de la API.
          this.cdr.detectChanges();
        },
      });
  }

  // Ionic puede conservar la página: limpia las contraseñas al salir.
  ionViewWillLeave(): void {
    this.clave = "";
    this.confirmacion = "";
    this.mostrarClave = false;
    this.mensaje = "";
    this.paso = 1;
  }
}
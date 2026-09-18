import { Component, ChangeDetectorRef } from "@angular/core";
import { FormsModule, NgForm } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { IonContent } from "@ionic/angular";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  templateUrl: "./login.page.html",
  styleUrls: ["./login.page.scss"],
  imports: [IonContent, FormsModule, RouterLink],
})
export class LoginPage {
  // Estado del formulario enlazado al HTML con ngModel; mensaje contiene el aviso del último intento.
  correo = "";
  clave = "";
  mostrarClave = false;
  mensaje = "";

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  // Valida los campos antes de solicitar una sesión al backend.
  ingresar(formulario: NgForm): void {
    this.mensaje = "";

    // Marca los campos para que el HTML muestre los errores aunque el usuario no los haya tocado.
    if (formulario.invalid) {
      formulario.control.markAllAsTouched();
      return;
    }

    // AuthService guarda el token en caso de éxito. La contraseña se envía tal como fue escrita.
    this.authService
      .login({
        email: this.correo.trim(),
        password: this.clave,
      })
      .subscribe({
        next: () => {
          this.router.navigateByUrl("/mascotas");
        },
        error: (error) => {
          // 401: credenciales rechazadas; 0: fallo de conexión; los demás casos muestran un aviso general.
          if (error.status === 401) {
            this.mensaje =
              "Correo o contraseña incorrectos. Revisa tus datos e intenta nuevamente.";
          } else if (error.status === 0) {
            this.mensaje =
              "No pudimos conectar con el servidor. Intenta nuevamente.";
          } else {
            this.mensaje =
              "No pudimos iniciar sesión. Intenta nuevamente más tarde.";
          }

          // Actualiza el aviso al recibir la respuesta asíncrona, sin esperar otro clic del usuario.
          this.cdr.detectChanges();
        },
      });
  }

  // Limpia la contraseña y los avisos al salir, ya que Ionic puede conservar esta página en memoria.
  ionViewWillLeave(): void {
    this.clave = "";
    this.mostrarClave = false;
    this.mensaje = "";
  }
}
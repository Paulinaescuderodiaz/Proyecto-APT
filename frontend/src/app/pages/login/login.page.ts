import { Component } from "@angular/core";
import { FormsModule, NgForm } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { IonContent } from "@ionic/angular";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  templateUrl: "./login.page.html",
  styleUrls: ["./login.page.scss"],
  imports: [IonContent, FormsModule, RouterLink]
})
export class LoginPage {
  correo = "";
  clave = "";
  mostrarClave = false;
  mensaje = "";

  constructor(private authService: AuthService, private router: Router) {}

  ingresar(formulario: NgForm): void {
    this.mensaje = "";

    if (formulario.invalid) {
      formulario.control.markAllAsTouched();
      return;
    }

    this.authService.login({
      email: this.correo,
      password: this.clave,
    }).subscribe({
      next: () => {
        this.router.navigateByUrl("/mascotas");
      },
      error: (error) => {
        if (error.status === 401) {
          this.mensaje = "Correo o contrasena incorrectos.";
        } else {
          this.mensaje = "Ocurrio un error al iniciar sesion. Intenta de nuevo.";
        }
      },
    });
  }

  ionViewWillLeave(): void {
    this.clave = "";
    this.mostrarClave = false;
    this.mensaje = "";
  }
}

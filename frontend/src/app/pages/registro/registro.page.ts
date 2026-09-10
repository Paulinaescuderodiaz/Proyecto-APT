import { Component } from "@angular/core";
import { FormsModule, NgForm } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { IonContent } from "@ionic/angular";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-registro",
  standalone: true,
  templateUrl: "./registro.page.html",
  styleUrls: ["./registro.page.scss"],
  imports: [IonContent, FormsModule, RouterLink]
})
export class RegistroPage {
  paso = 1;
  nombre = "";
  correo = "";
  clave = "";
  confirmacion = "";
  comuna = "";
  mostrarClave = false;
  mensaje = "";

  // Comunas incluidas en el prototipo.
  comunas = [
    "Valparaiso",
    "Vina del Mar",
    "Quilpue",
    "Villa Alemana",
    "Concon",
    "Casablanca"
  ];

  constructor(private authService: AuthService, private router: Router) {}

  continuar(formulario: NgForm): void {
    if (formulario.invalid || !this.nombre.trim()) {
      formulario.control.markAllAsTouched();
      return;
    }

    this.mensaje = "";
    this.paso = 2;
  }

  volver(): void {
    this.paso = 1;
    this.mensaje = "";
  }

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

    this.authService.registro({
      nombre: this.nombre,
      email: this.correo,
      password: this.clave,
    }).subscribe({
      next: () => {
        this.mensaje = "Cuenta creada con exito. Ya puedes iniciar sesion.";
        setTimeout(() => {
          this.router.navigateByUrl("/login");
        }, 1500);
      },
      error: (error) => {
        if (error.status === 409) {
          this.mensaje = "Ya existe una cuenta con ese correo.";
        } else {
          this.mensaje = "Ocurrio un error al crear la cuenta. Intenta de nuevo.";
        }
      },
    });
  }

  ionViewWillLeave(): void {
    this.clave = "";
    this.confirmacion = "";
    this.mostrarClave = false;
    this.mensaje = "";
    this.paso = 1;
  }
}

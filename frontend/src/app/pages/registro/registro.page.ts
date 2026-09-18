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
  // Estado compartido por los dos formularios: datos básicos en el paso 1 y seguridad/comuna en el 2.
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

  constructor(private authService: AuthService, private router: Router) { }

  // Solo cambia al paso 2 cuando nombre y correo son válidos; todavía no crea la cuenta.
  continuar(formulario: NgForm): void {
    if (formulario.invalid || !this.nombre.trim()) {
      formulario.control.markAllAsTouched();
      return;
    }

    this.mensaje = "";
    this.paso = 2;
  }

  // Permite corregir los datos básicos sin borrar lo que ya se escribió.
  volver(): void {
    this.paso = 1;
    this.mensaje = "";
  }

  // Comprueba el segundo formulario, la confirmación de contraseña y una comuna del catálogo.
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

    // Envía también los datos del paso 1. La confirmación de contraseña solo se utiliza en el frontend.
    this.authService.registro({
      nombre: this.nombre,
      email: this.correo,
      password: this.clave,
      comuna: this.comuna,
    }).subscribe({
      next: () => {
        this.mensaje = "Cuenta creada con exito. Ya puedes iniciar sesion.";
        // Da un breve intervalo para mostrar el resultado antes de llevar al usuario al login.
        setTimeout(() => {
          this.router.navigateByUrl("/login");
        }, 1500);
      },
      error: (error) => {
        // 409 indica correo duplicado; el resto de errores usa un mensaje general.
        if (error.status === 409) {
          this.mensaje = "Ya existe una cuenta con ese correo.";
        } else {
          this.mensaje = "Ocurrio un error al crear la cuenta. Intenta de nuevo.";
        }
      },
    });
  }

  // Restablece el paso y limpia las contraseñas cuando se abandona la vista.
  ionViewWillLeave(): void {
    this.clave = "";
    this.confirmacion = "";
    this.mostrarClave = false;
    this.mensaje = "";
    this.paso = 1;
  }
}

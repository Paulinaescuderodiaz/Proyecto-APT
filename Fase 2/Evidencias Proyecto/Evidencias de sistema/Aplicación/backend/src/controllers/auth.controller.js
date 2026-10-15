const bcrypt = require("bcryptjs"); // sirve para "hashear" contraseñas (nunca se guardan en texto plano)
const jwt = require("jsonwebtoken"); // sirve para crear y firmar los tokens de sesión
const prisma = require("../lib/prisma"); // conexión a la base de datos

// Crea una cuenta de usuario nueva (S1-HU01)
async function registro(req, res) {
  try {
    const { nombre, email, password } = req.body;

    // Escenario: si falta cualquiera de los 3 datos, no seguimos
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: "Faltan datos: nombre, email y password son obligatorios" });
    }

    // Escenario "Correo ya registrado": buscamos si ya existe una cuenta con ese email
    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) {
      return res.status(409).json({ error: "Ya existe una cuenta con ese correo" });
      // 409 = "conflicto": el recurso (la cuenta) ya existe
    }

    // Nunca se guarda la contraseña tal cual la escribió el usuario.
    // bcrypt.hash la transforma en un texto cifrado e irreversible.
    // El "10" es el costo del cifrado (a más alto, más lento pero más seguro).
    const passwordHash = await bcrypt.hash(password, 10);

    // Recién ahora se crea el usuario en la base de datos, guardando el hash, no la contraseña real
    const usuario = await prisma.usuario.create({
      data: { nombre, email, password: passwordHash },
    });

    // Se responde SIN el password (ni siquiera el hash) — nunca debe salir del backend
    res.status(201).json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear la cuenta" });
    // 500 = error inesperado del servidor (no es culpa del usuario)
  }
}

// Inicia sesión con correo y contraseña (S1-HU02)
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Faltan datos: email y password son obligatorios" });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      // Ojo: el mensaje es igual de genérico si el correo no existe o si la clave está mala.
      // Es a propósito: así no le decimos a un atacante "este correo sí existe, prueba otra clave"
      return res.status(401).json({ error: "Correo o contrasena incorrectos" });
    }

    // bcrypt.compare cifra la contraseña que llegó y la compara con el hash guardado
    // (nunca se "descifra" el hash, no se puede — solo se compara)
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ error: "Correo o contrasena incorrectos" });
      // 401 = no autorizado / credenciales inválidas
    }

    // Si las credenciales son correctas, se genera un token (una especie de "carnet digital"
    // firmado con la JWT_SECRET del .env). Ese token es lo que el frontend va a guardar
    // y mandar en cada petición futura (por eso lo lee verificarToken en el middleware).
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email }, // datos que quedan "adentro" del token
      process.env.JWT_SECRET, // la firma secreta que solo conoce el backend
      { expiresIn: "7d" } // el token deja de servir después de 7 días
    );

    res.json({
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al iniciar sesion" });
  }
}

module.exports = { registro, login }; // así se pueden usar estas funciones desde auth.routes.js
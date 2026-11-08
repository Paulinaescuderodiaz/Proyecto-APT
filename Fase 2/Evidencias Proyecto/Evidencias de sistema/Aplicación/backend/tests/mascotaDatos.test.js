const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

// Dos usuarios: A es la dueña de la mascota; B es una persona ajena
const emailA = `test.mascotadatos.a.${Date.now()}@pethub.cl`;
const emailB = `test.mascotadatos.b.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";

let tokenA, tokenB;
let mascotaId;

describe("Mascota: fecha de nacimiento y sexo al editar - Sprint 5", () => {
  // Prepara todo UNA vez: usuarios y una mascota sin esos datos
  beforeAll(async () => {
    await request(app).post("/api/auth/registro").send({ nombre: "Ana Mascota", email: emailA, password });
    await request(app).post("/api/auth/registro").send({ nombre: "Beto Mascota", email: emailB, password });
    const loginA = await request(app).post("/api/auth/login").send({ email: emailA, password });
    const loginB = await request(app).post("/api/auth/login").send({ email: emailB, password });
    tokenA = loginA.body.token;
    tokenB = loginB.body.token;

    const mascota = await request(app).post("/api/mascotas").set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "Luna", especie: "Perro", raza: "Labrador" });
    mascotaId = mascota.body.id;
  });

  // Limpieza al final, en orden de dependencias
  afterAll(async () => {
    const filtro = { in: [emailA, emailB] };
    await prisma.mascota.deleteMany({ where: { usuario: { email: filtro } } });
    await prisma.usuario.deleteMany({ where: { email: filtro } });
    await prisma.$disconnect();
  });

  test("PUT /api/mascotas/:id agrega fecha de nacimiento y sexo", async () => {
    const res = await request(app).put(`/api/mascotas/${mascotaId}`).set("Authorization", `Bearer ${tokenA}`)
      .send({ fechaNacimiento: "2021-09-12", sexo: "macho" });
    expect(res.status).toBe(200);
    expect(res.body.fechaNacimiento).toBe("2021-09-12T00:00:00.000Z");
    expect(res.body.sexo).toBe("macho");
    expect(res.body.nombre).toBe("Luna"); // lo demás no cambia
  });

  test("PUT /api/mascotas/:id guarda el sexo en minúsculas", async () => {
    const res = await request(app).put(`/api/mascotas/${mascotaId}`).set("Authorization", `Bearer ${tokenA}`)
      .send({ sexo: "Hembra" });
    expect(res.status).toBe(200);
    expect(res.body.sexo).toBe("hembra");
  });

  test("PUT /api/mascotas/:id sin esos campos no los borra", async () => {
    const res = await request(app).put(`/api/mascotas/${mascotaId}`).set("Authorization", `Bearer ${tokenA}`)
      .send({ raza: "Golden" });
    expect(res.status).toBe(200);
    expect(res.body.raza).toBe("Golden");
    expect(res.body.sexo).toBe("hembra"); // sigue igual
    expect(res.body.fechaNacimiento).toBe("2021-09-12T00:00:00.000Z"); // sigue igual
  });

  test("PUT /api/mascotas/:id rechaza una fecha de nacimiento inválida", async () => {
    const res = await request(app).put(`/api/mascotas/${mascotaId}`).set("Authorization", `Bearer ${tokenA}`)
      .send({ fechaNacimiento: "no-es-una-fecha" });
    expect(res.status).toBe(400);
  });

  test("PUT /api/mascotas/:id rechaza una fecha de nacimiento futura", async () => {
    const res = await request(app).put(`/api/mascotas/${mascotaId}`).set("Authorization", `Bearer ${tokenA}`)
      .send({ fechaNacimiento: "2999-01-01" });
    expect(res.status).toBe(400);
  });

  test("PUT /api/mascotas/:id rechaza un sexo que no es macho ni hembra", async () => {
    const res = await request(app).put(`/api/mascotas/${mascotaId}`).set("Authorization", `Bearer ${tokenA}`)
      .send({ sexo: "otro" });
    expect(res.status).toBe(400);
  });

  test("PUT /api/mascotas/:id rechaza editar la mascota de otra persona", async () => {
    const res = await request(app).put(`/api/mascotas/${mascotaId}`).set("Authorization", `Bearer ${tokenB}`)
      .send({ sexo: "macho" });
    expect(res.status).toBe(404);
  });

  test("PUT /api/mascotas/:id con texto vacío borra fecha y sexo", async () => {
    const res = await request(app).put(`/api/mascotas/${mascotaId}`).set("Authorization", `Bearer ${tokenA}`)
      .send({ fechaNacimiento: "", sexo: "" });
    expect(res.status).toBe(200);
    expect(res.body.fechaNacimiento).toBeNull();
    expect(res.body.sexo).toBeNull();
  });
});

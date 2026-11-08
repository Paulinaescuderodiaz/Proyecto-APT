const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

// Dos usuarios: A recibe avisos de varios tipos; B no recibe ninguno
const emailA = `test.notiftipo.a.${Date.now()}@pethub.cl`;
const emailB = `test.notiftipo.b.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";

let tokenA, tokenB;
let idCita; // la notificación de tipo "cita" de A

describe("Notificaciones: filtro por tipo - Sprint 5", () => {
  // Prepara todo UNA vez: usuarios y tres avisos de distinto tipo para A
  beforeAll(async () => {
    await request(app).post("/api/auth/registro").send({ nombre: "Ana Avisos", email: emailA, password });
    await request(app).post("/api/auth/registro").send({ nombre: "Beto Avisos", email: emailB, password });
    const loginA = await request(app).post("/api/auth/login").send({ email: emailA, password });
    const loginB = await request(app).post("/api/auth/login").send({ email: emailB, password });
    tokenA = loginA.body.token;
    tokenB = loginB.body.token;

    // Los avisos se crean directo en la base de datos para probar el filtro con varios tipos
    const usuarioA = await prisma.usuario.findUnique({ where: { email: emailA } });
    await prisma.notificacion.createMany({
      data: [
        { usuarioId: usuarioA.id, tipo: "solicitud_compatible", mensaje: "Hay una solicitud compatible" },
        { usuarioId: usuarioA.id, tipo: "recordatorio_vacuna", mensaje: "Luna tiene un refuerzo próximo" },
        { usuarioId: usuarioA.id, tipo: "cita", mensaje: "Tienes una cita agendada" },
      ],
    });
    const cita = await prisma.notificacion.findFirst({ where: { usuarioId: usuarioA.id, tipo: "cita" } });
    idCita = cita.id;
  });

  // Limpieza al final
  afterAll(async () => {
    const filtro = { in: [emailA, emailB] };
    await prisma.notificacion.deleteMany({ where: { usuario: { email: filtro } } });
    await prisma.usuario.deleteMany({ where: { email: filtro } });
    await prisma.$disconnect();
  });

  test("Sin filtro devuelve todos los avisos del usuario", async () => {
    const res = await request(app).get("/api/notificaciones").set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  test("?tipo=cita devuelve solo los avisos de citas", async () => {
    const res = await request(app).get("/api/notificaciones?tipo=cita").set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].tipo).toBe("cita");
  });

  test("?tipo=recordatorio_vacuna devuelve solo los recordatorios de vacunas", async () => {
    const res = await request(app).get("/api/notificaciones?tipo=recordatorio_vacuna").set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].tipo).toBe("recordatorio_vacuna");
  });

  test("El tipo no distingue mayúsculas ni espacios sobrantes", async () => {
    const res = await request(app).get("/api/notificaciones?tipo=%20CITA%20").set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].tipo).toBe("cita");
  });

  test("Un tipo que no existe devuelve una lista vacía", async () => {
    const res = await request(app).get("/api/notificaciones?tipo=inexistente").set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("Un tipo vacío se ignora y devuelve todos los avisos", async () => {
    const res = await request(app).get("/api/notificaciones?tipo=").set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  test("El filtro por tipo se combina con leida", async () => {
    // Marcamos el aviso de cita como leído
    const marcar = await request(app).put(`/api/notificaciones/${idCita}/leida`).set("Authorization", `Bearer ${tokenA}`);
    expect(marcar.status).toBe(200);

    const noLeidas = await request(app).get("/api/notificaciones?tipo=cita&leida=false").set("Authorization", `Bearer ${tokenA}`);
    expect(noLeidas.body).toEqual([]);

    const leidas = await request(app).get("/api/notificaciones?tipo=cita&leida=true").set("Authorization", `Bearer ${tokenA}`);
    expect(leidas.body).toHaveLength(1);
  });

  test("Otro usuario no ve los avisos de A aunque filtre por tipo", async () => {
    const res = await request(app).get("/api/notificaciones?tipo=cita").set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("El filtro por tipo sin token es rechazado", async () => {
    const res = await request(app).get("/api/notificaciones?tipo=cita");
    expect(res.status).toBe(401);
  });
});

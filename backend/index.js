require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./src/routes/auth.routes");
const mascotaRoutes = require("./src/routes/mascota.routes");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({ mensaje: "Pethub backend funcionando" });
});

app.use("/api/auth", authRoutes);
app.use("/api/mascotas", mascotaRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

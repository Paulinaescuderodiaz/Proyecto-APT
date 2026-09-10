require("dotenv").config();
const express = require("express");
const authRoutes = require("./src/routes/auth.routes");

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ mensaje: "Pethub backend funcionando" });
});

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

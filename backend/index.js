const express = require('express');
const app = express();
const PORT = 3000;

// Middleware: permite que el servidor entienda JSON en las peticiones
app.use(express.json());

// Ruta de prueba, para confirmar que el servidor está vivo
app.get('/', (req, res) => {
  res.json({ mensaje: 'Pethub backend funcionando 🐾' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
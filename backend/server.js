require('dotenv').config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const app = express();

app.set('case sensitive routing', false);

app.use(cors());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});



app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.sendStatus(200);
});



app.use(express.json());


async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS matriculas (
        id TEXT PRIMARY KEY,
        contexto TEXT,
        data TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("Tabela 'matriculas' verificada/criada com sucesso!");
  } catch (error) {
    console.error("Erro ao criar tabela:", error);
  }
}

initDB();

// 🟢 Obter todas as matrículas
app.get("/matriculas", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM matriculas");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erro no servidor");
  }
});


// 🟢 Adicionar uma nova matrícula
app.post("/matriculas", async (req, res) => {
  try {
    const { id, contexto } = req.body;

    if (!id) {
      return res.status(400).json({ error: "O campo matrícula é obrigatório" });
    }

    const newMatricula = await pool.query(
      "INSERT INTO matriculas (id, contexto) VALUES ($1, $2) RETURNING *",
      [id, contexto]
    );

    res.json(newMatricula.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Erro ao adicionar matrícula" });
  }
});


// 🟢 Apagar uma matrícula
app.delete("/matriculas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM matriculas WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Matrícula não encontrada" });
    }

    res.json({ message: "Matrícula apagada com sucesso" });
  } catch (error) {
    console.error("Erro ao apagar matrícula:", error);
    res.status(500).json({ error: "Erro ao apagar matrícula" });
  }
});

app.put("/matriculas/:id", async (req, res) => {

  try {
    const oldId = req.params.id.toLowerCase();
    const { id: newId, contexto } = req.body;

    const result = await pool.query(
      "UPDATE matriculas SET id = $1, contexto = $2 WHERE LOWER(id) = $3 RETURNING *",
      [newId.toLowerCase(), contexto, oldId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Matrícula não encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao editar matrícula:", error);
    res.status(500).json({ error: "Erro ao editar matrícula" });
  }
});






const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});

require('dotenv').config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const app = express();
const db = require("./db");

app.use(cors());
app.use(express.json());


async function initDB() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS matriculas (
        id TEXT PRIMARY KEY,
        contexto TEXT
      );
    `);
    console.log("Tabela 'matriculas' verificada/criada com sucesso!");
  } catch (error) {
    console.error("Erro ao criar tabela:", error);
  }
}

initDB();


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


// 🟢 Obter todas as matrículas
app.get("/matriculas", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM matriculas ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Erro ao buscar matrículas" });
  }
});

// 🟢 Adicionar uma nova matrícula
app.post("/matriculas", async (req, res) => {
  try {
    const { id, contexto } = req.body;
    await pool.query("INSERT INTO matriculas (id, contexto) VALUES ($1, $2)", [id, contexto || ""]);
    res.json({ message: "Matrícula adicionada!" });
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



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});

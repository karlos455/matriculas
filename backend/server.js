require('dotenv').config();
const express = require("express");
const cors = require("cors");
const https = require("https");
const { URLSearchParams } = require("url");
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
        cor TEXT,
        data TIMESTAMP DEFAULT NOW(),
        ultima_vista TIMESTAMP,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION
      );
    `);

    await pool.query(
      "ALTER TABLE matriculas ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION"
    );

    await pool.query(
      "ALTER TABLE matriculas ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION"
    );

    await pool.query(`
      CREATE TABLE IF NOT EXISTS historico_vistos (
        id SERIAL PRIMARY KEY,
        matricula_id TEXT REFERENCES matriculas(id) ON DELETE CASCADE,
        data TIMESTAMP DEFAULT NOW(),
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        address TEXT
      );
    `);

    await pool.query(
      "ALTER TABLE historico_vistos ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION"
    );

    await pool.query(
      "ALTER TABLE historico_vistos ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION"
    );

    await pool.query(
      "ALTER TABLE historico_vistos ADD COLUMN IF NOT EXISTS address TEXT"
    );
    console.log("Tabela 'matriculas' verificada/criada com sucesso!");
  } catch (error) {
    console.error("Erro ao criar tabela:", error);
  }
}

initDB();


async function reverseGeocode(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const params = new URLSearchParams({
    format: "jsonv2",
    lat: latitude.toString(),
    lon: longitude.toString(),
    zoom: "18",
    addressdetails: "1",
  });

  const options = {
    hostname: "nominatim.openstreetmap.org",
    path: `/reverse?${params.toString()}`,
    headers: {
      "User-Agent": "matricula-app/1.0 (+https://matriculas.casadocarlos.info)",
      "Accept-Language": "pt-PT",
    },
  };

  return new Promise((resolve) => {
    const request = https.get(options, (response) => {
      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        if (response.statusCode !== 200) {
          return resolve(null);
        }

        try {
          const parsed = JSON.parse(data);
          resolve(parsed?.display_name ?? null);
        } catch (err) {
          console.warn("⚠️ Erro ao interpretar resposta do reverse geocode:", err);
          resolve(null);
        }
      });
    });

    request.on("error", (error) => {
      console.warn("⚠️ Erro na chamada de reverse geocode:", error);
      resolve(null);
    });

    request.setTimeout(5000, () => {
      request.destroy();
      resolve(null);
    });
  });
}


// Adicionar matricula como vista

app.put("/matriculas/:id/visto", async (req, res) => {
  try {
    const id = req.params.id.toLowerCase();
    const now = new Date();
    const { latitude, longitude } = req.body || {};

    const normalizedLatitude =
      typeof latitude === "number" ? latitude : parseFloat(latitude);
    const normalizedLongitude =
      typeof longitude === "number" ? longitude : parseFloat(longitude);

    const finalLatitude = Number.isFinite(normalizedLatitude)
      ? normalizedLatitude
      : null;
    const finalLongitude = Number.isFinite(normalizedLongitude)
      ? normalizedLongitude
      : null;

    let address = null;

    if (finalLatitude !== null && finalLongitude !== null) {
      try {
        address = await reverseGeocode(finalLatitude, finalLongitude);
      } catch (error) {
        console.warn("⚠️ Erro ao obter endereço para o histórico:", error);
      }
    }

    // Atualiza a última vista
    const updateResult = await pool.query(
      "UPDATE matriculas SET ultima_vista = $1, latitude = COALESCE($2, latitude), longitude = COALESCE($3, longitude) WHERE LOWER(id) = $4 RETURNING *",
      [now, finalLatitude, finalLongitude, id]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: "Matrícula não encontrada" });
    }

    // Insere no histórico
    await pool.query(
      "INSERT INTO historico_vistos (matricula_id, data, latitude, longitude, address) VALUES ($1, $2, $3, $4, $5)",
      [id, now, finalLatitude, finalLongitude, address]
    );

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error("Erro ao atualizar última vista e guardar histórico:", error);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Historico matriculas

app.get("/matriculas/:id/historico", async (req, res) => {
  try {
    const id = req.params.id.toLowerCase();
    const result = await pool.query(
      "SELECT * FROM historico_vistos WHERE matricula_id = $1 ORDER BY data DESC",
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    res.status(500).json({ error: "Erro no servidor" });
  }
});



// 🟢 Obter todas as matrículas
app.get("/matriculas", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM matriculas ORDER BY data DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erro no servidor");
  }
});


// 🟢 Adicionar uma nova matrícula
app.post("/matriculas", async (req, res) => {
  try {
    const { id, contexto, cor, latitude, longitude } = req.body;

    if (!id) {
      return res.status(400).json({ error: "O campo matrícula é obrigatório" });
    }

    const normalizedLatitude =
      typeof latitude === "number" ? latitude : parseFloat(latitude);
    const normalizedLongitude =
      typeof longitude === "number" ? longitude : parseFloat(longitude);

    const finalLatitude = Number.isFinite(normalizedLatitude)
      ? normalizedLatitude
      : null;
    const finalLongitude = Number.isFinite(normalizedLongitude)
      ? normalizedLongitude
      : null;

    const newMatricula = await pool.query(
      "INSERT INTO matriculas (id, contexto, cor, latitude, longitude) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [id.toLowerCase(), contexto, cor, finalLatitude, finalLongitude]
    );
    const created = newMatricula.rows[0];
    console.log(
      `[MATRICULAS] Adicionada ${created?.id ?? id} | Cor: ${created?.cor ?? cor ?? "sem-cor"}`
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
    console.log(`[MATRICULAS] Apagada ${id.toLowerCase()}`);
    res.json({ message: "Matrícula apagada com sucesso" });
  } catch (error) {
    console.error("Erro ao apagar matrícula:", error);
    res.status(500).json({ error: "Erro ao apagar matrícula" });
  }
});

app.put("/matriculas/:id", async (req, res) => {

  try {
    const oldId = req.params.id.toLowerCase();
    const { id: newId, contexto, cor, latitude, longitude } = req.body;

    const normalizedLatitude =
      typeof latitude === "number" ? latitude : parseFloat(latitude);
    const normalizedLongitude =
      typeof longitude === "number" ? longitude : parseFloat(longitude);

    const result = await pool.query(
      "UPDATE matriculas SET id = $1, contexto = $2, cor = $3, latitude = COALESCE($4, latitude), longitude = COALESCE($5, longitude) WHERE LOWER(id) = $6 RETURNING *",
      [
        newId.toLowerCase(),
        contexto,
        cor,
        Number.isFinite(normalizedLatitude) ? normalizedLatitude : null,
        Number.isFinite(normalizedLongitude) ? normalizedLongitude : null,
        oldId,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Matrícula não encontrada" });
    }
    console.log(
      `[MATRICULAS] Atualizada ${oldId} -> ${result.rows[0]?.id ?? newId} | Cor: ${result.rows[0]?.cor ?? cor ?? "sem-cor"}`
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao editar matrícula:", error);
    res.status(500).json({ error: "Erro ao editar matrícula" });
  }
});


app.post("/matriculas/security/login-lock", (req, res) => {
  const { ip, lockUntil } = req.body || {};

  const lockDate = new Date(Number(lockUntil));
  const lockDateStr = Number.isFinite(lockDate.getTime())
    ? lockDate.toISOString()
    : "desconhecido";

  console.log(`[SECURITY] IP ${ip ?? "desconhecido"} bloqueado até ${lockDateStr}`);

  res.status(204).end();
});





const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});

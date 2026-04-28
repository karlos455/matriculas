require('dotenv').config();
const express = require("express");
const cors = require("cors");
const https = require("https");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const sharp = require("sharp");
const { URLSearchParams } = require("url");
const pool = require("./db");
const app = express();

const UPLOADS_DIR = path.join(__dirname, "uploads");
const MATRICULAS_UPLOADS_DIR = path.join(UPLOADS_DIR, "matriculas");

console.log("[UPLOADS] __dirname:", __dirname);
console.log("[UPLOADS] UPLOADS_DIR:", UPLOADS_DIR);
console.log("[UPLOADS] MATRICULAS_UPLOADS_DIR:", MATRICULAS_UPLOADS_DIR);

fs.mkdirSync(MATRICULAS_UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Formato de imagem inválido"));
    }

    cb(null, true);
  },
});

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
app.use("/uploads", express.static(UPLOADS_DIR));


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
      longitude DOUBLE PRECISION,
      foto_url TEXT
    );
  `);

    await pool.query(
      "ALTER TABLE matriculas ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION"
    );

    await pool.query(
      "ALTER TABLE matriculas ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION"
    );

    await pool.query(
  "ALTER TABLE matriculas ADD COLUMN IF NOT EXISTS foto_url TEXT"
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

// Apagar uma entrada específica do histórico
app.delete("/matriculas/:id/historico/:historicoId", async (req, res) => {
  try {
    const matriculaId = req.params.id.toLowerCase();
    const historicoId = Number(req.params.historicoId);

    if (!Number.isInteger(historicoId)) {
      return res.status(400).json({ error: "ID de histórico inválido" });
    }

    const result = await pool.query(
      "DELETE FROM historico_vistos WHERE id = $1 AND LOWER(matricula_id) = $2 RETURNING *",
      [historicoId, matriculaId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Entrada de histórico não encontrada" });
    }

    const latestSeen = await pool.query(
      "SELECT data, latitude, longitude FROM historico_vistos WHERE LOWER(matricula_id) = $1 ORDER BY data DESC LIMIT 1",
      [matriculaId]
    );

    if (latestSeen.rowCount > 0) {
      await pool.query(
        "UPDATE matriculas SET ultima_vista = $1, latitude = COALESCE($2, latitude), longitude = COALESCE($3, longitude) WHERE LOWER(id) = $4",
        [
          latestSeen.rows[0].data,
          latestSeen.rows[0].latitude,
          latestSeen.rows[0].longitude,
          matriculaId,
        ]
      );
    } else {
      await pool.query(
        "UPDATE matriculas SET ultima_vista = NULL WHERE LOWER(id) = $1",
        [matriculaId]
      );
    }

    console.log(`[MATRICULAS] Histórico ${historicoId} apagado da matrícula ${matriculaId}`);

    res.json({ message: "Entrada de histórico apagada com sucesso" });
  } catch (error) {
    console.error("Erro ao apagar entrada do histórico:", error);
    res.status(500).json({ error: "Erro ao apagar entrada do histórico" });
  }
});

// Upload ou substituição da foto da matrícula
app.post("/matriculas/:id/foto", upload.single("foto"), async (req, res) => {
  try {
    const id = req.params.id.toLowerCase();

    if (!req.file) {
      return res.status(400).json({ error: "Nenhuma foto enviada" });
    }

    const matriculaResult = await pool.query(
      "SELECT * FROM matriculas WHERE LOWER(id) = $1",
      [id]
    );

    if (matriculaResult.rowCount === 0) {
      return res.status(404).json({ error: "Matrícula não encontrada" });
    }

    const filename = `${id}.jpg`;
    const outputPath = path.join(MATRICULAS_UPLOADS_DIR, filename);
    const fotoUrl = `/uploads/matriculas/${filename}`;

    await sharp(req.file.buffer)
      .rotate()
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 72,
        mozjpeg: true,
      })
      .toFile(outputPath);

    const updateResult = await pool.query(
      "UPDATE matriculas SET foto_url = $1 WHERE LOWER(id) = $2 RETURNING *",
      [fotoUrl, id]
    );

    console.log(`[MATRICULAS] Foto atualizada para ${id}: ${fotoUrl}`);

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error("Erro ao guardar foto da matrícula:", error);
    res.status(500).json({ error: "Erro ao guardar foto da matrícula" });
  }
});

// Apagar foto da matrícula
app.delete("/matriculas/:id/foto", async (req, res) => {
  try {
    const id = req.params.id.toLowerCase();
    const filename = `${id}.jpg`;
    const filePath = path.join(MATRICULAS_UPLOADS_DIR, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const result = await pool.query(
      "UPDATE matriculas SET foto_url = NULL WHERE LOWER(id) = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Matrícula não encontrada" });
    }

    console.log(`[MATRICULAS] Foto removida de ${id}`);

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao apagar foto da matrícula:", error);
    res.status(500).json({ error: "Erro ao apagar foto da matrícula" });
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


// 🟢 Apagar uma matrícula e a respetiva foto
app.delete("/matriculas/:id", async (req, res) => {
  try {
    const id = req.params.id.toLowerCase();

    const existingResult = await pool.query(
      "SELECT foto_url FROM matriculas WHERE LOWER(id) = $1",
      [id]
    );

    if (existingResult.rowCount === 0) {
      return res.status(404).json({ error: "Matrícula não encontrada" });
    }

    const fotoUrl = existingResult.rows[0]?.foto_url;

    const result = await pool.query(
      "DELETE FROM matriculas WHERE LOWER(id) = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Matrícula não encontrada" });
    }

    if (fotoUrl) {
      const filename = path.basename(fotoUrl);
      const filePath = path.join(MATRICULAS_UPLOADS_DIR, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[MATRICULAS] Foto apagada: ${filePath}`);
      }
    }

    console.log(`[MATRICULAS] Apagada ${id}`);

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

app.get("/matriculas/stats/summary", async (req, res) => {
  try {
    const total = await pool.query("SELECT COUNT(*)::int AS total FROM matriculas");

    const vistasHoje = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM historico_vistos
      WHERE data::date = CURRENT_DATE
    `);

    const maisVista = await pool.query(`
      SELECT 
        m.id,
        m.contexto,
        m.cor,
        COUNT(h.id)::int AS total_vistos
      FROM matriculas m
      LEFT JOIN historico_vistos h ON LOWER(h.matricula_id) = LOWER(m.id)
      GROUP BY m.id, m.contexto, m.cor
      ORDER BY total_vistos DESC
      LIMIT 1
    `);

    const ultimaVista = await pool.query(`
      SELECT 
        m.id,
        m.ultima_vista
      FROM matriculas m
      WHERE m.ultima_vista IS NOT NULL
      ORDER BY m.ultima_vista DESC
      LIMIT 1
    `);

    res.json({
      total: total.rows[0]?.total ?? 0,
      vistasHoje: vistasHoje.rows[0]?.total ?? 0,
      maisVista: maisVista.rows[0] ?? null,
      ultimaVista: ultimaVista.rows[0] ?? null,
    });
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
    res.status(500).json({ error: "Erro ao obter estatísticas" });
  }
});


// Estatísticas: matrículas mais vistas
app.get("/matriculas/stats/mais-vistas", async (req, res) => {
    try {
    const result = await pool.query(`
      SELECT
        m.id,
        m.contexto,
        m.cor,
        m.ultima_vista,
        COUNT(h.id)::int AS total_vistos
      FROM matriculas m
      LEFT JOIN historico_vistos h
        ON LOWER(h.matricula_id) = LOWER(m.id)
      GROUP BY m.id, m.contexto, m.cor, m.ultima_vista
      HAVING COUNT(h.id) > 0
      ORDER BY total_vistos DESC, m.ultima_vista DESC
      LIMIT 10
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao obter matrículas mais vistas:", error);
    res.status(500).json({ error: "Erro ao obter matrículas mais vistas" });
  }
});


app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});

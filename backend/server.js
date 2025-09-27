require('dotenv').config();
const express = require("express");
const cors = require("cors");
const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URLSearchParams } = require("url");
const pool = require("./db");
const app = express();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const IS_AUTH_CONFIGURED = typeof ADMIN_PASSWORD === "string" && ADMIN_PASSWORD.length > 0;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const sessions = new Map();
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos
const BLOCK_LOG_FILE = process.env.BLOCK_LOG_FILE || path.join(__dirname, "blocked.log");

function logBlockEvent(ip, blockedUntil) {
  if (!ip) return;

  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] IP ${ip} bloqueado até ${new Date(blockedUntil).toISOString()}\n`;

  fs.appendFile(BLOCK_LOG_FILE, message, (err) => {
    if (err) {
      console.warn("⚠️ Não foi possível registar o bloqueio:", err.message);
    }
  });
}

function generateSessionToken() {
  return crypto.randomBytes(48).toString("hex");
}

function registerSession(token) {
  sessions.set(token, { expiresAt: Date.now() + TOKEN_TTL_MS });
}

function validateSession(token) {
  const session = sessions.get(token);
  if (!session) {
    return false;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return false;
  }

  session.expiresAt = Date.now() + TOKEN_TTL_MS;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt <= now) {
      sessions.delete(token);
    }
  }
  for (const [key, attempt] of loginAttempts.entries()) {
    if (
      (!attempt.blockedUntil || attempt.blockedUntil <= now) &&
      (!attempt.firstAttemptAt || attempt.firstAttemptAt + ATTEMPT_WINDOW_MS <= now)
    ) {
      loginAttempts.delete(key);
    }
  }
}, 60 * 60 * 1000).unref();

if (!IS_AUTH_CONFIGURED) {
  console.warn("⚠️ ADMIN_PASSWORD não está definido; os endpoints ficarão abertos sem autenticação.");
}

function authMiddleware(req, res, next) {
  if (!IS_AUTH_CONFIGURED) {
    return next();
  }

  if (req.method === "OPTIONS") {
    return next();
  }

  const header = req.headers?.authorization;
  const token = typeof header === "string" && header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (token && validateSession(token)) {
    return next();
  }

  return res.status(401).json({ error: "Não autorizado" });
}

app.set('case sensitive routing', false);

app.use(cors());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});



app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.sendStatus(200);
});



app.use(express.json());

app.post("/auth/login", (req, res) => {
  if (!IS_AUTH_CONFIGURED) {
    return res.status(500).json({ error: "Autenticação não configurada" });
  }

  const clientKey = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip;
  const now = Date.now();
  const record = loginAttempts.get(clientKey);

  if (record?.blockedUntil && record.blockedUntil > now) {
    const retryAfterSecs = Math.ceil((record.blockedUntil - now) / 1000);
    return res.status(429).json({ error: "Muitas tentativas. Tenta novamente mais tarde.", retryAfter: retryAfterSecs });
  }

  const { username, password } = req.body || {};

  if (ADMIN_USERNAME && ADMIN_USERNAME.length > 0 && username !== ADMIN_USERNAME) {
    const response = handleFailedAttempt(clientKey, now, record);
    return res.status(response.status).json(response.body);
  }

  if (typeof password !== "string" || password !== ADMIN_PASSWORD) {
    const response = handleFailedAttempt(clientKey, now, record);
    return res.status(response.status).json(response.body);
  }

  const token = generateSessionToken();
  registerSession(token);
  loginAttempts.delete(clientKey);

  res.json({ token, expiresIn: TOKEN_TTL_MS });
});

function handleFailedAttempt(key, now, record) {
  const withinWindow = record && record.firstAttemptAt + ATTEMPT_WINDOW_MS > now;
  const current = withinWindow
    ? { ...record }
    : { attempts: 0, firstAttemptAt: now, blockedUntil: null };

  current.attempts += 1;

  if (current.attempts >= MAX_ATTEMPTS) {
    current.blockedUntil = now + BLOCK_DURATION_MS;
    current.attempts = 0;
    current.firstAttemptAt = now;
    loginAttempts.set(key, current);
    logBlockEvent(key, current.blockedUntil);
    return {
      status: 429,
      body: {
        error: "Excedeste o número de tentativas. Aguarda alguns minutos antes de tentar novamente.",
        retryAfter: Math.ceil(BLOCK_DURATION_MS / 1000),
      },
    };
  }

  loginAttempts.set(key, current);

  return {
    status: 401,
    body: {
      error: "Credenciais inválidas",
      attemptsRemaining: MAX_ATTEMPTS - current.attempts,
    },
  };
}

app.use("/matriculas", authMiddleware);


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

import React, { useState, useEffect, useRef } from "react";
import {
  TextField, Button, Card, CardContent, Dialog, DialogTitle, DialogContent,
  List, ListItem, ListItemButton, ListItemText, Typography, Box,
  IconButton, Snackbar, Alert, Link, MenuItem
} from "@mui/material";
import { Add, List as ListIcon, BarChart, PhotoCamera } from "@mui/icons-material";
import { Edit } from "@mui/icons-material";
import { Grow } from "@mui/material";
import { History } from "@mui/icons-material";



const API_URL = "https://matriculas.casadocarlos.info/matriculas";
const API_BASE_URL = "https://matriculas.casadocarlos.info";

const ui = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    color: "#0f172a",
  },

  container: {
    maxWidth: 720,
    mx: "auto",
    px: 2,
    py: 3,
  },

headerCard: {
  position: { xs: "sticky", sm: "sticky" },
  top: 0,
  zIndex: 20,
  backgroundColor: "rgba(255, 255, 255, 0.96)",
  backdropFilter: "blur(12px)",
  border: "1px solid #e2e8f0",
  borderRadius: { xs: 0, sm: 4 },
  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
  p: { xs: 2, sm: 3 },
  mb: 3,
  mx: { xs: -2, sm: 0 },
},

  mainCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
    p: 2,
  },

  primaryButton: {
    backgroundColor: "#0f172a",
    color: "#ffffff",
    fontWeight: 700,
    textTransform: "none",
    borderRadius: 2,
    px: 3,
    py: 1.2,
    "&:hover": {
      backgroundColor: "#1e293b",
    },
  },

  secondaryButton: {
    backgroundColor: "#ffffff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    fontWeight: 700,
    textTransform: "none",
    borderRadius: 2,
    px: 3,
    py: 1.2,
    "&:hover": {
      backgroundColor: "#f1f5f9",
      borderColor: "#94a3b8",
    },
  },

  successButton: {
    backgroundColor: "#166534",
    color: "#ffffff",
    fontWeight: 700,
    textTransform: "none",
    borderRadius: 2,
    px: 3,
    py: 1.2,
    "&:hover": {
      backgroundColor: "#14532d",
    },
  },
};


// ---------------------  PAGINA LOGIN  ---------------------

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Verifica se já existe um login guardado
    const storedAuth = localStorage.getItem("isAuthenticated");
    if (storedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    localStorage.setItem("isAuthenticated", "true"); // Guarda login
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated"); // Apaga login
    setIsAuthenticated(false);
  };

  return (
    <Box>
      {isAuthenticated ? <MatriculaSearch handleLogout={handleLogout} /> : <SplashScreen handleLogin={handleLogin} />}
    </Box>
  );
}

// **Splash Screen de Login**

function SplashScreen({ handleLogin }) {
  const MAX_FAILED_ATTEMPTS = 5;
  const LOCK_DURATION_MS = 60_000;
  const SECURITY_STORAGE_KEY = "loginSecurity";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("error");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(null);
  const [lockRemaining, setLockRemaining] = useState(0);
  const [clientIp, setClientIp] = useState(null);
  const [securityReady, setSecurityReady] = useState(false);
  const loginButtonRef = useRef(null);
  const lastReportedLockRef = useRef(null);
  const clearSecurityStateRef = useRef(() => {});
  
  useEffect(() => {
    if (loginButtonRef.current) {
      loginButtonRef.current.focus(); // Dá foco ao botão "Entrar"
    }
  }, []);

  const isLocked = lockRemaining > 0;

  useEffect(() => {
    let isMounted = true;

    const readSecurityState = (ip) => {
      if (!isMounted || !ip) return;
      const storageKey = `${SECURITY_STORAGE_KEY}:${ip}`;
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        setFailedAttempts(0);
        setLockUntil(null);
        setLockRemaining(0);
        return;
      }

      try {
        const parsed = JSON.parse(stored);
        const storedFailedAttempts = Number.isFinite(parsed?.failedAttempts)
          ? parsed.failedAttempts
          : 0;
        const storedLockUntil =
          typeof parsed?.lockUntil === "number" ? parsed.lockUntil : null;

        if (storedLockUntil && storedLockUntil > Date.now()) {
          setLockUntil(storedLockUntil);
          setLockRemaining(storedLockUntil - Date.now());
          setFailedAttempts(
            Math.min(Math.max(storedFailedAttempts, 0), MAX_FAILED_ATTEMPTS)
          );
        } else {
          const sanitizedAttempts = Math.min(
            Math.max(storedFailedAttempts, 0),
            MAX_FAILED_ATTEMPTS
          );
          setFailedAttempts(sanitizedAttempts);
          setLockUntil(null);
          setLockRemaining(0);
          if (sanitizedAttempts === 0) {
            localStorage.removeItem(storageKey);
          }
        }
      } catch (error) {
        console.error("Erro ao restaurar estado de segurança:", error);
        localStorage.removeItem(storageKey);
        setFailedAttempts(0);
        setLockUntil(null);
        setLockRemaining(0);
      }
    };

    const fetchClientIp = async () => {
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        if (!response.ok) {
          throw new Error("Falha ao obter IP");
        }
        const data = await response.json();
        if (!isMounted) return;
        const ip = data?.ip || "unknown";
        setClientIp(ip);
        readSecurityState(ip);
      } catch (error) {
        console.error("Erro ao obter IP do cliente:", error);
        if (!isMounted) return;
        const fallbackIp = "local-fallback";
        setClientIp(fallbackIp);
        readSecurityState(fallbackIp);
      } finally {
        if (isMounted) {
          setSecurityReady(true);
        }
      }
    };

    fetchClientIp();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    clearSecurityStateRef.current = () => {
      if (!clientIp) return;
      const storageKey = `${SECURITY_STORAGE_KEY}:${clientIp}`;
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.warn("⚠️ Erro ao limpar estado de segurança:", error);
      }
      lastReportedLockRef.current = null;
    };
  }, [clientIp]);

  useEffect(() => {
    if (!clientIp) return;
    const storageKey = `${SECURITY_STORAGE_KEY}:${clientIp}`;
    if (!lockUntil && failedAttempts === 0) {
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.warn("⚠️ Erro ao limpar estado de segurança:", error);
      }
      return;
    }

    const payload = {
      failedAttempts,
      lockUntil,
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {
      console.error("Erro ao guardar estado de segurança:", error);
    }
  }, [clientIp, failedAttempts, lockUntil]);

  useEffect(() => {
    if (!lockUntil) {
      setLockRemaining(0);
      return undefined;
    }

    const updateLockRemaining = () => {
      const remaining = lockUntil - Date.now();

      if (remaining <= 0) {
        setLockUntil(null);
        setLockRemaining(0);
      } else {
        setLockRemaining(remaining);
      }
    };

    updateLockRemaining();
    const intervalId = setInterval(updateLockRemaining, 1000);

    return () => clearInterval(intervalId);
  }, [lockUntil]);

  const openSnackbar = (message, severity = "error") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const login = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      if (!securityReady) {
        openSnackbar("Aguarde enquanto verificamos a segurança...", "info");
        return;
      }

      if (isLocked) {
        openSnackbar(
          `Muitas tentativas. Tente novamente em ${Math.ceil(lockRemaining / 1000)} segundos.`,
          "warning"
        );
        return;
      }

      const adminUsername = process.env.REACT_APP_ADMIN_USERNAME;
      const adminPassword = process.env.REACT_APP_ADMIN_PASSWORD;

      if (username === adminUsername && password === adminPassword) {
        clearSecurityStateRef.current();
        setFailedAttempts(0);
        setLockUntil(null);
        setLockRemaining(0);
        handleLogin();
      } else {
        const nextFailedAttempts = failedAttempts + 1;
        if (nextFailedAttempts >= MAX_FAILED_ATTEMPTS) {
          const until = Date.now() + LOCK_DURATION_MS;
          setFailedAttempts(0);
          setLockUntil(until);
          setLockRemaining(LOCK_DURATION_MS);
          openSnackbar(
            "Muitas tentativas falhadas. O login foi temporariamente bloqueado.",
            "warning"
          );
        } else {
          setFailedAttempts(nextFailedAttempts);
          const remainingAttempts = MAX_FAILED_ATTEMPTS - nextFailedAttempts;
          openSnackbar(
            `Credenciais inválidas! ${remainingAttempts} tentativa${
              remainingAttempts === 1 ? "" : "s"
            } restante${remainingAttempts === 1 ? "" : "s"}.`,
            "error"
          );
        }
      }
    }
  };

  useEffect(() => {
    if (!clientIp || !lockUntil) return;
    if (lockUntil <= Date.now()) return;

    const reportedKey = `${clientIp}:${lockUntil}`;
    if (lastReportedLockRef.current === reportedKey) return;
    lastReportedLockRef.current = reportedKey;

    const notifyLock = async () => {
      try {
        await fetch(`${API_URL}/security/login-lock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip: clientIp, lockUntil }),
        });
      } catch (error) {
        console.warn("⚠️ Falha ao reportar bloqueio de IP:", error);
      }
    };

    notifyLock();
  }, [clientIp, lockUntil]);

  return (
    <Box sx={{
      display: "flex", justifyContent: "center", alignItems: "center", height: "100vh",
      backgroundImage: "url('https://picsum.photos/1920/1200')",
      backgroundSize: "cover", backgroundPosition: "center", textAlign: "center"
    }}>
      <Card sx={{
        padding: 4, boxShadow: 3, backdropFilter: "blur(10px)",
        background: "rgba(255, 255, 255, 0.2)"
      }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>Bem-vindo</Typography>
        <TextField
          label="Username"
          fullWidth
          onChange={(e) => setUsername(e.target.value)}
          sx={{ mb: 2 }}
          onKeyDown={login} // Permite pressionar Enter para login
          disabled={isLocked || !securityReady}
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2 }}
          onKeyDown={login} // Permite pressionar Enter para login
          disabled={isLocked || !securityReady}
        />
        <Button
          variant="contained"
          fullWidth
          onClick={login}
          disabled={isLocked || !securityReady}
          ref={loginButtonRef} // Define o botão como referência para o focus automático
        >
          {!securityReady
            ? "Aguarde..."
            : isLocked
            ? `Bloqueado (${Math.ceil(lockRemaining / 1000)}s)`
            : "Entrar"}
        </Button>
        {securityReady && failedAttempts > 0 && !isLocked && (
          <Typography variant="body2" sx={{ mt: 2 }}>
            {`Tentativas restantes: ${MAX_FAILED_ATTEMPTS - failedAttempts}`}
          </Typography>
        )}
        {!securityReady && (
          <Typography variant="body2" sx={{ mt: 2 }}>
            A preparar segurança de login...
          </Typography>
        )}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarSeverity}
            sx={{ width: "100%" }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Card>
    </Box>
  );
}

// ---------------------  PAGINA PRINCIPAL  ---------------------

function MatriculaSearch({ handleLogout }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [matriculas, setMatriculas] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [matriculaToDelete, setMatriculaToDelete] = useState(null);
  const [newMatricula, setNewMatricula] = useState("");
  const [newContexto, setNewContexto] = useState("");
  const [alertOpen, setAlertOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [matriculaOriginal, setMatriculaOriginal] = useState("");
  const [successToast, setSuccessToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteToast, setDeleteToast] = useState(false);
  const [successSeenToast, setSuccessSeenToast] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoAtual, setHistoricoAtual] = useState([]);
  const [matriculaEmFoco, setMatriculaEmFoco] = useState(null);
  const [deleteHistoricoConfirmOpen, setDeleteHistoricoConfirmOpen] = useState(false);
  const [historicoToDelete, setHistoricoToDelete] = useState(null); 
  const [successAddedToast, setSuccessAddedToast] = useState(false);
  const [highlightCard, setHighlightCard] = useState(false);
  const hasLocation =
    Number.isFinite(selected?.latitude) && Number.isFinite(selected?.longitude);
  const googleMapsLink = hasLocation
    ? `https://www.google.com/maps?q=${selected?.latitude},${selected?.longitude}`
    : null;
  const appleMapsLink = hasLocation
    ? `https://maps.apple.com/?ll=${selected?.latitude},${selected?.longitude}`
    : null;
  const [cor, setCor] = useState(""); 
  const [estadoCartao, setEstadoCartao] = useState("normal");
  const [sortMode, setSortMode] = useState("data_desc");
  const [statsOpen, setStatsOpen] = useState(false);
  const [maisVistas, setMaisVistas] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [listTitle, setListTitle] = useState("Lista de Matrículas");
  const [listFilter, setListFilter] = useState("all");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoToast, setPhotoToast] = useState(false);
  const [photoDeletedToast, setPhotoDeletedToast] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(Date.now());
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [deletePhotoConfirmOpen, setDeletePhotoConfirmOpen] = useState(false);

 const fetchMaisVistas = async () => {
  setStatsLoading(true);

  try {
const response = await fetch(`${API_URL}/stats/mais-vistas`);
    if (!response.ok) {
      throw new Error("Erro ao carregar matrículas mais vistas");
    }

    const data = await response.json();
    setMaisVistas(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("❌ Erro ao carregar matrículas mais vistas:", error);
    setMaisVistas([]);
  } finally {
    setStatsLoading(false);
  }
}; 

  const requestCurrentLocation = () =>
    new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("⚠️ Não foi possível obter a localização atual:", error);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

  const abrirHistorico = (id) => {
    if (!id) return;

    const idFormatado = id.toLowerCase();

    fetch(`${API_URL}/${idFormatado}/historico`)
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao buscar histórico");
        return res.json();
      })
      .then((data) => {
        setHistoricoAtual(Array.isArray(data) ? data : []);
        setMatriculaEmFoco(id.toUpperCase());
        setHistoricoOpen(true);
      })
      .catch((err) => console.error("❌ Erro ao buscar histórico:", err));
  };
  
  const confirmDeleteHistorico = (historicoId) => {
  setHistoricoToDelete(historicoId);
  setDeleteHistoricoConfirmOpen(true);
};

const apagarEntradaHistorico = async (historicoId) => {
  if (!matriculaEmFoco || !historicoId) return;

  const idFormatado = matriculaEmFoco.toLowerCase();

  try {
    const res = await fetch(`${API_URL}/${idFormatado}/historico/${historicoId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Erro ao apagar entrada do histórico");
    }

    setHistoricoAtual((prev) =>
      prev.filter((item) => item.id !== historicoId)
    );

    fetchMatriculas();

    if (selected?.id?.toLowerCase() === idFormatado) {
      const updatedRes = await fetch(`${API_URL}`);
      const updatedData = await updatedRes.json();

      const updatedSelected = updatedData.find(
        (m) => m.id.toLowerCase() === idFormatado
      );

      if (updatedSelected) {
        setSelected(updatedSelected);
      }
    }

    setDeleteHistoricoConfirmOpen(false);
    setHistoricoToDelete(null);
  } catch (error) {
    console.error("❌ Erro ao apagar entrada do histórico:", error);
  }
};

  const handleSelect = (matricula) => {
    setSelected(matricula);
    setSearch("");
    setIsListOpen(false);
    setHighlightCard(true);
    setTimeout(() => setHighlightCard(false), 800);
  };

  const filtered = search.trim() && !selected
    ? matriculas.filter((m) =>
        m.id.toLowerCase().includes(search.toLowerCase()) ||
        m.contexto?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  // **Buscar todas as matrículas**
  const fetchMatriculas = () => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setMatriculas(data))
      .catch((error) => console.error("❌ Erro ao buscar matrículas:", error));
  };

  useEffect(() => {
    fetchMatriculas();
  }, []);

  // **Listar todas**
const listarTodas = () => {
  fetchMatriculas();
  setListTitle("Lista de Matrículas");
  setListFilter("all");
  setIsListOpen(true);
};



  // **Marcar como visto por último**
  const marcarComoVisto = async (id) => {
    const idFormatado = id.toLowerCase();
    let coords = null;

    try {
      coords = await requestCurrentLocation();
    } catch (error) {
      console.error("❌ Erro ao obter localização atual:", error);
    }

    try {
      const res = await fetch(`${API_URL}/${idFormatado}/visto`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao marcar como visto");
      }

      const data = await res.json();

      fetchMatriculas();

      if (selected?.id.toLowerCase() === idFormatado) {
        setSelected(data);
      }

      setSuccessSeenToast(true);
    } catch (err) {
      console.error("❌ Erro ao atualizar visto:", err);
    }
  };

const uploadFotoMatricula = async (id, file) => {
  if (!id || !file) return;

  const idFormatado = id.toLowerCase();
  const formData = new FormData();

  formData.append("foto", file);

  setPhotoUploading(true);

  try {
    const response = await fetch(`${API_URL}/${idFormatado}/foto`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Erro ao enviar foto");
    }

    const updatedMatricula = await response.json();

    setSelected(updatedMatricula);
    setPhotoVersion(Date.now());
    fetchMatriculas();
    setPhotoToast(true);
  } catch (error) {
    console.error("❌ Erro ao enviar foto:", error);
  } finally {
    setPhotoUploading(false);
  }
};

const apagarFotoMatricula = async () => {
  if (!selected?.id) return;

  const idFormatado = selected.id.toLowerCase();

  try {
    const response = await fetch(`${API_URL}/${idFormatado}/foto`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Erro ao apagar foto");
    }
const updatedMatricula = await response.json();

setSelected({
  ...updatedMatricula,
  foto_url: null,
});

setMatriculas((prev) =>
  prev.map((m) =>
    m.id.toLowerCase() === idFormatado
      ? { ...m, ...updatedMatricula, foto_url: null }
      : m
  )
);

setPhotoVersion(Date.now());
fetchMatriculas();
setDeletePhotoConfirmOpen(false);
setPhotoPreviewOpen(false);
setPhotoDeletedToast(true);

  } catch (error) {
    console.error("❌ Erro ao apagar foto:", error);
  }
};

  // **Adicionar matrícula**
  const addMatricula = async () => {
    const idNormalizado = newMatricula.trim().toLowerCase();
    if (!idNormalizado) return;

    if (!isEditing && matriculas.some((m) => m.id.toLowerCase() === idNormalizado)) {
      setAlertOpen(true);
      return;
    }

    let contextoFinal = newContexto.trim();

    if (estadoCartao === "verde") contextoFinal = `✅ ${contextoFinal}`;
    else if (estadoCartao === "vermelho") contextoFinal = `⛔️ ${contextoFinal}`;

    const method = isEditing ? "PUT" : "POST";
    const url = isEditing ? `${API_URL}/${matriculaOriginal.toLowerCase()}` : API_URL;

    setLoading(true);

    try {
      let locationPayload = { latitude: null, longitude: null };

      if (isEditing) {
        const original = matriculas.find(
          (m) => m.id.toLowerCase() === matriculaOriginal.toLowerCase()
        );
        locationPayload = {
          latitude: original?.latitude ?? null,
          longitude: original?.longitude ?? null,
        };
      } else {
        const coords = await requestCurrentLocation();
        if (coords) {
          locationPayload = coords;
        }
      }

      const novaMatricula = {
        id: idNormalizado,
        contexto: contextoFinal,
        cor,
        latitude: locationPayload.latitude,
        longitude: locationPayload.longitude,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novaMatricula),
      });

      if (!response.ok) {
        throw new Error("Erro ao guardar matrícula");
      }

      const updatedMatricula = await response.json();

      fetchMatriculas();
      setNewMatricula("");
      setNewContexto("");
      setIsDialogOpen(false);

      if (
        isEditing &&
        selected?.id?.toLowerCase() === matriculaOriginal.toLowerCase()
      ) {
        setSelected(updatedMatricula);
      }

      setSelected(updatedMatricula);

      if (isEditing) {
        setSuccessToast(true);
      } else {
        setSuccessAddedToast(true);
      }
    } catch (error) {
      console.error("❌ Erro ao guardar matrícula:", error);
    } finally {
      setLoading(false);
    }
  };

  // ------- //

  // **Confirmar exclusão**
  const confirmDeleteMatricula = (id) => {
    setMatriculaToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const editMatricula = (matricula) => {
    setIsDialogOpen(true);
    setNewMatricula(matricula.id);
    setNewContexto(matricula.contexto?.replace(/✅|⛔️/g, "").trim());
    setCor(matricula.cor || "");
    setMatriculaOriginal(matricula.id);
    setIsEditing(true);
  
    if (matricula.contexto?.includes("✅")) {
      setEstadoCartao("verde");
    } else if (matricula.contexto?.includes("⛔️")) {
      setEstadoCartao("vermelho");
    } else {
      setEstadoCartao("normal");
    }
  };
  

  // **Apagar matrícula**
  const deleteMatricula = () => {
    if (!matriculaToDelete) return;

    const idFormatado = matriculaToDelete.toLowerCase();

    fetch(`${API_URL}/${idFormatado}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao apagar matrícula");

        setMatriculas((prev) => prev.filter((m) => m.id.toLowerCase() !== idFormatado));
        setDeleteConfirmOpen(false);
        setMatriculaToDelete(null);

        // Limpa o cartão se a matrícula visível for a apagada
        if (selected?.id.toLowerCase() === idFormatado) {
          setSelected(null);
        }


        setDeleteToast(true);
        setIsDialogOpen(false);
        setNewMatricula("");
        setNewContexto("");
        setIsEditing(false);

      })
      .catch((error) => console.error("❌ Erro ao apagar matrícula:", error));
  };

  const openStatsList = (title, filter) => {
  setListTitle(title);
  setListFilter(filter);
  setStatsOpen(false);
  setIsListOpen(true);
};

const openMatriculaFromStats = (id) => {
  const found = matriculas.find(
    (m) => m.id.toLowerCase() === id.toLowerCase()
  );

  if (found) {
    handleSelect(found);
    setStatsOpen(false);
  }
};

const todayKey = new Date().toLocaleDateString("pt-PT");

const filteredMatriculasByStats = matriculas.filter((m) => {
  const hasLocation = Number.isFinite(Number(m.latitude)) && Number.isFinite(Number(m.longitude));

  switch (listFilter) {
    case "permitido":
      return m.contexto?.includes("✅");

    case "atencao":
      return m.contexto?.includes("⛔️");

    case "normal":
      return !m.contexto?.includes("✅") && !m.contexto?.includes("⛔️");

    case "com_localizacao":
      return hasLocation;

    case "com_foto":
      return Boolean(m.foto_url);

    case "nunca_vistas":
      return !m.ultima_vista;

    case "vistas_hoje":
      if (!m.ultima_vista) return false;
      return new Date(m.ultima_vista).toLocaleDateString("pt-PT") === todayKey;

    case "all":
    default:
      return true;
  }
});

const sortedMatriculas = [...filteredMatriculasByStats].sort((a, b) => {
  switch (sortMode) {
    case "data_asc":
      return new Date(a.data) - new Date(b.data);

    case "abc_asc":
      return a.id.localeCompare(b.id, "pt-PT", { sensitivity: "base" });

    case "abc_desc":
      return b.id.localeCompare(a.id, "pt-PT", { sensitivity: "base" });

    case "ultima_vista_desc":
      return new Date(b.ultima_vista || 0) - new Date(a.ultima_vista || 0);

    case "data_desc":
    default:
      return new Date(b.data) - new Date(a.data);
  }
});


const stats = {
  total: matriculas.length,

  vistasHoje: matriculas.filter((m) => {
    if (!m.ultima_vista) return false;
    return new Date(m.ultima_vista).toLocaleDateString("pt-PT") === todayKey;
  }).length,

  normal: matriculas.filter(
    (m) => !m.contexto?.includes("✅") && !m.contexto?.includes("⛔️")
  ).length,

  permitido: matriculas.filter((m) => m.contexto?.includes("✅")).length,

  atencao: matriculas.filter((m) => m.contexto?.includes("⛔️")).length,

    comLocalizacao: matriculas.filter((m) => {
      const lat = Number(m.latitude);
      const lon = Number(m.longitude);
      return Number.isFinite(lat) && Number.isFinite(lon);
    }).length,

comFoto: matriculas.filter((m) => Boolean(m.foto_url)).length,

nuncaVistas: matriculas.filter((m) => !m.ultima_vista).length,

  nuncaVistas: matriculas.filter((m) => !m.ultima_vista).length,
};

const mostRecentSeen = [...matriculas]
  .filter((m) => m.ultima_vista)
  .sort((a, b) => new Date(b.ultima_vista) - new Date(a.ultima_vista))[0];

  return (
<Box sx={ui.page}>
  <Box sx={ui.container}>

<Box sx={ui.headerCard}>
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 2,
      mb: 2,
    }}
  >
    <Box sx={{ textAlign: "left" }}>
      <Typography
        variant="h4"
        fontWeight={800}
        sx={{ letterSpacing: "-0.03em", cursor: "pointer" }}
        onClick={() => {
          fetchMatriculas();
          setSelected(null);
          setSearch("");
        }}
      >
        Procurar
      </Typography>

      <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
        Pesquisa, histórico e registo
      </Typography>
    </Box>

    <Button
      variant="outlined"
      onClick={handleLogout}
      sx={{
        textTransform: "none",
        borderRadius: 2,
        fontWeight: 700,
      }}
    >
      Sair
    </Button>
  </Box>

  <TextField
    fullWidth
    value={search}
    onChange={(e) => {
      setSearch(e.target.value.trim());
      setSelected(null);
    }}
    sx={{
      "& .MuiOutlinedInput-root": {
        borderRadius: 3,
        backgroundColor: "#f8fafc",
      },
    }}
  />
</Box>



      {/* Lista de Resultados da Pesquisa */}
      {filtered.length > 0 && (
  <List sx={{ px: 0, pt: 1, maxHeight: 240, overflowY: "auto" }}>
    {filtered.map((m) => (
      <ListItem key={m.id} disablePadding>
        <ListItemButton
          onClick={() => handleSelect(m)}
          sx={{
            backgroundColor: m.contexto?.includes("✅")
              ? "#e6f4ea"
              : m.contexto?.includes("⛔️")
              ? "#fbeaea"
              : "#fefefe",
            "&:hover": {
              backgroundColor: m.contexto?.includes("✅")
                ? "#d2ebd9"
                : m.contexto?.includes("⛔️")
                ? "#f4dcdc"
                : "#f7f7f7",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
            },
            transition: "all 0.25s ease-in-out",
            borderRadius: 2,
            m: 1,
            px: 2,
            py: 1.5,
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          }}
        >
          <ListItemText
            primary={
              <Typography fontWeight="bold" sx={{ color: "#1b263b" }}>
                {m.id.toUpperCase()}
              </Typography>
            }
            secondary={
              <Typography variant="body2" sx={{ color: "#444", fontSize: "0.85rem" }}>
                {m.contexto?.replace(/✅|⛔️/g, "").trim()}
              </Typography>
            }
          />
        </ListItemButton>
      </ListItem>
    ))}
  </List>
)}



      {/* Cartão de Detalhes com animação */}
      {selected && (
        <Grow in={true} timeout={300}>
          <Box>
            {(() => {
              const isGreenHighlight = selected.contexto?.includes("✅");
              const isRedHighlight = selected.contexto?.includes("⛔️");

              return (
<Card
  sx={{
    mt: 4,
    borderRadius: 4,
    overflow: "hidden",
    border: highlightCard ? "2px solid #60a5fa" : "1px solid #e2e8f0",
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.10)",
    backgroundColor: "#ffffff",
    transition: "border 0.35s ease, box-shadow 0.35s ease",
  }}
>
  <Box
    sx={{
      height: 8,
      backgroundColor: isGreenHighlight
        ? "#16a34a"
        : isRedHighlight
        ? "#dc2626"
        : "#0f172a",
    }}
  />

  <CardContent sx={{ p: 3 }}>
    {selected.foto_url && (
  <Box
    sx={{
      mb: 2,
      borderRadius: 3,
      overflow: "hidden",
      border: "1px solid #e2e8f0",
      boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
      backgroundColor: "#f8fafc",
    }}
  >
      <Box
        component="img"
        src={`${API_BASE_URL}${selected.foto_url}?v=${photoVersion}`}
        alt={`Foto da matrícula ${selected.id}`}
        onClick={() => setPhotoPreviewOpen(true)}
        sx={{
          width: "100%",
          display: "block",
          maxHeight: 320,
          objectFit: "cover",
          cursor: "zoom-in",
        }}
      />
  </Box>
)}
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 2,
        mb: 2,
      }}
    >
      <Box sx={{ textAlign: "left" }}>
        <Typography
          variant="caption"
          sx={{
            color: "#64748b",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Matrícula
        </Typography>

        <Typography
          variant="h3"
          fontWeight={900}
          sx={{
            color: "#0f172a",
            letterSpacing: "0.04em",
            lineHeight: 1.05,
            mt: 0.5,
          }}
        >
          {selected.id.toUpperCase()}
        </Typography>
      </Box>

      <Box
        sx={{
          px: 1.5,
          py: 0.7,
          borderRadius: 999,
          fontSize: "0.8rem",
          fontWeight: 800,
          color: isGreenHighlight ? "#166534" : isRedHighlight ? "#991b1b" : "#334155",
          backgroundColor: isGreenHighlight
            ? "#dcfce7"
            : isRedHighlight
            ? "#fee2e2"
            : "#e2e8f0",
          whiteSpace: "nowrap",
        }}
      >
        {isGreenHighlight ? "Permitido" : isRedHighlight ? "Atenção" : "Normal"}
      </Box>
    </Box>

    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: selected.cor ? "1fr 1fr" : "1fr",
        gap: 2,
        mb: 2,
      }}
    >
      {selected.cor && (
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            textAlign: "left",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "#64748b",
              fontWeight: 700,
              display: "block",
              mb: 1,
            }}
          >
            Cor do carro
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                backgroundColor: selected.cor,
                border: "1px solid #94a3b8",
              }}
            />

            <Typography variant="body2" sx={{ color: "#0f172a", fontWeight: 700 }}>
              {selected.cor.charAt(0).toUpperCase() + selected.cor.slice(1)}
            </Typography>
          </Box>
        </Box>
      )}

      <Box
        sx={{
          p: 2,
          borderRadius: 3,
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          textAlign: "left",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: "#64748b",
            fontWeight: 700,
            display: "block",
            mb: 1,
          }}
        >
          Estado
        </Typography>

        <Typography variant="body2" sx={{ color: "#0f172a", fontWeight: 700 }}>
          {isGreenHighlight ? "Permitido" : isRedHighlight ? "Atenção" : "Normal"}
        </Typography>
      </Box>
    </Box>

    {selected.contexto?.replace(/✅|⛔️/g, "").trim() && (
      <Box
        sx={{
          p: 2,
          borderRadius: 3,
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          textAlign: "left",
          mb: 2,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: "#64748b",
            fontWeight: 700,
            display: "block",
            mb: 0.75,
          }}
        >
          Observações
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: "#334155",
            lineHeight: 1.6,
          }}
        >
          {selected.contexto?.replace(/✅|⛔️/g, "").trim()}
        </Typography>
      </Box>
    )}

    {hasLocation && (
      <Box sx={{ mt: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
            gap: 2,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "#64748b",
              fontWeight: 700,
            }}
          >
            Localização guardada
          </Typography>

          <Box sx={{ display: "flex", gap: 1 }}>
            {googleMapsLink && (
              <Button
                component="a"
                href={googleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                variant="text"
                size="small"
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Google Maps
              </Button>
            )}

            {appleMapsLink && (
              <Button
                component="a"
                href={appleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                variant="text"
                size="small"
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Apple Maps
              </Button>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.08)",
          }}
        >
          <iframe
            title={`Mapa da matrícula ${selected.id}`}
            src={`https://maps.google.com/maps?q=${selected.latitude},${selected.longitude}&z=16&output=embed`}
            width="100%"
            height="220"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
          />
        </Box>
      </Box>
    )}

    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: selected.ultima_vista ? "1fr 1fr" : "1fr",
        gap: 2,
        mt: 2,
      }}
    >
      <Box
        sx={{
          p: 2,
          borderRadius: 3,
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          textAlign: "left",
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "#64748b", fontWeight: 700, display: "block", mb: 0.5 }}
        >
          Adicionado em
        </Typography>

        <Typography variant="body2" sx={{ color: "#0f172a", fontWeight: 700 }}>
          {new Date(selected.data).toLocaleDateString("pt-PT", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          })}
        </Typography>

        <Typography variant="caption" sx={{ color: "#64748b" }}>
          às{" "}
          {new Date(selected.data).toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Typography>
      </Box>

      {selected.ultima_vista && (
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            textAlign: "left",
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: "#64748b", fontWeight: 700, display: "block", mb: 0.5 }}
          >
            Última vez visto
          </Typography>

          <Typography variant="body2" sx={{ color: "#0f172a", fontWeight: 700 }}>
            {new Date(selected.ultima_vista).toLocaleDateString("pt-PT", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })}
          </Typography>

          <Typography variant="caption" sx={{ color: "#64748b" }}>
            às{" "}
            {new Date(selected.ultima_vista).toLocaleTimeString("pt-PT", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Typography>
        </Box>
      )}
    </Box>

    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 1.5,
        mt: 3,
      }}
    >

      <Button
  variant="outlined"
  component="label"
  sx={{
    ...ui.secondaryButton,
    flex: "1 1 100%",
  }}
  disabled={photoUploading}
>
  {photoUploading
    ? "A enviar foto..."
    : selected.foto_url
    ? "Substituir foto"
    : "Adicionar foto"}

  <input
    type="file"
    hidden
    accept="image/*"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) {
        uploadFotoMatricula(selected.id, file);
      }
      e.target.value = "";
    }}
  />
</Button>

      <Button
        variant="contained"
        sx={{
          ...ui.successButton,
          flex: "1 1 160px",
        }}
        onClick={() => marcarComoVisto(selected.id)}
      >
        Visto agora
      </Button>

      <Button
        variant="outlined"
        sx={{
          ...ui.secondaryButton,
          flex: "1 1 160px",
        }}
        onClick={() => abrirHistorico(selected.id)}
      >
        Histórico
      </Button>

      <Button
        variant="contained"
        sx={{
          ...ui.primaryButton,
          flex: "1 1 100%",
        }}
        onClick={() => editMatricula(selected)}
      >
        Editar
      </Button>
    </Box>
  </CardContent>
</Card>

              );
            })()}
          </Box>
        </Grow>
      )}

{/* Botões de Ação */}
<Box
  sx={{
    display: "flex",
    flexDirection: { xs: "column", sm: "row" },
    justifyContent: "center",
    gap: 1.5,
    mt: 2,
  }}
>
  <Button
    variant="contained"
    startIcon={<Add />}
    onClick={() => {
      if (!isEditing) {
        setNewMatricula(search);
        setEstadoCartao("normal");
      }
      setIsDialogOpen(true);
    }}
    sx={{
      ...ui.primaryButton,
      width: { xs: "100%", sm: "auto" },
    }}
  >
    Adicionar
  </Button>

  <Button
    variant="outlined"
    startIcon={<ListIcon />}
    onClick={listarTodas}
    sx={{
      ...ui.secondaryButton,
      width: { xs: "100%", sm: "auto" },
    }}
  >
    Listar todas
  </Button>

<Button
  variant="outlined"
  startIcon={<BarChart />}
  onClick={() => {
    setStatsOpen(true);
    fetchMaisVistas();
  }}
  sx={{
    ...ui.secondaryButton,
    width: { xs: "100%", sm: "auto" },
  }}
>
  Estatísticas
</Button>


</Box>

{/* Dialog Adicionar/Editar Matrícula */}
<Dialog
  open={isDialogOpen}
  onClose={() => {
    setIsDialogOpen(false);
    setNewMatricula("");
    setNewContexto("");
    setIsEditing(false);
  }}
  fullWidth
  maxWidth="sm"
  PaperProps={{
    sx: {
      mx: 2,
      borderRadius: 4,
      overflow: "hidden",
    },
  }}
>
  <DialogTitle
    sx={{
      px: 3,
      py: 2.5,
      backgroundColor: "#0f172a",
      color: "#ffffff",
    }}
  >
    <Typography variant="h6" fontWeight={800}>
      {isEditing ? "Editar matrícula" : "Adicionar matrícula"}
    </Typography>

    <Typography variant="body2" sx={{ color: "#cbd5e1", mt: 0.5 }}>
      {isEditing
        ? "Atualiza os dados associados a esta matrícula."
        : "Regista uma nova matrícula com observações, cor e estado."}
    </Typography>
  </DialogTitle>

  <DialogContent
    sx={{
      backgroundColor: "#f8fafc",
      p: 2,
    }}
  >
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          p: 2,
          borderRadius: 3,
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: "block",
            color: "#64748b",
            fontWeight: 800,
            mb: 1,
          }}
        >
          Identificação
        </Typography>

        <TextField
          label="Matrícula"
          fullWidth
          required
          value={newMatricula}
          onChange={(e) => setNewMatricula(e.target.value)}
          variant="outlined"
          InputLabelProps={{ shrink: true }}
          disabled={isEditing}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              backgroundColor: isEditing ? "#f1f5f9" : "#ffffff",
            },
          }}
        />

        {isEditing && (
          <Typography variant="caption" sx={{ color: "#64748b", mt: 1, display: "block" }}>
            A matrícula não pode ser alterada durante a edição.
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          p: 2,
          borderRadius: 3,
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: "block",
            color: "#64748b",
            fontWeight: 800,
            mb: 1,
          }}
        >
          Observações
        </Typography>

        <TextField
          label="Observações"
          fullWidth
          multiline
          minRows={3}
          value={newContexto}
          onChange={(e) => setNewContexto(e.target.value)}
          variant="outlined"
          InputLabelProps={{ shrink: true }}
          placeholder="Ex: carro preto, costuma estacionar perto da entrada..."
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              backgroundColor: "#ffffff",
            },
          }}
        />
      </Box>

      <Box
        sx={{
          p: 2,
          borderRadius: 3,
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: "block",
            color: "#64748b",
            fontWeight: 800,
            mb: 1,
          }}
        >
          Cor do carro
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 1.2,
          }}
        >
          {[
            { value: "", label: "Sem cor", color: "transparent" },
            { value: "white", label: "Branco", color: "#ffffff" },
            { value: "black", label: "Preto", color: "#111827" },
            { value: "gray", label: "Cinzento", color: "#6b7280" },
            { value: "silver", label: "Prata", color: "#c0c0c0" },
            { value: "red", label: "Vermelho", color: "#dc2626" },
            { value: "blue", label: "Azul", color: "#2563eb" },
            { value: "green", label: "Verde", color: "#16a34a" },
            { value: "yellow", label: "Amarelo", color: "#facc15" },
          ].map((colorOption) => {
            const isSelected = cor === colorOption.value;

            return (
              <Box
                key={colorOption.value || "sem-cor"}
                onClick={() => setCor(colorOption.value)}
                sx={{
                  p: 1,
                  borderRadius: 3,
                  border: isSelected ? "2px solid #0f172a" : "1px solid #e2e8f0",
                  backgroundColor: isSelected ? "#f1f5f9" : "#ffffff",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    backgroundColor: "#f8fafc",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    mx: "auto",
                    mb: 0.7,
                    backgroundColor: colorOption.color,
                    border:
                      colorOption.value === ""
                        ? "2px dashed #94a3b8"
                        : colorOption.value === "white"
                        ? "1px solid #94a3b8"
                        : "1px solid transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748b",
                    fontSize: "0.75rem",
                    fontWeight: 900,
                  }}
                >
                  {colorOption.value === "" ? "×" : ""}
                </Box>

                <Typography
                  variant="caption"
                  sx={{
                    color: "#334155",
                    fontWeight: isSelected ? 800 : 600,
                    lineHeight: 1.1,
                  }}
                >
                  {colorOption.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box
        sx={{
          p: 2,
          borderRadius: 3,
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: "block",
            color: "#64748b",
            fontWeight: 800,
            mb: 1,
          }}
        >
          Estado do cartão
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1,
          }}
        >
          {[
            {
              valor: "normal",
              label: "Normal",
              description: "Sem destaque especial",
              bg: "#f8fafc",
              color: "#334155",
            },
            {
              valor: "verde",
              label: "Permitido",
              description: "Cartão marcado a verde",
              bg: "#dcfce7",
              color: "#166534",
            },
            {
              valor: "vermelho",
              label: "Atenção",
              description: "Cartão marcado a vermelho",
              bg: "#fee2e2",
              color: "#991b1b",
            },
          ].map((estado) => {
            const isSelected = estadoCartao === estado.valor;

            return (
              <Box
                key={estado.valor}
                onClick={() => setEstadoCartao(estado.valor)}
                sx={{
                  flex: 1,
                  p: 1.5,
                  borderRadius: 3,
                  border: isSelected ? "2px solid #0f172a" : "1px solid #e2e8f0",
                  backgroundColor: isSelected ? estado.bg : "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    backgroundColor: estado.bg,
                  },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 900,
                    color: estado.color,
                  }}
                >
                  {estado.label}
                </Typography>

                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    color: "#64748b",
                    mt: 0.25,
                  }}
                >
                  {estado.description}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          mt: 0.5,
        }}
      >
        <Button
          variant="contained"
          onClick={addMatricula}
          disabled={loading}
          sx={{
            ...ui.primaryButton,
            width: "100%",
            py: 1.4,
            fontSize: "1rem",
          }}
        >
          {loading ? "A guardar..." : isEditing ? "Guardar alterações" : "Adicionar matrícula"}
        </Button>

        {isEditing && (
          <Button
            variant="contained"
            color="error"
            onClick={() => confirmDeleteMatricula(newMatricula)}
            sx={{
              width: "100%",
              py: 1.4,
              fontSize: "1rem",
              fontWeight: 800,
              textTransform: "none",
              borderRadius: 2,
              backgroundColor: "#dc2626",
              "&:hover": {
                backgroundColor: "#b91c1c",
              },
            }}
          >
            Apagar matrícula
          </Button>
        )}

        <Button
          variant="text"
          onClick={() => {
            setIsDialogOpen(false);
            setNewMatricula("");
            setNewContexto("");
            setIsEditing(false);
          }}
          sx={{
            width: "100%",
            textTransform: "none",
            fontWeight: 800,
            color: "#64748b",
          }}
        >
          Cancelar
        </Button>
      </Box>
    </Box>
  </DialogContent>
</Dialog>

{/* Dialog para Listar Matrículas */}
<Dialog open={isListOpen} onClose={() => setIsListOpen(false)} fullWidth maxWidth="sm">
<DialogTitle
  sx={{
    fontSize: "1.4rem",
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.5,
    color: "#1b263b"
  }}
>
  {listTitle}
</DialogTitle>

<DialogContent>
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 2,
      mb: 2,
      flexWrap: "wrap",
    }}
  >
    <Typography variant="body2" sx={{ color: "#64748b" }}>
{sortedMatriculas.length} matrícula{sortedMatriculas.length === 1 ? "" : "s"}
    </Typography>

    <TextField
      select
      size="small"
      label="Organizar"
      value={sortMode}
      onChange={(e) => setSortMode(e.target.value)}
      sx={{
        minWidth: 190,
        "& .MuiOutlinedInput-root": {
          borderRadius: 2,
          backgroundColor: "#f8fafc",
        },
      }}
    >
      <MenuItem value="data_desc">Mais recentes</MenuItem>
      <MenuItem value="data_asc">Mais antigas</MenuItem>
      <MenuItem value="abc_asc">A-Z</MenuItem>
      <MenuItem value="abc_desc">Z-A</MenuItem>
      <MenuItem value="ultima_vista_desc">Última vez visto</MenuItem>
    </TextField>
  </Box>
    <Box sx={{ overflowX: "auto" }}>
      <List sx={{ p: 0 }}>
          {sortedMatriculas.map((m) => {
          const isGreenHighlight = m.contexto?.includes("✅");
          const isRedHighlight = m.contexto?.includes("⛔️");
          return (
              <Card
                key={m.id}
                sx={{
                  mb: 2,
                  p: 2,
                  borderRadius: 3,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                  cursor: "pointer",
                  backgroundColor: isGreenHighlight
                    ? "#e6f4ea"
                    : isRedHighlight
                    ? "#fbeaea"
                    : "#fcfcfc",
                  border: "1px solid #e0e0e0",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                    backgroundColor: isGreenHighlight
                      ? "#d2ebd9"
                      : isRedHighlight
                      ? "#f4dcdc"
                      : "#f7f7f7"
                  }
                }}
                      onClick={() => {
                        handleSelect(m);
                        setIsListOpen(false);
                      }}              >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Box sx={{ textAlign: "left" }}>
                      <Typography variant="h6" fontWeight="bold" sx={{ fontSize: "1.1rem", color: "#1b263b", letterSpacing: 0.5 }}>
                          {m.id.toUpperCase()}
                        </Typography>
                        {m.cor && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <Box
                          sx={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            backgroundColor: m.cor,
                            border: "1px solid #999"
                          }}
                        />
                    <Typography variant="caption" sx={{ color: "#444", fontStyle: "italic" }}>
                      {m.cor.charAt(0).toUpperCase() + m.cor.slice(1)}
                    </Typography>

                      </Box>
                    )}


                      {m.contexto && (
                        <Typography variant="body2" sx={{ color: "#444", mt: 0.5 }}>
                          {m.contexto?.replace(/✅|⛔️/g, "").trim()}
                        </Typography>

                      )}
                        {m.data && (
                          <Typography variant="caption" sx={{ fontSize: "0.75rem", color: "#888", mt: 0.5 }}>
                          Adicionado em: {new Date(m.data).toLocaleDateString("pt-PT", {
                              weekday: "long",
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit"
                            })}, às {new Date(m.data).toLocaleTimeString("pt-PT", {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </Typography>
                        )}
                        {m.ultima_vista && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mt: 0.5 }}
                          >
                            Última vez visto: {new Date(m.ultima_vista).toLocaleDateString("pt-PT", {
                              weekday: "long",
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit"
                            })}, às {new Date(m.ultima_vista).toLocaleTimeString("pt-PT", {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </Typography>
                        )}
                      </Box>

<Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
  <IconButton
    onClick={(e) => { e.stopPropagation(); editMatricula(m); }}
    sx={{
      p: 1,
      transition: "all 0.2s ease-in-out",
      color: "#1b263b",
      "&:hover": {
        transform: "scale(1.15)",
        backgroundColor: "#f0f4f8"
      }
    }}
  >
    <Edit fontSize="small" />
  </IconButton>

  <IconButton
    onClick={(e) => { e.stopPropagation(); abrirHistorico(m.id); }}
    sx={{
      p: 1,
      transition: "all 0.2s ease-in-out",
      color: "#1b263b",
      "&:hover": {
        transform: "scale(1.15)",
        backgroundColor: "#f0f4f8"
      }
    }}
  >
    <History fontSize="small" />
  </IconButton>

  {m.foto_url && (
    <IconButton
      onClick={(e) => {
        e.stopPropagation();
        handleSelect(m);
      }}
      sx={{
        p: 1,
        transition: "all 0.2s ease-in-out",
        color: "#1b263b",
        "&:hover": {
          transform: "scale(1.15)",
          backgroundColor: "#f0f4f8"
        }
      }}
    >
      <PhotoCamera fontSize="small" />
    </IconButton>
  )}
</Box>

                    </Box>
                  </Card>
          );
        })}
      </List>
    </Box>
  </DialogContent>
</Dialog>

{/* Dialog para Confirmar Apagar Matrícula */}
<Dialog
  open={deleteConfirmOpen}
  onClose={() => {
    setDeleteConfirmOpen(false);
    setMatriculaToDelete(null);
  }}
  fullWidth
  maxWidth="xs"
  PaperProps={{
    sx: {
      mx: 2,
      borderRadius: 4,
      overflow: "hidden",
    },
  }}
>
  <DialogTitle
    sx={{
      px: 3,
      py: 2.5,
      backgroundColor: "#0f172a",
      color: "#ffffff",
    }}
  >
    <Typography variant="h6" fontWeight={800}>
      Apagar matrícula?
    </Typography>

    <Typography variant="body2" sx={{ color: "#cbd5e1", mt: 0.5 }}>
      Esta ação remove a matrícula e todo o histórico associado.
    </Typography>
  </DialogTitle>

  <DialogContent
    sx={{
      backgroundColor: "#f8fafc",
      p: 2,
    }}
  >
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        backgroundColor: "#ffffff",
        border: "1px solid #e2e8f0",
        mb: 2,
      }}
    >
      <Typography variant="body2" sx={{ color: "#334155", lineHeight: 1.5 }}>
        Queres mesmo apagar esta matrícula?
      </Typography>

      {matriculaToDelete && (
        <Typography
          variant="h5"
          fontWeight={900}
          sx={{
            color: "#0f172a",
            letterSpacing: "0.06em",
            mt: 1,
          }}
        >
          {matriculaToDelete.toUpperCase()}
        </Typography>
      )}
    </Box>

    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Button
        variant="contained"
        color="error"
        fullWidth
        onClick={deleteMatricula}
        sx={{
          py: 1.3,
          fontWeight: 800,
          textTransform: "none",
          borderRadius: 2,
          backgroundColor: "#dc2626",
          "&:hover": {
            backgroundColor: "#b91c1c",
          },
        }}
      >
        Sim, apagar
      </Button>

      <Button
        variant="outlined"
        fullWidth
        onClick={() => {
          setDeleteConfirmOpen(false);
          setMatriculaToDelete(null);
        }}
        sx={{
          py: 1.3,
          fontWeight: 800,
          textTransform: "none",
          borderRadius: 2,
          borderColor: "#cbd5e1",
          color: "#0f172a",
          backgroundColor: "#ffffff",
          "&:hover": {
            backgroundColor: "#f1f5f9",
            borderColor: "#94a3b8",
          },
        }}
      >
        Cancelar
      </Button>
    </Box>
  </DialogContent>
</Dialog>


 {/* Dialog para ver Histórico */}
<Dialog
  open={historicoOpen}
  onClose={() => {
    setHistoricoOpen(false);
    setHistoricoAtual([]);
    setMatriculaEmFoco(null);
  }}
  fullWidth
  maxWidth="sm"
  PaperProps={{
    sx: {
      mx: 2,
      borderRadius: 4,
      overflow: "hidden",
    },
  }}
>
  <DialogTitle
    sx={{
      px: 3,
      py: 2.5,
      backgroundColor: "#0f172a",
      color: "#ffffff",
    }}
  >
    <Typography variant="h6" fontWeight={800}>
      Histórico de visualizações
    </Typography>

    <Typography variant="body2" sx={{ color: "#cbd5e1", mt: 0.5 }}>
      {matriculaEmFoco || ""}
    </Typography>
  </DialogTitle>

  <DialogContent
    sx={{
      backgroundColor: "#f8fafc",
      p: 2,
    }}
  >
    {historicoAtual.length === 0 ? (
      <Box
        sx={{
          p: 3,
          borderRadius: 3,
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          textAlign: "center",
        }}
      >
        <Typography variant="body1" fontWeight={700} sx={{ color: "#0f172a" }}>
          Sem histórico disponível
        </Typography>

        <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
          Ainda não existem visualizações registadas para esta matrícula.
        </Typography>
      </Box>
    ) : (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {historicoAtual.map((item, index) => {
          const latitudeNumber = Number(item.latitude);
          const longitudeNumber = Number(item.longitude);
          const hasCoordenadas =
            Number.isFinite(latitudeNumber) && Number.isFinite(longitudeNumber);

          const itemDate = new Date(item.data);

          const dateText = itemDate.toLocaleDateString("pt-PT", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          });

          const timeText = itemDate.toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          });

          const googleMapsLink = hasCoordenadas
            ? `https://www.google.com/maps?q=${latitudeNumber},${longitudeNumber}`
            : null;

          const addressText = item.address?.trim();

          return (
            <Card
              key={`${item.data}-${index}`}
              sx={{
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
                backgroundColor: "#ffffff",
                overflow: "hidden",
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 42,
                      height: 42,
                      borderRadius: "50%",
                      backgroundColor: "#e2e8f0",
                      color: "#0f172a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: "0.9rem",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    {index + 1}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 1,
                        flexDirection: { xs: "column", sm: "row" },
                      }}
                    >
                      <Box>
                        <Typography
                          variant="body1"
                          fontWeight={800}
                          sx={{ color: "#0f172a" }}
                        >
                          {dateText}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{ color: "#64748b", mt: 0.25 }}
                        >
                          às {timeText}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          px: 1.2,
                          py: 0.5,
                          borderRadius: 999,
                          backgroundColor: hasCoordenadas ? "#dcfce7" : "#fee2e2",
                          color: hasCoordenadas ? "#166534" : "#991b1b",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {hasCoordenadas ? "Com localização" : "Sem localização"}
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        mt: 1.5,
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          color: "#64748b",
                          fontWeight: 700,
                          mb: 0.5,
                        }}
                      >
                        Local
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{
                          color: "#334155",
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                        }}
                      >
                        {hasCoordenadas
                          ? addressText && addressText.length > 0
                            ? addressText
                            : `${latitudeNumber.toFixed(6)}, ${longitudeNumber.toFixed(6)}`
                          : "Localização não disponível"}
                      </Typography>
                    </Box>

<Box
  sx={{
    display: "flex",
    flexDirection: "column",
    gap: 1,
    mt: 1.5,
  }}
>
  {hasCoordenadas && (
    <Button
      component="a"
      href={googleMapsLink}
      target="_blank"
      rel="noopener noreferrer"
      variant="outlined"
      fullWidth
      sx={{
        textTransform: "none",
        borderRadius: 2,
        fontWeight: 800,
        borderColor: "#cbd5e1",
        color: "#0f172a",
        backgroundColor: "#ffffff",
        "&:hover": {
          backgroundColor: "#f1f5f9",
          borderColor: "#94a3b8",
        },
      }}
    >
      Abrir no Google Maps
    </Button>
  )}
<Button
  variant="text"
  fullWidth
  onClick={() => confirmDeleteHistorico(item.id)}
  sx={{
    textTransform: "none",
    borderRadius: 2,
    fontWeight: 800,
    color: "#dc2626",
    "&:hover": {
      backgroundColor: "#fee2e2",
    },
  }}
>
  Apagar esta visualização
</Button>

</Box>


                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    )}
  </DialogContent>
</Dialog>

{/* Dialog para Confirmar Apagar Entrada do Histórico */}
<Dialog
  open={deleteHistoricoConfirmOpen}
  onClose={() => {
    setDeleteHistoricoConfirmOpen(false);
    setHistoricoToDelete(null);
  }}
  fullWidth
  maxWidth="xs"
  PaperProps={{
    sx: {
      mx: 2,
      borderRadius: 4,
      overflow: "hidden",
    },
  }}
>
  <DialogTitle
    sx={{
      px: 3,
      py: 2.5,
      backgroundColor: "#0f172a",
      color: "#ffffff",
    }}
  >
    <Typography variant="h6" fontWeight={800}>
      Apagar visualização?
    </Typography>

    <Typography variant="body2" sx={{ color: "#cbd5e1", mt: 0.5 }}>
      Esta ação remove esta entrada do histórico.
    </Typography>
  </DialogTitle>

  <DialogContent
    sx={{
      backgroundColor: "#f8fafc",
      p: 2,
    }}
  >
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        backgroundColor: "#ffffff",
        border: "1px solid #e2e8f0",
        mb: 2,
      }}
    >
      <Typography variant="body2" sx={{ color: "#334155", lineHeight: 1.5 }}>
        Queres mesmo apagar esta visualização do histórico?
      </Typography>
    </Box>

    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Button
        variant="contained"
        color="error"
        fullWidth
        onClick={() => apagarEntradaHistorico(historicoToDelete)}
        sx={{
          py: 1.3,
          fontWeight: 800,
          textTransform: "none",
          borderRadius: 2,
          backgroundColor: "#dc2626",
          "&:hover": {
            backgroundColor: "#b91c1c",
          },
        }}
      >
        Sim, apagar
      </Button>

      <Button
        variant="outlined"
        fullWidth
        onClick={() => {
          setDeleteHistoricoConfirmOpen(false);
          setHistoricoToDelete(null);
        }}
        sx={{
          py: 1.3,
          fontWeight: 800,
          textTransform: "none",
          borderRadius: 2,
          borderColor: "#cbd5e1",
          color: "#0f172a",
          backgroundColor: "#ffffff",
          "&:hover": {
            backgroundColor: "#f1f5f9",
            borderColor: "#94a3b8",
          },
        }}
      >
        Cancelar
      </Button>
    </Box>
  </DialogContent>
</Dialog>

{/* Dialog de Estatísticas */}
<Dialog
  open={statsOpen}
  onClose={() => setStatsOpen(false)}
  fullWidth
  maxWidth="sm"
  PaperProps={{
    sx: {
      mx: 2,
      borderRadius: 4,
      overflow: "hidden",
    },
  }}
>
  <DialogTitle
    sx={{
      px: 3,
      py: 2.5,
      backgroundColor: "#0f172a",
      color: "#ffffff",
    }}
  >
    <Typography variant="h6" fontWeight={800}>
      Estatísticas
    </Typography>

    <Typography variant="body2" sx={{ color: "#cbd5e1", mt: 0.5 }}>
      Resumo rápido das matrículas registadas
    </Typography>
  </DialogTitle>

  <DialogContent
    sx={{
      backgroundColor: "#f8fafc",
      p: 2,
    }}
  >
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr" },
        gap: 1.5,
      }}
    >
{[
  { label: "Total", value: stats.total, filter: "all", title: "Todas as Matrículas" },
  { label: "Vistas hoje", value: stats.vistasHoje, filter: "vistas_hoje", title: "Matrículas vistas hoje" },
  { label: "Normal", value: stats.normal, filter: "normal", title: "Matrículas normais" },
  { label: "Permitido", value: stats.permitido, filter: "permitido", title: "Matrículas permitidas" },
  { label: "Atenção", value: stats.atencao, filter: "atencao", title: "Matrículas em atenção" },
  { label: "Com localização", value: stats.comLocalizacao, filter: "com_localizacao", title: "Matrículas com localização" },
  { label: "Com foto", value: stats.comFoto, filter: "com_foto", title: "Matrículas com foto" },
  { label: "Nunca vistas", value: stats.nuncaVistas, filter: "nunca_vistas", title: "Matrículas nunca vistas" },
].map((item) => (
<Card
  key={item.label}
  onClick={() => openStatsList(item.title, item.filter)}
  sx={{
    borderRadius: 3,
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 12px 26px rgba(15, 23, 42, 0.10)",
      borderColor: "#cbd5e1",
    },
  }}
>
          <CardContent sx={{ p: 2 }}>
            <Typography
              variant="h5"
              fontWeight={900}
              sx={{ color: "#0f172a", lineHeight: 1 }}
            >
              {item.value}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "#64748b",
                fontWeight: 700,
                mt: 0.75,
              }}
            >
              {item.label}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>

     <Card
      sx={{
        mt: 1.5,
        borderRadius: 3,
        border: "1px solid #e2e8f0",
        boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Typography
          variant="caption"
          sx={{
            color: "#64748b",
            fontWeight: 800,
            display: "block",
            mb: 1.5,
          }}
        >
          Matrículas mais vistas
        </Typography>

        {statsLoading ? (
          <Typography variant="body2" sx={{ color: "#64748b" }}>
            A carregar estatísticas...
          </Typography>
        ) : maisVistas.length === 0 ? (
          <Typography variant="body2" sx={{ color: "#64748b" }}>
            Ainda não há visualizações suficientes para mostrar estatísticas.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {maisVistas.slice(0, 5).map((item, index) => {
              const isGreenHighlight = item.contexto?.includes("✅");
              const isRedHighlight = item.contexto?.includes("⛔️");

              return (
                    <Box
                      key={item.id}
                      onClick={() => openMatriculaFromStats(item.id)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 3,
                        backgroundColor: isGreenHighlight
                          ? "#f0fdf4"
                          : isRedHighlight
                          ? "#fef2f2"
                          : "#f8fafc",
                        border: "1px solid #e2e8f0",
                        transition: "all 0.2s ease-in-out",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          boxShadow: "0 8px 18px rgba(15, 23, 42, 0.08)",
                        },
                      }}
                    >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      backgroundColor: index === 0 ? "#0f172a" : "#e2e8f0",
                      color: index === 0 ? "#ffffff" : "#0f172a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body1"
                      fontWeight={900}
                      sx={{ color: "#0f172a", letterSpacing: "0.04em" }}
                    >
                      {item.id.toUpperCase()}
                    </Typography>

                    <Typography
                      variant="caption"
                      sx={{
                        color: "#64748b",
                        display: "block",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.contexto?.replace(/✅|⛔️/g, "").trim() || "Sem observações"}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      px: 1.2,
                      py: 0.6,
                      borderRadius: 999,
                      backgroundColor: "#e2e8f0",
                      color: "#0f172a",
                      fontWeight: 900,
                      fontSize: "0.8rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.total_vistos}x
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>

    <Card
      sx={{
        mt: 1.5,
        borderRadius: 3,
        border: "1px solid #e2e8f0",
        boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Typography
          variant="caption"
          sx={{
            color: "#64748b",
            fontWeight: 800,
            display: "block",
            mb: 0.75,
          }}
        >
          Última matrícula vista
        </Typography>

        {mostRecentSeen ? (
          <>
            <Typography variant="h5" fontWeight={900} sx={{ color: "#0f172a" }}>
              {mostRecentSeen.id.toUpperCase()}
            </Typography>

            <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
              {new Date(mostRecentSeen.ultima_vista).toLocaleDateString("pt-PT", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              })}{" "}
              às{" "}
              {new Date(mostRecentSeen.ultima_vista).toLocaleTimeString("pt-PT", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
          </>
        ) : (
          <Typography variant="body2" sx={{ color: "#64748b" }}>
            Ainda não há visualizações registadas.
          </Typography>
        )}
      </CardContent>
    </Card>
    <Button
      variant="contained"
      fullWidth
      onClick={() => setStatsOpen(false)}
      sx={{
        ...ui.primaryButton,
        mt: 2,
      }}
    >
      Fechar
    </Button>
  </DialogContent>
</Dialog>

    {/* Dialog para ver foto em grande */}
    <Dialog
      open={photoPreviewOpen}
      onClose={() => setPhotoPreviewOpen(false)}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          mx: 1,
          borderRadius: 4,
          overflow: "hidden",
          backgroundColor: "#020617",
        },
      }}
    >
      <DialogTitle
        sx={{
          px: 2,
          py: 1.5,
          backgroundColor: "#020617",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Foto da matrícula
          </Typography>

          <Typography variant="body2" sx={{ color: "#cbd5e1", mt: 0.25 }}>
            {selected?.id?.toUpperCase() || ""}
          </Typography>
        </Box>

<Box sx={{ display: "flex", gap: 1 }}>
  <Button
    variant="outlined"
    onClick={() => setDeletePhotoConfirmOpen(true)}
    sx={{
      textTransform: "none",
      borderRadius: 2,
      fontWeight: 800,
      color: "#fecaca",
      borderColor: "#7f1d1d",
      "&:hover": {
        borderColor: "#ef4444",
        backgroundColor: "#450a0a",
      },
    }}
  >
    Apagar foto
  </Button>

  <Button
    variant="outlined"
    onClick={() => setPhotoPreviewOpen(false)}
    sx={{
      textTransform: "none",
      borderRadius: 2,
      fontWeight: 800,
      color: "#ffffff",
      borderColor: "#334155",
      "&:hover": {
        borderColor: "#64748b",
        backgroundColor: "#0f172a",
      },
    }}
  >
    Fechar
  </Button>
</Box>
      </DialogTitle>

      <DialogContent
        sx={{
          p: 0,
          backgroundColor: "#020617",
        }}
      >
        {selected?.foto_url && (
          <Box
            component="img"
            src={`${API_BASE_URL}${selected.foto_url}?v=${photoVersion}`}
            alt={`Foto da matrícula ${selected.id}`}
            sx={{
              width: "100%",
              maxHeight: "80vh",
              objectFit: "contain",
              display: "block",
              backgroundColor: "#020617",
            }}
          />
        )}
      </DialogContent>
    </Dialog>

    {/* Dialog para Confirmar Apagar Foto */}
<Dialog
  open={deletePhotoConfirmOpen}
  onClose={() => setDeletePhotoConfirmOpen(false)}
  fullWidth
  maxWidth="xs"
  PaperProps={{
    sx: {
      mx: 2,
      borderRadius: 4,
      overflow: "hidden",
    },
  }}
>
  <DialogTitle
    sx={{
      px: 3,
      py: 2.5,
      backgroundColor: "#0f172a",
      color: "#ffffff",
    }}
  >
    <Typography variant="h6" fontWeight={800}>
      Apagar foto?
    </Typography>

    <Typography variant="body2" sx={{ color: "#cbd5e1", mt: 0.5 }}>
      Esta ação remove a foto associada à matrícula.
    </Typography>
  </DialogTitle>

  <DialogContent
    sx={{
      backgroundColor: "#f8fafc",
      p: 2,
    }}
  >
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        backgroundColor: "#ffffff",
        border: "1px solid #e2e8f0",
        mb: 2,
      }}
    >
      <Typography variant="body2" sx={{ color: "#334155", lineHeight: 1.5 }}>
        Queres mesmo apagar esta foto?
      </Typography>

      {selected?.id && (
        <Typography
          variant="h5"
          fontWeight={900}
          sx={{
            color: "#0f172a",
            letterSpacing: "0.06em",
            mt: 1,
          }}
        >
          {selected.id.toUpperCase()}
        </Typography>
      )}
    </Box>

    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Button
        variant="contained"
        color="error"
        fullWidth
        onClick={apagarFotoMatricula}
        sx={{
          py: 1.3,
          fontWeight: 800,
          textTransform: "none",
          borderRadius: 2,
          backgroundColor: "#dc2626",
          "&:hover": {
            backgroundColor: "#b91c1c",
          },
        }}
      >
        Sim, apagar foto
      </Button>

      <Button
        variant="outlined"
        fullWidth
        onClick={() => setDeletePhotoConfirmOpen(false)}
        sx={{
          py: 1.3,
          fontWeight: 800,
          textTransform: "none",
          borderRadius: 2,
          borderColor: "#cbd5e1",
          color: "#0f172a",
          backgroundColor: "#ffffff",
          "&:hover": {
            backgroundColor: "#f1f5f9",
            borderColor: "#94a3b8",
          },
        }}
      >
        Cancelar
      </Button>
    </Box>
  </DialogContent>
</Dialog>

      {/* Snackbar de sucesso - matrícula apagada */}
      <Snackbar
        open={deleteToast}
        autoHideDuration={3000}
        onClose={() => setDeleteToast(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setDeleteToast(false)} severity="success" sx={{ width: "100%" }}>
          Matrícula apagada com sucesso!
        </Alert>
      </Snackbar>

<Snackbar
  open={photoToast}
  autoHideDuration={3000}
  onClose={() => setPhotoToast(false)}
  anchorOrigin={{ vertical: "top", horizontal: "center" }}
>
  <Alert onClose={() => setPhotoToast(false)} severity="success" sx={{ width: "100%" }}>
    Foto atualizada com sucesso!
  </Alert>
</Snackbar>

      {/* Snackbar de sucesso - matrícula marcada como vista! */}
          <Snackbar
      open={successSeenToast}
      autoHideDuration={3000}
      onClose={() => setSuccessSeenToast(false)}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <Alert onClose={() => setSuccessSeenToast(false)} severity="info" sx={{ width: "100%" }}>
        Matrícula marcada como vista!
      </Alert>
    </Snackbar>

      {/* Snackbar de sucesso - matrícula adicionada */}
          <Snackbar
        open={successAddedToast}
        autoHideDuration={3000}
        onClose={() => setSuccessAddedToast(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setSuccessAddedToast(false)} severity="success" sx={{ width: "100%" }}>
          Matrícula adicionada com sucesso!
        </Alert>
      </Snackbar>

      {/* Snackbar de sucesso - matrícula editada */}
      <Snackbar
        open={successToast}
        autoHideDuration={3000}
        onClose={() => {
          setSuccessToast(false);
          setIsEditing(false);
        }}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setSuccessToast(false)} severity="success" sx={{ width: "100%" }}>
          Matrícula editada com sucesso!
        </Alert>
      </Snackbar>

      {/* Snackbar para alertar matrícula duplicada */}
      <Snackbar
        open={alertOpen}
        autoHideDuration={3000}
        onClose={() => setAlertOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setAlertOpen(false)} severity="warning" sx={{ width: "100%" }}>
          Esta matrícula já existe!
        </Alert>
      </Snackbar>


      <Snackbar
  open={photoDeletedToast}
  autoHideDuration={3000}
  onClose={() => setPhotoDeletedToast(false)}
  anchorOrigin={{ vertical: "top", horizontal: "center" }}
>
  <Alert onClose={() => setPhotoDeletedToast(false)} severity="success" sx={{ width: "100%" }}>
    Foto apagada com sucesso!
  </Alert>
</Snackbar>

      {/* Footer */}
      <Box sx={{ mt: 4, textAlign: "center", fontSize: "0.8rem", color: "text.secondary" }}>
        © Carlos Santos · versão 2.3
      </Box>
            
    </Box>
    
  
    </Box>

);
  
}

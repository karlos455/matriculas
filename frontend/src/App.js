import React, { useState, useEffect, useRef } from "react";
import {
  TextField, Button, Card, CardContent, Dialog, DialogTitle, DialogContent,
  List, ListItem, ListItemButton, ListItemText, Typography, Box,
  IconButton, Snackbar, Alert
} from "@mui/material";
import { Add, List as ListIcon, Delete } from "@mui/icons-material";
import { Edit } from "@mui/icons-material";
import { Grow } from "@mui/material";
import { History } from "@mui/icons-material";


const API_URL = "https://matriculas.casadocarlos.info/matriculas";

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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const loginButtonRef = useRef(null);

  useEffect(() => {
    if (loginButtonRef.current) {
      loginButtonRef.current.focus(); // Dá foco ao botão "Entrar"
    }
  }, []);

  const login = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      const adminUsername = process.env.REACT_APP_ADMIN_USERNAME;
      const adminPassword = process.env.REACT_APP_ADMIN_PASSWORD;

      if (username === adminUsername && password === adminPassword) {
        handleLogin();
      } else {
        setSnackbarOpen(true);
      }
    }
  };

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
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2 }}
          onKeyDown={login} // Permite pressionar Enter para login
        />
        <Button
          variant="contained"
          fullWidth
          onClick={login}
          ref={loginButtonRef} // Define o botão como referência para o focus automático
        >
          Entrar
        </Button>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert onClose={() => setSnackbarOpen(false)} severity="error" sx={{ width: "100%" }}>
            Credenciais inválidas!
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
  const [successAddedToast, setSuccessAddedToast] = useState(false);
  const [highlightCard, setHighlightCard] = useState(false);
  const isGreenHighlight = selected?.contexto?.includes("✅");
  const isRedHighlight = selected?.contexto?.includes("⛔️");
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
    setIsListOpen(true);
  };



  // **Marcar como visto por último**
const marcarComoVisto = (id) => {
  const idFormatado = id.toLowerCase();

  fetch(`${API_URL}/${idFormatado}/visto`, {
    method: "PUT"
  })
    .then((res) => {
      if (!res.ok) throw new Error("Erro ao marcar como visto");
      return res.json();
    })
    .then((data) => {
      fetchMatriculas();
      if (selected?.id.toLowerCase() === idFormatado) {
        setSelected(data);
      }
      setSuccessSeenToast(true);
    })
    .catch((err) => console.error("❌ Erro ao atualizar visto:", err));
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

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: "auto", textAlign: "center" }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ cursor: "pointer" }} onClick={() => { fetchMatriculas(); setSelected(null); setSearch(""); }}>
        Pesquisa
      </Typography>

      {/* Campo de Pesquisa */}
      <TextField
        label="Procurar..."
        fullWidth
        value={search}
        onChange={(e) => {
          setSearch(e.target.value.trim());
          setSelected(null);
        }}
        sx={{ mb: 2 }}
      />

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
    textAlign: "center",
    boxShadow: 3,
    borderRadius: 3,
    p: 2,
    backgroundColor: isGreenHighlight
      ? "#e6f4ea"
      : isRedHighlight
      ? "#fbeaea"
      : "#fefefe",
    border: highlightCard ? "2px solid #64b5f6" : "2px solid transparent",
    transition: "border 0.4s ease, background-color 0.4s ease",
  }}
>


  <CardContent>
  <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: 1, mb: 1 }}>
  {selected.id.toUpperCase()}
  </Typography>


{selected.cor && (
  <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
  <Box
    sx={{
      width: 16,
      height: 16,
      borderRadius: "50%",
      backgroundColor: selected.cor,
      border: "1px solid #999"
    }}
  />
</Box>


)}

          <Typography variant="body1" sx={{ mt: 1, fontSize: "0.95rem", color: "#333" }}>
            {selected.contexto?.replace(/✅|⛔️/g, "").trim()}
          </Typography>

  {hasLocation && (
    <Box sx={{ mt: 2 }}>
      <Typography
        variant="caption"
        sx={{ display: "block", color: "text.secondary", mb: 1, textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        Localização guardada
      </Typography>
      <Box
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.12)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
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
      <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5, mt: 1.5, flexWrap: "wrap" }}>
        {googleMapsLink && (
          <Button
            component="a"
            href={googleMapsLink}
            target="_blank"
            rel="noopener noreferrer"
            variant="text"
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Abrir no Google Maps
          </Button>
        )}
        {appleMapsLink && (
          <Button
            component="a"
            href={appleMapsLink}
            target="_blank"
            rel="noopener noreferrer"
            variant="text"
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Abrir no Apple Maps
          </Button>
        )}
      </Box>
    </Box>
  )}



    <Typography variant="caption" sx={{ display: "block", mt: 1, fontSize: "0.75rem", color: "text.secondary" }}>
    Adicionado em:{" "}
      {new Date(selected.data).toLocaleDateString("pt-PT", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })}, às{" "}
      {new Date(selected.data).toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </Typography>

    {selected.ultima_vista && (
      <Typography variant="caption" sx={{ display: "block", fontSize: "0.75rem", color: "text.secondary" }}>

        Última vez visto:{" "}
        {new Date(selected.ultima_vista).toLocaleDateString("pt-PT", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        })}, às{" "}
        {new Date(selected.ultima_vista).toLocaleTimeString("pt-PT", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Typography>
    )}

    {/* Botões */}
    <Box
  sx={{
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 2,
    mt: 2,
  }}
>
  {/* Visto Agora */}
  <Button
    variant="contained"
    sx={{
      backgroundColor: "#386641",
      color: "white",
      fontWeight: "bold",
      textTransform: "uppercase",
      px: 3,
      py: 1.5,
      borderRadius: 2,
      flex: "1 1 40%",
      maxWidth: 180,
      '&:hover': { backgroundColor: "#2a4f31" }
    }}
    onClick={() => marcarComoVisto(selected.id)}
  >
    Visto Agora
  </Button>

  {/* Histórico */}
  <Button
    variant="contained"
    sx={{
      backgroundColor: "#1b263b",
      color: "white",
      fontWeight: "bold",
      textTransform: "uppercase",
      px: 3,
      py: 1.5,
      borderRadius: 2,
      flex: "1 1 40%",
      maxWidth: 180,
      '&:hover': { backgroundColor: "#0d1b2a" }
    }}
    onClick={() => abrirHistorico(selected.id)}
  >
    Histórico
  </Button>

  {/* Editar - linha completa */}
  <Button
    variant="contained"
    sx={{
      backgroundColor: "#1b263b",
      color: "white",
      fontWeight: "bold",
      textTransform: "uppercase",
      px: 3,
      py: 1.5,
      borderRadius: 2,
      width: "100%",
      '&:hover': { backgroundColor: "#0d1b2a" }
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
      <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 2, flexWrap: "wrap" }}>

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
          backgroundColor: "#0d1b2a",
          color: "white",
          fontWeight: "bold",
          textTransform: "uppercase",
          px: 3,
          py: 1.5,
          borderRadius: 2,
          '&:hover': {
            backgroundColor: "#1b263b"
          },
          minWidth: 160
        }}
      >
        Adicionar
      </Button>

      <Button
        variant="contained"
        startIcon={<ListIcon />}
        onClick={listarTodas}
        sx={{
          backgroundColor: "#0d1b2a",
          color: "white",
          fontWeight: "bold",
          textTransform: "uppercase",
          px: 3,
          py: 1.5,
          borderRadius: 2,
          '&:hover': {
            backgroundColor: "#1b263b"
          },
          minWidth: 160
        }}
      >
        Listar Todas
      </Button>

        <Button
          variant="outlined"
          color="error"
          onClick={handleLogout}
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            fontWeight: "bold",
            textTransform: "uppercase",
            borderRadius: 2,
            px: 2.5,
            py: 1
          }}
        >
          Sair
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
        PaperProps={{ sx: { mx: 2, borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: "bold", fontSize: "1.4rem", textAlign: "center", justifyContent: "center" }}
        >
          <Add fontSize="medium" />
          {isEditing ? "Editar Matrícula" : "Adicionar Matrícula"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Matrícula"
          fullWidth
          required
          value={newMatricula}
          onChange={(e) => setNewMatricula(e.target.value)}
          variant="outlined"
          InputLabelProps={{ shrink: true }}
          disabled={isEditing}
        />

        <TextField
          label="Observações"
          fullWidth
          multiline
          minRows={1}
          value={newContexto}
          onChange={(e) => setNewContexto(e.target.value)}
          variant="outlined"
          InputLabelProps={{ shrink: true }}
        />

<Typography variant="body2" sx={{ mt: 2 }}>
  Cor:
</Typography>

<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 1 }}>
  {/* Opção para remover cor */}
  <Box
    onClick={() => setCor("")}
    sx={{
      width: 36,
      height: 36,
      borderRadius: "50%",
      border: "2px dashed #999",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "0.8rem",
      cursor: "pointer",
      color: "#999",
      "&:hover": {
        backgroundColor: "#f0f0f0"
      },
      outline: cor === "" ? "3px solid #1b263b" : "none",
      outlineOffset: 2
    }}
    title="Sem cor"
  >
    ✕
  </Box>

  {/* Cores disponíveis */}
  {["white", "red", "blue", "black", "gray", "silver", "green", "yellow"].map((colorOption) => {
    const isSelected = cor === colorOption;

    return (
      <Box
        key={colorOption}
        onClick={() => setCor(colorOption)}
        sx={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          backgroundColor: colorOption,
          border: "1.5px solid #ccc",
          cursor: "pointer",
          transition: "all 0.2s ease-in-out",
          outline: isSelected ? `3px solid ${colorOption === "white" ? "#999" : colorOption}` : "none",
          outlineOffset: 2,
          "&:hover": {
            transform: "scale(1.1)",
          },
        }}
        title={colorOption}
      />
    );
  })}
</Box>


<Typography variant="body2" sx={{ mt: 3 }}>
  Estado:
</Typography>

<Box sx={{ display: "flex", gap: 2, mt: 1 }}>
  {[
    { valor: "normal", cor: "white", label: "Normal" },
    { valor: "verde", cor: "#e6f4ea", label: "Verde" },
    { valor: "vermelho", cor: "#fbeaea", label: "Vermelho" },
  ].map(({ valor, cor, label }) => (
    <Box
      key={valor}
      onClick={() => setEstadoCartao(valor)}
      sx={{
        width: 30,
        height: 30,
        borderRadius: "50%",
        backgroundColor: cor,
        border: "2px solid #999",
        cursor: "pointer",
        outline: estadoCartao === valor ? "3px solid #1b263b" : "none",
        outlineOffset: 2,
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          transform: "scale(1.1)",
        },
      }}
      title={label}
    />
  ))}
</Box>






        <Button
  variant="contained"
  onClick={addMatricula}
  sx={{
    mt: 2,
    fontWeight: "bold",
    py: 1.3,
    fontSize: "1rem",
    borderRadius: 2,
    boxShadow: 2,
    textTransform: "uppercase",
    backgroundColor: "#1b263b",
    color: "white",
    '&:hover': { backgroundColor: "#0d1b2a" }
  }}
  disabled={loading}
>
  {loading ? "A guardar..." : "Salvar"}
</Button>

{isEditing && (
  <Button
    variant="contained"
    color="error"
    onClick={() => confirmDeleteMatricula(newMatricula)}
    sx={{
      mt: 1.5,
      fontWeight: "bold",
      py: 1.3,
      fontSize: "1rem",
      borderRadius: 2,
      textTransform: "uppercase",
      backgroundColor: "#d00000",
      color: "white",
      '&:hover': { backgroundColor: "#a80000" }
    }}
  >
    Apagar
  </Button>
)}

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
      Lista de Matrículas
    </DialogTitle>
  <DialogContent>
    <Box sx={{ overflowX: "auto" }}>
      <List sx={{ p: 0 }}>
        {matriculas.map((m) => {
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
                        color: "#1b263b", // azul escuro
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
                        color: "#1b263b", // também preto/azul escuro
                        "&:hover": {
                          transform: "scale(1.15)",
                          backgroundColor: "#f0f4f8"
                        }
                      }}
                    >
                      <History fontSize="small" />
                    </IconButton>
                  </Box>

                    </Box>
                  </Card>
          );
        })}
      </List>
    </Box>
  </DialogContent>
</Dialog>

      {/* Dialog para Confirmar Apagar */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} fullWidth maxWidth="xs">
  <DialogTitle>Queres apagar a matrícula?</DialogTitle>
  <DialogContent>
    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
      <Button
        variant="contained"
        color="error"
        onClick={deleteMatricula}
        sx={{
          fontWeight: "bold",
          textTransform: "uppercase",
          px: 3,
          py: 1.3,
          borderRadius: 2,
          backgroundColor: "#d00000",
          color: "white",
          '&:hover': {
            backgroundColor: "#a60000"
          }
        }}
      >
        Sim
      </Button>

      <Button
        variant="contained"
        onClick={() => setDeleteConfirmOpen(false)}
        sx={{
          backgroundColor: "#0d1b2a",
          color: "white",
          fontWeight: "bold",
          textTransform: "uppercase",
          px: 3,
          py: 1.3,
          borderRadius: 2,
          '&:hover': {
            backgroundColor: "#1b263b"
          }
        }}
      >
        Não
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
      >
  <DialogTitle>Histórico de visualizações - {matriculaEmFoco || ""}</DialogTitle>
  <DialogContent>
    {historicoAtual.length === 0 ? (
      <Typography variant="body2" color="text.secondary">Sem histórico disponível.</Typography>
    ) : (
      <List>
        {historicoAtual.map((item, index) => (
          <ListItem key={index}>
            <ListItemText
              primary={`Vista em: ${new Date(item.data).toLocaleDateString("pt-PT", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "2-digit"
              })}, às ${new Date(item.data).toLocaleTimeString("pt-PT", {
                hour: "2-digit",
                minute: "2-digit"
              })}`}
            />
          </ListItem>
        ))}
      </List>
    )}
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

      {/* Footer */}
      <Box sx={{ mt: 4, textAlign: "center", fontSize: "0.8rem", color: "text.secondary" }}>
        © Carlos Santos · versão 2.0
      </Box>
            
    </Box>
    
  );
}

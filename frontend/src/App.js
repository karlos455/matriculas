import React, { useState, useEffect, useRef } from "react";
import {
  TextField, Button, Card, CardContent, Dialog, DialogTitle, DialogContent,
  List, ListItem, ListItemButton, ListItemText, Typography, Box,
  IconButton, Snackbar, Alert
} from "@mui/material";
import { Add, List as ListIcon, Delete } from "@mui/icons-material";
import { Edit } from "@mui/icons-material";

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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoAtual, setHistoricoAtual] = useState([]);
  const [matriculaEmFoco, setMatriculaEmFoco] = useState(null);

  const mostrarHistorico = (id) => {
    fetch(`${API_URL}/${id.toLowerCase()}/historico`)
      .then((res) => res.json())
      .then((data) => {
        setHistoricoAtual(data);
        setMatriculaEmFoco(id);
        setHistoricoOpen(true);
      })
      .catch((err) => console.error("❌ Erro ao buscar histórico:", err));
  };
  

  const fetchHistory = (id) => {
    fetch(`${API_URL}/${id}/historico`)
      .then((res) => res.json())
      .then((data) => {
        setHistory(data);
        setIsHistoryOpen(true);
      })
      .catch((err) => console.error("❌ Erro ao buscar histórico:", err));
  };


  const handleSelect = (matricula) => {
    setSelected(matricula);
    setSearch("");
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
  const addMatricula = () => {
    const idNormalizado = newMatricula.trim().toLowerCase();
    if (!idNormalizado) return;

    // Verifica duplicados com id normalizado
    if (!isEditing && matriculas.some((m) => m.id.toLowerCase() === idNormalizado)) {
      setAlertOpen(true);
      return;
    }

    const novaMatricula = { id: idNormalizado, contexto: newContexto || "" };

    const method = isEditing ? "PUT" : "POST";
    const url = isEditing ? `${API_URL}/${matriculaOriginal.toLowerCase()}` : API_URL;

    setLoading(true);

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novaMatricula),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao guardar matrícula");
        return res.json();
      })
      .then((updatedMatricula) => {
        fetchMatriculas();
        setNewMatricula("");
        setNewContexto("");
        setIsDialogOpen(false);

        if (isEditing && selected?.id === matriculaOriginal) {
          setSelected(updatedMatricula);
        }

        if (isEditing) setSuccessToast(true);
        setIsEditing(false);
      })
      .catch((error) => console.error("❌ Erro ao guardar matrícula:", error))
      .finally(() => setLoading(false));
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
    setNewContexto(matricula.contexto);
    setMatriculaOriginal(matricula.id);
    setIsEditing(true);
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
      })
      .catch((error) => console.error("❌ Erro ao apagar matrícula:", error));
  };

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: "auto", textAlign: "center" }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ cursor: "pointer" }} onClick={() => { fetchMatriculas(); setSelected(null); setSearch(""); }}>
        Scanner
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
        <List sx={{ border: "1px solid #ccc", borderRadius: 2, maxHeight: 200, overflowY: "auto" }}>
          {filtered.map((m) => (
            <ListItem key={m.id} disablePadding>
              <ListItemButton onClick={() => handleSelect(m)}>
                <ListItemText
                  primary={<Typography fontWeight="bold">{m.id}</Typography>}
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">{m.contexto}</Typography>
                      {m.data && (
                        <Typography variant="caption" color="text.secondary">
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
                    </>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      {/* Cartão de Detalhes */}
      {selected && (
        <Card sx={{ mt: 4, textAlign: "center", boxShadow: 3, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold">{selected.id}</Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>{selected.contexto}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Adicionado em: {new Date(selected.data).toLocaleDateString("pt-PT", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "2-digit"
            })}, às {new Date(selected.data).toLocaleTimeString("pt-PT", {
              hour: "2-digit",
              minute: "2-digit"
            })}
          </Typography>

                    {selected.ultima_vista && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Última vez visto: {new Date(selected.ultima_vista).toLocaleDateString("pt-PT", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "2-digit"
              })}, às {new Date(selected.ultima_vista).toLocaleTimeString("pt-PT", {
                hour: "2-digit",
                minute: "2-digit"
              })}
            </Typography>
          )}

            {/* Botões Editar e Apagar */}
            <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 2 }}>
              <Button variant="outlined" color="primary" onClick={() => editMatricula(selected)}>Editar</Button>
              <Button variant="outlined" color="error" onClick={() => confirmDeleteMatricula(selected.id)}>Apagar</Button>
              <Button variant="contained" color="success" onClick={() => marcarComoVisto(selected.id)}>Visto agora</Button>
              <Button variant="outlined" onClick={() => fetchHistory(selected.id)}> Histórico </Button>

            </Box>
          </CardContent>
        </Card>
      )}
      {/* Botões de Ação */}
      <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 2, flexWrap: "wrap" }}>
      <Button
        variant="contained"
        startIcon={<Add />}
        onClick={() => {
          if (!isEditing) {
            setNewMatricula(search); 
          }
          setIsDialogOpen(true);
        }}
      >
        Adicionar
      </Button>
        <Button variant="contained" color="secondary" startIcon={<ListIcon />} onClick={listarTodas}>
          Listar Todas
        </Button>
        <Button variant="outlined" color="error" onClick={handleLogout} sx={{ position: "absolute", top: 10, right: 10 }}>
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
        <DialogTitle>{isEditing ? "Editar Matrícula" : "Adicionar Matrícula"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Matrícula"
            fullWidth
            required
            value={newMatricula}
            onChange={(e) => setNewMatricula(e.target.value)}
            sx={{ mb: 2 }}
            disabled={isEditing}
          />
          <TextField
            label="Observações"
            fullWidth
            value={newContexto}
            onChange={(e) => setNewContexto(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={addMatricula}
            sx={{ mt: 2, width: "100%" }}
            disabled={loading}
          >
            {loading ? "A guardar..." : "Salvar"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Dialog para Listar Matrículas */}
      <Dialog open={isListOpen} onClose={() => setIsListOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Lista de Matrículas</DialogTitle>
        <DialogContent>
          <Box sx={{ overflowX: "auto" }}>
            <List>
              {matriculas.map((m) => (
                <ListItem
                  key={m.id}
                  secondaryAction={
                    <>
                      <IconButton edge="end" color="primary" onClick={() => editMatricula(m)}>
                        <Edit />
                      </IconButton>
                      <IconButton edge="end" color="error" onClick={() => confirmDeleteMatricula(m.id)}>
                        <Delete />
                      </IconButton>
                      <IconButton edge="end" color="info" onClick={() => mostrarHistorico(m.id)}>
                        📜
                      </IconButton>

                    </>
                  }
                >
                  <ListItemText
                    primary={m.id}
                    secondary={
                      <>
                        {m.contexto && <>{m.contexto}<br /></>}
                        {m.data && (
                      <Typography variant="caption" color="text.secondary" display="block">
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
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Dialog para Confirmar Apagar */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Queres apagar a matrícula?</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
            <Button variant="contained" color="error" onClick={deleteMatricula}>Sim</Button>
            <Button variant="contained" onClick={() => setDeleteConfirmOpen(false)}>Não</Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver Histórico */}

      <Dialog open={historicoOpen} onClose={() => setHistoricoOpen(false)} fullWidth maxWidth="sm">
  <DialogTitle>Histórico de visualizações - {matriculaEmFoco}</DialogTitle>
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


       {/* Dialog para mostrar histórico de visualizacoes */}

      <Dialog open={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} fullWidth maxWidth="sm">
  <DialogTitle>Histórico de visualizações</DialogTitle>
  <DialogContent>
    {history.length === 0 ? (
      <Typography variant="body2" color="text.secondary">
        Ainda sem histórico.
      </Typography>
    ) : (
      <List>
        {history.map((visto, index) => (
          <ListItem key={index}>
            <ListItemText
              primary={`Visto em: ${new Date(visto.data).toLocaleDateString("pt-PT", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              })}, às ${new Date(visto.data).toLocaleTimeString("pt-PT", {
                hour: "2-digit",
                minute: "2-digit",
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
    </Box>
  );
}


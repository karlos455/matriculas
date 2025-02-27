import React, { useState, useEffect, useRef } from "react";
import { TextField, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemButton, ListItemText, Typography, Box, IconButton, Snackbar, Alert } from "@mui/material";
import { Add, List as ListIcon, Delete, FileUpload } from "@mui/icons-material";

const API_URL = process.env.REACT_APP_API_URL;

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
      <Card sx={{ padding: 4, boxShadow: 3, backdropFilter: "blur(10px)", background: "rgba(255, 255, 255, 0.2)" }}>
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

  const handleSelect = (matricula) => {
    setSelected(matricula);
    setSearch("");
  };

  const filtered = search.trim() && !selected
    ? matriculas.filter((m) => m.id.toLowerCase().includes(search.toLowerCase()))
    : [];

  // **Buscar todas as matrículas**
  const fetchMatriculas = () => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        setMatriculas(data);
      })
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

  // **Adicionar matrícula**
  const addMatricula = () => {
    if (!newMatricula.trim()) return;

    if (matriculas.some((m) => m.id.toLowerCase() === newMatricula.toLowerCase())) {
      setAlertOpen(true);
      return;
    }

    const novaMatricula = { id: newMatricula, contexto: newContexto || "" };

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novaMatricula),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao adicionar matrícula");
        return res.json();
      })
      .then((data) => {
        setMatriculas((prev) => [...prev, data]);
        setNewMatricula("");
        setNewContexto("");
        setIsDialogOpen(false);
      })
      .catch((error) => console.error("❌ Erro ao adicionar matrícula:", error));
  };

  // **Confirmar exclusão**
  const confirmDeleteMatricula = (id) => {
    setMatriculaToDelete(id);
    setDeleteConfirmOpen(true);
  };

  // **Apagar matrícula**
  const deleteMatricula = () => {
    if (!matriculaToDelete) return;

    fetch(`${API_URL}/${matriculaToDelete}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao apagar matrícula");
        setMatriculas((prev) => prev.filter((m) => m.id !== matriculaToDelete));
        setDeleteConfirmOpen(false);
        setMatriculaToDelete(null);
      })
      .catch((error) => console.error("❌ Erro ao apagar matrícula:", error));
  };

  return (
    <Box sx={{ padding: 2, maxWidth: 600, width: "100%", margin: "auto", textAlign: "center" }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">Scanner</Typography>

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

      {/* Campo de Pesquisa */}
      <TextField
        label="Procurar..."
        variant="outlined"
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
        <List sx={{ border: "1px solid #ccc", borderRadius: 2, maxHeight: 200, overflowY: "auto", width: "100%" }}>
          {filtered.map((m) => (
            <ListItem key={m.id} disablePadding>
              <ListItemButton onClick={() => handleSelect(m)}>
                <ListItemText primary={m.id} />
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
          </CardContent>
        </Card>
      )}

      {/* Botões de Ação */}
      <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 2, flexWrap: "wrap" }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => setIsDialogOpen(true)}>
          Adicionar
        </Button>
        <Button variant="contained" color="secondary" startIcon={<ListIcon />} onClick={listarTodas}>
          Listar Todas
        </Button>
        <Button variant="outlined" color="error" onClick={handleLogout} sx={{ position: "absolute", top: 10, right: 10 }}>
         Sair
        </Button>
      </Box>

      {/* Dialog Adicionar */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Adicionar Matrícula</DialogTitle>
        <DialogContent>
          <TextField
            label="Matrícula"
            fullWidth
            required
            value={newMatricula}
            onChange={(e) => setNewMatricula(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Observações"
            fullWidth
            value={newContexto}
            onChange={(e) => setNewContexto(e.target.value)}
          />
          <Button variant="contained" onClick={addMatricula} sx={{ mt: 2, width: "100%" }}>
            Salvar
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
                <ListItem key={m.id} secondaryAction={
                  <IconButton edge="end" color="error" onClick={() => confirmDeleteMatricula(m.id)}>
                    <Delete />
                  </IconButton>
                }>
                  <ListItemText primary={m.id} secondary={m.contexto} />
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


    </Box>
  );
}

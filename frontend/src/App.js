import React, { useState, useEffect } from "react";
import { TextField, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemButton, ListItemText, Typography, Box, IconButton } from "@mui/material";
import { Add, List as ListIcon, Delete } from "@mui/icons-material";

const API_URL = "http://serverbox.local:5000/matriculas";

export default function MatriculaSearch() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [matriculas, setMatriculas] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [matriculaToDelete, setMatriculaToDelete] = useState(null);
  const [newMatricula, setNewMatricula] = useState("");
  const [newContexto, setNewContexto] = useState("");

  // Buscar os dados da API
useEffect(() => {
  console.log("🔄 Buscando matrículas do backend..."); // Log para debug

  fetch(API_URL)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Erro na API: ${res.status} ${res.statusText}`);
      }
      return res.json();
    })
    .then((data) => {
      console.log("✅ Matrículas recebidas:", data);
      setMatriculas(data); // Atualiza o estado com os dados do backend
    })
    .catch((error) => console.error("❌ Erro ao buscar matrículas:", error));
}, []);


  const confirmDeleteMatricula = (id) => {
    setMatriculaToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const deleteMatricula = () => {
    fetch(`${API_URL}/${matriculaToDelete}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao apagar matrícula");
        setMatriculas(matriculas.filter((m) => m.id !== matriculaToDelete));
        setDeleteConfirmOpen(false);
        setMatriculaToDelete(null);
      })
      .catch((error) => console.error("Erro ao apagar matrícula:", error));
  };

  const handleSelect = (matricula) => {
    setSelected(matricula);
    setSearch("");
  };

  return (
    <Box sx={{ padding: 2, maxWidth: 600, width: "100%", margin: "auto", textAlign: "center" }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">Scanner</Typography>

      {/* Campo de Pesquisa */}
      <TextField
        label="Procurar..."
        variant="outlined"
        fullWidth
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
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

      {/* Botões de Ação */}
      <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 2, flexWrap: "wrap" }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => setIsDialogOpen(true)}>
          Adicionar
        </Button>
        <Button variant="contained" color="secondary" startIcon={<ListIcon />} onClick={() => setIsListOpen(true)}>
          Listar Todas
        </Button>
      </Box>

      {/* Cartão de Detalhes da Matrícula Selecionada */}
      {selected && (
        <Card sx={{ mt: 4, textAlign: "center", boxShadow: 3, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold">{selected.id}</Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>{selected.contexto}</Typography>
          </CardContent>
        </Card>
      )}

      {/* Dialog para Adicionar Matrícula */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Adicionar Matrícula</DialogTitle>
        <DialogContent>
          <TextField label="Matrícula" fullWidth required value={newMatricula} onChange={(e) => setNewMatricula(e.target.value)} sx={{ mb: 2 }} />
          <TextField label="Observações" fullWidth value={newContexto} onChange={(e) => setNewContexto(e.target.value)} />
          <Button variant="contained" onClick={addMatricula} sx={{ mt: 2, width: "100%" }}>Salvar</Button>
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

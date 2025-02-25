import React, { useState } from "react";
import { TextField, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemButton, ListItemText, Typography, Box, IconButton } from "@mui/material";
import { Add, List as ListIcon, Delete } from "@mui/icons-material";
import { useEffect, useState } from "react";

export default function MatriculaList() {
  const [matriculas, setMatriculas] = useState([]);

  useEffect(() => {
    console.log("Chamando API do backend..."); // DEBUG
    fetch("http://localhost:5000/matriculas")
      .then((res) => res.json())
      .then((data) => {
        console.log("Dados recebidos do backend:", data);
        setMatriculas(data);
      })
      .catch((error) => console.error("Erro ao buscar matrículas:", error));
  }, []);

  return (
    <div>
      <h1>Lista de Matrículas</h1>
      {matriculas.map((m) => (
        <p key={m.id}>{m.id} - {m.contexto}</p>
      ))}
    </div>
  );
}

const API_URL = "http://backend:5000/matriculas";

const initialMatriculas = [
  { id: "72le95", contexto: "bp✅" },
  { id: "47sz13", contexto: "bp✅ nkesermam" },
  { id: "Bc31VN", contexto: "care 2✅" },
  { id: "27rj69", contexto: "2 pvg ✅" },
  { id: "Ai98uf", contexto: "✅" },
  { id: "93eg92", contexto: "⛔️ ⛔️" },
  { id: "92ut69", contexto: "no⛔️" },
  { id: "36vh20", contexto: "⛔️ go" },
  { id: "92qr07", contexto: "❔❔" },
];

export default function MatriculaSearch() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [matriculas, setMatriculas] = useState(initialMatriculas);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [matriculaToDelete, setMatriculaToDelete] = useState(null);
  const [newMatricula, setNewMatricula] = useState("");
  const [newContexto, setNewContexto] = useState("");

  const filtered = search && !selected
    ? matriculas.filter((m) => m.id.toLowerCase().includes(search.toLowerCase()))
    : [];

  const addMatricula = () => {
    if (newMatricula) {
      setMatriculas([...matriculas, { id: newMatricula, contexto: newContexto || "" }]);
      setNewMatricula("");
      setNewContexto("");
      setIsDialogOpen(false);
    }
  };

  const confirmDeleteMatricula = (id) => {
    setMatriculaToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const deleteMatricula = () => {
    setMatriculas(matriculas.filter((m) => m.id !== matriculaToDelete));
    setDeleteConfirmOpen(false);
    setMatriculaToDelete(null);
  };

  const handleSelect = (matricula) => {
    setSelected(matricula);
    setSearch("");
  };

  return (
    <Box sx={{ padding: 4, maxWidth: 600, margin: "auto", textAlign: "center" }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">Scanner</Typography>
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
      {filtered.length > 0 && (
        <List sx={{ border: "1px solid #ccc", borderRadius: 2, maxHeight: 200, overflowY: "auto" }}>
          {filtered.map((m) => (
            <ListItem key={m.id} disablePadding>
              <ListItemButton onClick={() => handleSelect(m)}>
                <ListItemText primary={m.id} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
      <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 2 }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => setIsDialogOpen(true)}>
          Adicionar
        </Button>
        <Button variant="contained" color="secondary" startIcon={<ListIcon />} onClick={() => setIsListOpen(true)}>
          Listar Todas
        </Button>
      </Box>
      {selected && (
        <Card sx={{ mt: 4, textAlign: "center", boxShadow: 3, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold">{selected.id}</Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>{selected.contexto}</Typography>
          </CardContent>
        </Card>
      )}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <DialogTitle>Adicionar Matrícula</DialogTitle>
        <DialogContent>
          <TextField label="Matrícula" fullWidth required value={newMatricula} onChange={(e) => setNewMatricula(e.target.value)} sx={{ mb: 2 }} />
          <TextField label="Observações" fullWidth value={newContexto} onChange={(e) => setNewContexto(e.target.value)} />
          <Button variant="contained" onClick={addMatricula} sx={{ mt: 2, width: "100%" }}>Salvar</Button>
        </DialogContent>
      </Dialog>
      <Dialog open={isListOpen} onClose={() => setIsListOpen(false)}>
        <DialogTitle>Lista de Matrículas</DialogTitle>
        <DialogContent>
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
        </DialogContent>
      </Dialog>
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
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

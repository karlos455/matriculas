import React, { useState, useEffect } from "react";
import { TextField, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemButton, ListItemText, Typography, Box, IconButton } from "@mui/material";
import { Add, List as ListIcon, Delete } from "@mui/icons-material";

const API_URL = "http://backend-matriculas:5000/matriculas";

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
    console.log("Chamando API do backend...");
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        console.log("Dados recebidos do backend:", data);
        setMatriculas(data);
      })
      .catch((error) => console.error("Erro ao buscar matrículas:", error));
  }, []);

  const filtered = search && !selected
    ? matriculas.filter((m) => m.id.toLowerCase().includes(search.toLowerCase()))
    : [];


const addMatricula = () => {
  if (!newMatricula) return;

  fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: newMatricula,
      contexto: newContexto || "",
    }),
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error("Erro ao adicionar matrícula");
      }
      return res.json();
    })
    .then(() => {
      // Atualiza a lista de matrículas para incluir a nova entrada
      setMatriculas([...matriculas, { id: newMatricula, contexto: newContexto || "" }]);
      setNewMatricula("");
      setNewContexto("");
      setIsDialogOpen(false);
    })
    .catch((error) => console.error("Erro ao adicionar matrícula:", error));
};


const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.split("\n").map(line => line.trim()).filter(line => line);

    const matriculas = lines.map(line => {
      const id = line.slice(0, 6).trim(); // Matrícula = primeiros 6 caracteres
      const contexto = line.length > 6 ? line.slice(6).trim() : ""; // O restante é observação
      return { id, contexto };
    });

    // Enviar a lista de matrículas para o backend
fetch(`${API_URL}/import`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ matriculas }),
})
    .then(res => res.json())
    .then(data => {
      console.log("Importação concluída:", data);
      setMatriculas([...matriculas, ...data.matriculas]); // Atualiza a lista
    })
    .catch(error => console.error("Erro ao importar matrículas:", error));
  };

  reader.readAsText(file);
};



  const confirmDeleteMatricula = (id) => {
    setMatriculaToDelete(id);
    setDeleteConfirmOpen(true);
  };

const deleteMatricula = () => {
  if (!matriculaToDelete) return;

  fetch(`${API_URL}/${matriculaToDelete}`, {
    method: "DELETE",
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error("Erro ao apagar matrícula");
      }
      // Remove do estado apenas se o backend apagou com sucesso
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
	<input
  	type="file"
  	accept=".txt"
  	onChange={handleFileUpload}
  	style={{ display: "none" }}
  	id="file-upload"
	/>
	<label htmlFor="file-upload">
  	<Button variant="contained" component="span">
    	Importar Lista
	  </Button>
	</label>
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

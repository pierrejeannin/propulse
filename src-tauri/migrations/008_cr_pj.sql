CREATE TABLE IF NOT EXISTS cr_pieces_jointes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compte_rendu_id INTEGER NOT NULL REFERENCES compte_rendus(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  chemin TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

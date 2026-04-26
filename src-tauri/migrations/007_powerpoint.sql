-- Bibliothèque de slides réutilisables (global, tous dossiers)
CREATE TABLE IF NOT EXISTS bibliotheque_slides (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nom           TEXT    NOT NULL,
  tags          TEXT    NOT NULL DEFAULT '[]', -- JSON array of strings
  fichier_path  TEXT    NOT NULL,
  thumbnail_path TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Blocs de composition d'une présentation (par dossier)
CREATE TABLE IF NOT EXISTS presentation_blocs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  dossier_id   INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  type         TEXT    NOT NULL, -- 'page_garde' | 'compte_rendu' | 'chiffrage' | 'schema' | 'bibliotheque'
  ordre        INTEGER NOT NULL DEFAULT 0,
  reference_id INTEGER,          -- CR id / schema id / bibliotheque_slide id selon type
  label        TEXT,             -- libellé override (sinon auto-généré)
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

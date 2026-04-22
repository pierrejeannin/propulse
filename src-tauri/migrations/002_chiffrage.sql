-- Migration 002 : sections dynamiques de devis + prix_achat par ligne

-- ─── Table des sections de devis ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devis_sections (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  devis_id INTEGER NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  nom      TEXT    NOT NULL,
  ordre    INTEGER NOT NULL DEFAULT 0
);

-- ─── Recréer devis_lignes sans le CHECK sur section ──────────────────────────
-- (SQLite ne supporte pas ALTER TABLE DROP CONSTRAINT)
CREATE TABLE IF NOT EXISTS devis_lignes_v2 (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  devis_id      INTEGER NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  section_id    INTEGER REFERENCES devis_sections(id) ON DELETE SET NULL,
  article_id    INTEGER REFERENCES catalogue_articles(id) ON DELETE SET NULL,
  description   TEXT    NOT NULL,
  quantite      REAL    NOT NULL DEFAULT 1,
  prix_unitaire REAL    NOT NULL DEFAULT 0,
  prix_achat    REAL    NOT NULL DEFAULT 0,
  remise        REAL    NOT NULL DEFAULT 0,
  ordre         INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Migrer les données existantes
INSERT INTO devis_lignes_v2
  (id, devis_id, article_id, description, quantite, prix_unitaire, remise, ordre, created_at)
SELECT id, devis_id, article_id, description, quantite, prix_unitaire, remise, ordre, created_at
FROM devis_lignes;

DROP TABLE devis_lignes;
ALTER TABLE devis_lignes_v2 RENAME TO devis_lignes;

-- ─── Ajout des permissions FS pour les pièces jointes ────────────────────────
-- (géré côté Rust/capabilities, pas SQL)

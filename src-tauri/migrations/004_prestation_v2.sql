-- Migration 004 : refonte prestation — table plate (tache + description portés par la ligne)

DROP TABLE IF EXISTS prestation_lignes;
DROP TABLE IF EXISTS prestation_taches;

CREATE TABLE IF NOT EXISTS prestation_lignes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  devis_id     INTEGER NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  tache        TEXT    NOT NULL DEFAULT '',
  description  TEXT,
  profil_label TEXT    NOT NULL DEFAULT '',
  article_id   INTEGER REFERENCES catalogue_articles(id) ON DELETE SET NULL,
  tjm          REAL    NOT NULL DEFAULT 0,
  jours        REAL    NOT NULL DEFAULT 1,
  ordre        INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

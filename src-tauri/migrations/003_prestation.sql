-- Migration 003 : tâches de prestation par devis

CREATE TABLE IF NOT EXISTS prestation_taches (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  devis_id    INTEGER NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  titre       TEXT    NOT NULL,
  description TEXT,
  ordre       INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prestation_lignes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  tache_id     INTEGER NOT NULL REFERENCES prestation_taches(id) ON DELETE CASCADE,
  article_id   INTEGER REFERENCES catalogue_articles(id) ON DELETE SET NULL,
  profil_label TEXT    NOT NULL,
  tjm          REAL    NOT NULL DEFAULT 0,
  jours        REAL    NOT NULL DEFAULT 1,
  ordre        INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

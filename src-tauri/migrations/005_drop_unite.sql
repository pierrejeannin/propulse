-- Migration 005 : suppression de la colonne unite de catalogue_articles
-- SQLite ne supporte pas DROP COLUMN avant la version 3.35 ; on recrée la table.

CREATE TABLE catalogue_articles_new (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nom         TEXT    NOT NULL,
  reference   TEXT,
  description TEXT,
  type        TEXT    NOT NULL CHECK(type IN ('Licence','Matériel','Service')),
  famille_id  INTEGER REFERENCES catalogue_familles(id) ON DELETE SET NULL,
  prix_achat  REAL    NOT NULL DEFAULT 0,
  prix_vente  REAL    NOT NULL DEFAULT 0,
  actif       INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO catalogue_articles_new
  (id, nom, reference, description, type, famille_id,
   prix_achat, prix_vente, actif, created_at, updated_at)
SELECT
   id, nom, reference, description, type, famille_id,
   prix_achat, prix_vente, actif, created_at, updated_at
FROM catalogue_articles;

DROP TABLE catalogue_articles;

ALTER TABLE catalogue_articles_new RENAME TO catalogue_articles;

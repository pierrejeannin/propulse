PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ─── CLIENTS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nom             TEXT    NOT NULL,
  contact_nom     TEXT,
  contact_email   TEXT,
  contact_telephone TEXT,
  secteur         TEXT,
  adresse         TEXT,
  notes           TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── DOSSIERS / OPPORTUNITÉS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dossiers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  titre           TEXT    NOT NULL,
  client_id       INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  statut          TEXT    NOT NULL DEFAULT 'Découverte'
                          CHECK(statut IN (
                            'Découverte','Qualification','Proposition',
                            'Soutenance','Gagné','Perdu','Abandonné'
                          )),
  description     TEXT,
  date_rendu      TEXT,
  montant_estime  REAL,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── COMPTES-RENDUS RDV ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compte_rendus (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  dossier_id          INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  titre               TEXT    NOT NULL,
  date_rdv            TEXT    NOT NULL,
  participants        TEXT,
  contexte_existant   TEXT,
  besoins_exprimes    TEXT,
  metriques_cles      TEXT,
  pistes_solution     TEXT,
  actions_next_steps  TEXT,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── PIÈCES JOINTES LIVRABLES (rattachées au dossier) ───────────────────────
CREATE TABLE IF NOT EXISTS pieces_jointes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  dossier_id      INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  nom             TEXT    NOT NULL,
  chemin_fichier  TEXT    NOT NULL,
  type_mime       TEXT,
  taille          INTEGER,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── FAMILLES DU CATALOGUE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalogue_familles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nom         TEXT    NOT NULL UNIQUE,
  description TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── CATALOGUE D'ARTICLES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalogue_articles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nom         TEXT    NOT NULL,
  reference   TEXT,
  description TEXT,
  type        TEXT    NOT NULL CHECK(type IN ('Licence','Matériel','Service')),
  famille_id  INTEGER REFERENCES catalogue_familles(id) ON DELETE SET NULL,
  prix_achat  REAL    NOT NULL DEFAULT 0,
  prix_vente  REAL    NOT NULL DEFAULT 0,
  unite       TEXT    NOT NULL DEFAULT 'unité',
  actif       INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── DEVIS PAR DOSSIER ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devis (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  dossier_id  INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  titre       TEXT    NOT NULL DEFAULT 'Chiffrage',
  notes       TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── LIGNES DE DEVIS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devis_lignes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  devis_id        INTEGER NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  article_id      INTEGER REFERENCES catalogue_articles(id) ON DELETE SET NULL,
  section         TEXT    NOT NULL DEFAULT 'Matériel'
                          CHECK(section IN ('Licences','Matériel','Services')),
  description     TEXT    NOT NULL,
  quantite        REAL    NOT NULL DEFAULT 1,
  prix_unitaire   REAL    NOT NULL DEFAULT 0,
  remise          REAL    NOT NULL DEFAULT 0,
  marge           REAL    NOT NULL DEFAULT 0,
  ordre           INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── PIÈCES JOINTES FOURNISSEURS (rattachées au devis) ──────────────────────
CREATE TABLE IF NOT EXISTS devis_pieces_jointes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  devis_id        INTEGER NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  nom             TEXT    NOT NULL,
  chemin_fichier  TEXT    NOT NULL,
  type_mime       TEXT,
  taille          INTEGER,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── SCHÉMAS D'ARCHITECTURE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schemas_architecture (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  dossier_id      INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  nom             TEXT    NOT NULL,
  chemin_fichier  TEXT    NOT NULL,
  type            TEXT    NOT NULL CHECK(type IN ('PNG','SVG','JPEG')),
  date_schema     TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── BIBLIOTHÈQUE DE SLIDES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS slides_bibliotheque (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  titre               TEXT    NOT NULL,
  chemin_apercu       TEXT    NOT NULL,
  chemin_pptx_source  TEXT,
  numero_slide        INTEGER,
  tags                TEXT    NOT NULL DEFAULT '[]',
  theme               TEXT,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── PRÉSENTATIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS presentations (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  dossier_id       INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  titre            TEXT    NOT NULL,
  chemin_template  TEXT,
  chemin_export    TEXT,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── SLIDES D'UNE PRÉSENTATION ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS presentation_slides (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  presentation_id         INTEGER NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  type                    TEXT    NOT NULL
                                  CHECK(type IN ('bibliotheque','chiffrage','architecture','rdv')),
  slide_bibliotheque_id   INTEGER REFERENCES slides_bibliotheque(id) ON DELETE SET NULL,
  schema_id               INTEGER REFERENCES schemas_architecture(id) ON DELETE SET NULL,
  compte_rendu_id         INTEGER REFERENCES compte_rendus(id) ON DELETE SET NULL,
  ordre                   INTEGER NOT NULL DEFAULT 0
);

-- ─── DONNÉES INITIALES ───────────────────────────────────────────────────────
INSERT OR IGNORE INTO catalogue_familles (nom) VALUES
  ('Microsoft'),
  ('Veeam'),
  ('Proxmox'),
  ('QNAP'),
  ('Optiques'),
  ('Réseau'),
  ('Serveurs'),
  ('Stockage'),
  ('VMware'),
  ('Datacore');

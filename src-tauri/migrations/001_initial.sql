PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ─── CLIENTS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  nom               TEXT    NOT NULL,
  contact_nom       TEXT,
  contact_email     TEXT,
  contact_telephone TEXT,
  secteur           TEXT,
  adresse           TEXT,
  notes             TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── DOSSIERS / OPPORTUNITÉS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dossiers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  titre          TEXT    NOT NULL,
  client_id      INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  statut         TEXT    NOT NULL DEFAULT 'Découverte'
                         CHECK(statut IN (
                           'Découverte','Qualification','Proposition',
                           'Soutenance','Gagné','Perdu','Abandonné'
                         )),
  description    TEXT,
  date_rendu     TEXT,
  montant_estime REAL,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── COMPTES-RENDUS RDV ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compte_rendus (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  dossier_id         INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  titre              TEXT    NOT NULL,
  date_rdv           TEXT    NOT NULL,
  participants       TEXT,
  contexte_existant  TEXT,
  besoins_exprimes   TEXT,
  metriques_cles     TEXT,
  pistes_solution    TEXT,
  actions_next_steps TEXT,
  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── PIÈCES JOINTES COMPTES-RENDUS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cr_pieces_jointes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  compte_rendu_id INTEGER NOT NULL REFERENCES compte_rendus(id) ON DELETE CASCADE,
  nom             TEXT    NOT NULL,
  chemin          TEXT    NOT NULL,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── PIÈCES JOINTES DOSSIERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pieces_jointes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  dossier_id     INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  nom            TEXT    NOT NULL,
  chemin_fichier TEXT    NOT NULL,
  type_mime      TEXT,
  taille         INTEGER,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
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
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nom           TEXT    NOT NULL,
  reference     TEXT,
  description   TEXT,
  type          TEXT    NOT NULL CHECK(type IN ('Licence','Matériel','Service')),
  famille_id    INTEGER REFERENCES catalogue_familles(id) ON DELETE SET NULL,
  prix_achat    REAL    NOT NULL DEFAULT 0,
  prix_vente    REAL    NOT NULL DEFAULT 0,
  actif         INTEGER NOT NULL DEFAULT 1,
  is_default_cp INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── DEVIS PAR DOSSIER ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devis (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  dossier_id     INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  titre          TEXT    NOT NULL DEFAULT 'Chiffrage',
  notes          TEXT,
  cp_pourcentage REAL    NOT NULL DEFAULT 20,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── SECTIONS DE DEVIS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devis_sections (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  devis_id INTEGER NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  nom      TEXT    NOT NULL,
  ordre    INTEGER NOT NULL DEFAULT 0
);

-- ─── LIGNES DE DEVIS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devis_lignes (
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

-- ─── PIÈCES JOINTES DEVIS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devis_pieces_jointes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  devis_id       INTEGER NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  nom            TEXT    NOT NULL,
  chemin_fichier TEXT    NOT NULL,
  type_mime      TEXT,
  taille         INTEGER,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── LIGNES DE PRESTATION ────────────────────────────────────────────────────
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

-- ─── SCHÉMAS D'ARCHITECTURE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schemas_architecture (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  dossier_id     INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  nom            TEXT    NOT NULL,
  chemin_fichier TEXT    NOT NULL,
  type           TEXT    NOT NULL CHECK(type IN ('PNG','SVG','JPEG')),
  date_schema    TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── BIBLIOTHÈQUE DE SLIDES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bibliotheque_slides (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nom            TEXT    NOT NULL,
  tags           TEXT    NOT NULL DEFAULT '[]',
  fichier_path   TEXT    NOT NULL,
  thumbnail_path TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── BLOCS DE PRÉSENTATION ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS presentation_blocs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  dossier_id   INTEGER NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  type         TEXT    NOT NULL
                       CHECK(type IN ('page_garde','compte_rendu','chiffrage','schema','bibliotheque')),
  ordre        INTEGER NOT NULL DEFAULT 0,
  reference_id INTEGER,
  label        TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
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

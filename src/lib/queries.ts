import { getDb } from "./db";
import type {
  ArticleType,
  CatalogueArticle,
  CatalogueFamille,
  Client,
  CompteRendu,
  Devis,
  DevisAvecTotal,
  DevisLigne,
  DevisPieceJointe,
  DevisSection,
  DossierWithClient,
  PrestationLigne,
  Statut,
} from "./types";

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

export async function getClients(): Promise<Client[]> {
  const db = await getDb();
  return db.select<Client[]>("SELECT * FROM clients ORDER BY nom ASC");
}

export async function createClient(data: {
  nom: string;
  contact_nom?: string;
  contact_email?: string;
  contact_telephone?: string;
  secteur?: string;
}): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO clients (nom, contact_nom, contact_email, contact_telephone, secteur)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.nom,
      data.contact_nom ?? null,
      data.contact_email ?? null,
      data.contact_telephone ?? null,
      data.secteur ?? null,
    ]
  );
  return result.lastInsertId as number;
}

export async function updateClient(
  id: number,
  data: {
    nom: string;
    contact_nom: string | null;
    contact_email: string | null;
    contact_telephone: string | null;
    secteur: string | null;
  }
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE clients
     SET nom = ?, contact_nom = ?, contact_email = ?,
         contact_telephone = ?, secteur = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      data.nom,
      data.contact_nom,
      data.contact_email,
      data.contact_telephone,
      data.secteur,
      id,
    ]
  );
}

// ─── DOSSIERS ────────────────────────────────────────────────────────────────

export async function getDossiers(): Promise<DossierWithClient[]> {
  const db = await getDb();
  return db.select<DossierWithClient[]>(`
    SELECT d.*, c.nom AS client_nom
    FROM dossiers d
    LEFT JOIN clients c ON d.client_id = c.id
    ORDER BY d.updated_at DESC
  `);
}

export async function getDossierById(
  id: number
): Promise<DossierWithClient | null> {
  const db = await getDb();
  const rows = await db.select<DossierWithClient[]>(
    `SELECT d.*, c.nom AS client_nom
     FROM dossiers d
     LEFT JOIN clients c ON d.client_id = c.id
     WHERE d.id = ?`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createDossier(data: {
  titre: string;
  client_id: number | null;
  statut: Statut;
  description: string | null;
  date_rendu: string | null;
  montant_estime: number | null;
}): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO dossiers (titre, client_id, statut, description, date_rendu, montant_estime)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.titre,
      data.client_id,
      data.statut,
      data.description,
      data.date_rendu,
      data.montant_estime,
    ]
  );
  return result.lastInsertId as number;
}

export async function updateDossier(
  id: number,
  data: {
    titre: string;
    client_id: number | null;
    statut: Statut;
    description: string | null;
    date_rendu: string | null;
    montant_estime: number | null;
  }
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE dossiers
     SET titre = ?, client_id = ?, statut = ?, description = ?,
         date_rendu = ?, montant_estime = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      data.titre,
      data.client_id,
      data.statut,
      data.description,
      data.date_rendu,
      data.montant_estime,
      id,
    ]
  );
}

export async function updateDossierStatut(
  id: number,
  statut: Statut
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE dossiers SET statut = ?, updated_at = datetime('now') WHERE id = ?`,
    [statut, id]
  );
}

export async function deleteDossier(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM dossiers WHERE id = ?", [id]);
}

// ─── COMPTES-RENDUS ───────────────────────────────────────────────────────────

export async function getCompteRendus(dossierId: number): Promise<CompteRendu[]> {
  const db = await getDb();
  return db.select<CompteRendu[]>(
    `SELECT * FROM compte_rendus WHERE dossier_id = ? ORDER BY date_rdv DESC, created_at DESC`,
    [dossierId]
  );
}

export async function getCompteRenduById(id: number): Promise<CompteRendu | null> {
  const db = await getDb();
  const rows = await db.select<CompteRendu[]>(
    `SELECT * FROM compte_rendus WHERE id = ?`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createCompteRendu(data: {
  dossier_id: number;
  titre: string;
  date_rdv: string;
  participants: string | null;
  contexte_existant: string | null;
  besoins_exprimes: string | null;
  metriques_cles: string | null;
  pistes_solution: string | null;
  actions_next_steps: string | null;
}): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO compte_rendus
       (dossier_id, titre, date_rdv, participants,
        contexte_existant, besoins_exprimes, metriques_cles,
        pistes_solution, actions_next_steps)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.dossier_id,
      data.titre,
      data.date_rdv,
      data.participants,
      data.contexte_existant,
      data.besoins_exprimes,
      data.metriques_cles,
      data.pistes_solution,
      data.actions_next_steps,
    ]
  );
  return result.lastInsertId as number;
}

export async function updateCompteRendu(
  id: number,
  data: {
    titre: string;
    date_rdv: string;
    participants: string | null;
    contexte_existant: string | null;
    besoins_exprimes: string | null;
    metriques_cles: string | null;
    pistes_solution: string | null;
    actions_next_steps: string | null;
  }
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE compte_rendus
     SET titre = ?, date_rdv = ?, participants = ?,
         contexte_existant = ?, besoins_exprimes = ?,
         metriques_cles = ?, pistes_solution = ?,
         actions_next_steps = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      data.titre,
      data.date_rdv,
      data.participants,
      data.contexte_existant,
      data.besoins_exprimes,
      data.metriques_cles,
      data.pistes_solution,
      data.actions_next_steps,
      id,
    ]
  );
}

export async function deleteCompteRendu(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM compte_rendus WHERE id = ?", [id]);
}

// ─── CATALOGUE FAMILLES ───────────────────────────────────────────────────────

export async function getCatalogueFamilles(): Promise<CatalogueFamille[]> {
  const db = await getDb();
  return db.select<CatalogueFamille[]>(
    "SELECT * FROM catalogue_familles ORDER BY nom ASC"
  );
}

export async function createCatalogueFamille(nom: string): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    "INSERT INTO catalogue_familles (nom) VALUES (?)",
    [nom.trim()]
  );
  return result.lastInsertId as number;
}

export async function updateCatalogueFamille(
  id: number,
  nom: string
): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE catalogue_familles SET nom = ? WHERE id = ?", [
    nom.trim(),
    id,
  ]);
}

export async function deleteCatalogueFamille(id: number): Promise<void> {
  const db = await getDb();
  // SET NULL sur articles grâce à ON DELETE SET NULL dans le schéma
  await db.execute("DELETE FROM catalogue_familles WHERE id = ?", [id]);
}

// ─── CATALOGUE ARTICLES ───────────────────────────────────────────────────────

export async function getCatalogueArticles(opts?: {
  search?: string;
  type?: ArticleType | "Tous";
  famille_id?: number | null;
  actif?: boolean;
}): Promise<CatalogueArticle[]> {
  const db = await getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts?.actif !== false) {
    conditions.push("a.actif = 1");
  }
  if (opts?.search) {
    conditions.push("(a.nom LIKE ? OR a.reference LIKE ?)");
    const like = `%${opts.search}%`;
    params.push(like, like);
  }
  if (opts?.type && opts.type !== "Tous") {
    conditions.push("a.type = ?");
    params.push(opts.type);
  }
  if (opts?.famille_id != null) {
    conditions.push("a.famille_id = ?");
    params.push(opts.famille_id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return db.select<CatalogueArticle[]>(
    `SELECT a.*, f.nom AS famille_nom
     FROM catalogue_articles a
     LEFT JOIN catalogue_familles f ON a.famille_id = f.id
     ${where}
     ORDER BY a.nom ASC`,
    params
  );
}

export async function createCatalogueArticle(data: {
  nom: string;
  reference: string | null;
  description: string | null;
  type: ArticleType;
  famille_id: number | null;
  prix_achat: number;
  prix_vente: number;
}): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO catalogue_articles
       (nom, reference, description, type, famille_id, prix_achat, prix_vente)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.nom,
      data.reference,
      data.description,
      data.type,
      data.famille_id,
      data.prix_achat,
      data.prix_vente,
    ]
  );
  return result.lastInsertId as number;
}

export async function updateCatalogueArticle(
  id: number,
  data: {
    nom: string;
    reference: string | null;
    description: string | null;
    type: ArticleType;
    famille_id: number | null;
    prix_achat: number;
    prix_vente: number;
  }
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE catalogue_articles
     SET nom = ?, reference = ?, description = ?, type = ?,
         famille_id = ?, prix_achat = ?, prix_vente = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [
      data.nom,
      data.reference,
      data.description,
      data.type,
      data.famille_id,
      data.prix_achat,
      data.prix_vente,
      id,
    ]
  );
}

/** Retourne l'article marqué Chef de projet par défaut, ou null. */
export async function getDefaultCpArticle(): Promise<CatalogueArticle | null> {
  const db = await getDb();
  const rows = await db.select<CatalogueArticle[]>(
    `SELECT a.*, f.nom AS famille_nom
     FROM catalogue_articles a
     LEFT JOIN catalogue_familles f ON a.famille_id = f.id
     WHERE a.is_default_cp = 1
     LIMIT 1`,
    []
  );
  return rows[0] ?? null;
}

/**
 * Désigne un article comme CP par défaut (dépose le flag sur tous les autres).
 * Passer null pour retirer le tag sans en attribuer un nouveau.
 */
export async function setDefaultCpArticle(id: number | null): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE catalogue_articles SET is_default_cp = 0", []);
  if (id !== null) {
    await db.execute(
      "UPDATE catalogue_articles SET is_default_cp = 1 WHERE id = ?",
      [id]
    );
  }
}

export async function deleteCatalogueArticle(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM catalogue_articles WHERE id = ?", [id]);
}

// ─── DEVIS CP CONFIG ─────────────────────────────────────────────────────────

export async function getDevisCpPourcentage(devisId: number): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ cp_pourcentage: number }[]>(
    "SELECT cp_pourcentage FROM devis WHERE id = ?",
    [devisId]
  );
  return rows[0]?.cp_pourcentage ?? 20;
}

export async function updateDevisCpPourcentage(
  devisId: number,
  pct: number
): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE devis SET cp_pourcentage = ? WHERE id = ?", [
    pct,
    devisId,
  ]);
}

// ─── DEVIS ────────────────────────────────────────────────────────────────────

/** Charge le devis du dossier, le crée avec 3 sections par défaut si absent. */
export async function getOrCreateDevis(dossierId: number): Promise<Devis> {
  const db = await getDb();
  const rows = await db.select<Devis[]>(
    "SELECT * FROM devis WHERE dossier_id = ?",
    [dossierId]
  );
  if (rows[0]) return rows[0];

  // Créer le devis
  const res = await db.execute(
    "INSERT INTO devis (dossier_id, titre) VALUES (?, 'Chiffrage')",
    [dossierId]
  );
  const devisId = res.lastInsertId as number;

  // 3 sections par défaut
  const sections = ["Licences", "Matériel", "Services"];
  for (let i = 0; i < sections.length; i++) {
    await db.execute(
      "INSERT INTO devis_sections (devis_id, nom, ordre) VALUES (?, ?, ?)",
      [devisId, sections[i], i]
    );
  }

  const newRows = await db.select<Devis[]>(
    "SELECT * FROM devis WHERE id = ?",
    [devisId]
  );
  return newRows[0];
}

export async function getAllDevisAvecTotal(): Promise<DevisAvecTotal[]> {
  const db = await getDb();
  return db.select<DevisAvecTotal[]>(`
    SELECT
      dv.id,
      dv.dossier_id,
      dos.titre AS dossier_titre,
      c.nom     AS client_nom,
      dos.statut AS dossier_statut,
      COALESCE(SUM(dl.quantite * dl.prix_unitaire * (1 - dl.remise / 100.0)), 0) AS total_ht,
      CASE
        WHEN SUM(CASE WHEN dl.prix_achat > 0 THEN 1 ELSE 0 END) > 0
        THEN (
          SUM(CASE WHEN dl.prix_achat > 0
            THEN dl.quantite * dl.prix_unitaire * (1 - dl.remise / 100.0) - dl.quantite * dl.prix_achat
            ELSE 0 END)
          / NULLIF(SUM(CASE WHEN dl.prix_achat > 0
            THEN dl.quantite * dl.prix_unitaire * (1 - dl.remise / 100.0)
            ELSE 0 END), 0) * 100
        )
        ELSE NULL
      END AS marge_globale,
      dv.updated_at
    FROM devis dv
    JOIN dossiers dos ON dv.dossier_id = dos.id
    LEFT JOIN clients c ON dos.client_id = c.id
    LEFT JOIN devis_lignes dl ON dl.devis_id = dv.id
    GROUP BY dv.id
    ORDER BY dv.updated_at DESC
  `);
}

// ─── DEVIS SECTIONS ───────────────────────────────────────────────────────────

export async function getDevisSections(devisId: number): Promise<DevisSection[]> {
  const db = await getDb();
  return db.select<DevisSection[]>(
    "SELECT * FROM devis_sections WHERE devis_id = ? ORDER BY ordre ASC",
    [devisId]
  );
}

export async function createDevisSection(
  devisId: number,
  nom: string,
  ordre: number
): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    "INSERT INTO devis_sections (devis_id, nom, ordre) VALUES (?, ?, ?)",
    [devisId, nom.trim(), ordre]
  );
  return result.lastInsertId as number;
}

export async function updateDevisSection(
  id: number,
  nom: string
): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE devis_sections SET nom = ? WHERE id = ?", [
    nom.trim(),
    id,
  ]);
}

export async function deleteDevisSection(id: number): Promise<void> {
  const db = await getDb();
  // Les lignes de cette section auront section_id = NULL (ON DELETE SET NULL)
  await db.execute("DELETE FROM devis_sections WHERE id = ?", [id]);
}

// ─── DEVIS LIGNES ────────────────────────────────────────────────────────────

export async function getDevisLignes(devisId: number): Promise<DevisLigne[]> {
  const db = await getDb();
  return db.select<DevisLigne[]>(
    "SELECT * FROM devis_lignes WHERE devis_id = ? ORDER BY section_id ASC, ordre ASC",
    [devisId]
  );
}

export async function createDevisLigne(data: {
  devis_id: number;
  section_id: number | null;
  article_id: number | null;
  description: string;
  quantite: number;
  prix_unitaire: number;
  prix_achat: number;
  remise: number;
  ordre: number;
}): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO devis_lignes
       (devis_id, section_id, article_id, description, quantite, prix_unitaire, prix_achat, remise, ordre)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.devis_id,
      data.section_id,
      data.article_id,
      data.description,
      data.quantite,
      data.prix_unitaire,
      data.prix_achat,
      data.remise,
      data.ordre,
    ]
  );
  // Touch devis.updated_at
  await db.execute(
    "UPDATE devis SET updated_at = datetime('now') WHERE id = ?",
    [data.devis_id]
  );
  return result.lastInsertId as number;
}

export async function updateDevisLigne(
  id: number,
  data: {
    devis_id: number;
    section_id: number | null;
    article_id: number | null;
    description: string;
    quantite: number;
    prix_unitaire: number;
    prix_achat: number;
    remise: number;
  }
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE devis_lignes
     SET section_id = ?, article_id = ?, description = ?,
         quantite = ?, prix_unitaire = ?, prix_achat = ?, remise = ?
     WHERE id = ?`,
    [
      data.section_id,
      data.article_id,
      data.description,
      data.quantite,
      data.prix_unitaire,
      data.prix_achat,
      data.remise,
      id,
    ]
  );
  await db.execute(
    "UPDATE devis SET updated_at = datetime('now') WHERE id = ?",
    [data.devis_id]
  );
}

export async function deleteDevisLigne(
  id: number,
  devisId: number
): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM devis_lignes WHERE id = ?", [id]);
  await db.execute(
    "UPDATE devis SET updated_at = datetime('now') WHERE id = ?",
    [devisId]
  );
}

// ─── DEVIS PIÈCES JOINTES ────────────────────────────────────────────────────

export async function getDevisPiecesJointes(
  devisId: number
): Promise<DevisPieceJointe[]> {
  const db = await getDb();
  return db.select<DevisPieceJointe[]>(
    "SELECT * FROM devis_pieces_jointes WHERE devis_id = ? ORDER BY created_at DESC",
    [devisId]
  );
}

export async function createDevisPieceJointe(data: {
  devis_id: number;
  nom: string;
  chemin_fichier: string;
  type_mime: string | null;
  taille: number | null;
}): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO devis_pieces_jointes (devis_id, nom, chemin_fichier, type_mime, taille)
     VALUES (?, ?, ?, ?, ?)`,
    [data.devis_id, data.nom, data.chemin_fichier, data.type_mime, data.taille]
  );
  return result.lastInsertId as number;
}

export async function deleteDevisPieceJointe(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM devis_pieces_jointes WHERE id = ?", [id]);
}

// ─── PRESTATION LIGNES ────────────────────────────────────────────────────────

export async function getPrestationLignes(
  devisId: number
): Promise<PrestationLigne[]> {
  const db = await getDb();
  return db.select<PrestationLigne[]>(
    "SELECT * FROM prestation_lignes WHERE devis_id = ? ORDER BY ordre ASC",
    [devisId]
  );
}

export async function createPrestationLigne(data: {
  devis_id: number;
  tache: string;
  description: string | null;
  profil_label: string;
  article_id: number | null;
  tjm: number;
  jours: number;
  ordre: number;
}): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO prestation_lignes
       (devis_id, tache, description, profil_label, article_id, tjm, jours, ordre)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.devis_id,
      data.tache,
      data.description ?? null,
      data.profil_label,
      data.article_id ?? null,
      data.tjm,
      data.jours,
      data.ordre,
    ]
  );
  return result.lastInsertId as number;
}

export async function updatePrestationLigne(
  id: number,
  data: {
    tache: string;
    description: string | null;
    profil_label: string;
    article_id: number | null;
    tjm: number;
    jours: number;
  }
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE prestation_lignes
     SET tache = ?, description = ?, profil_label = ?, article_id = ?, tjm = ?, jours = ?
     WHERE id = ?`,
    [
      data.tache,
      data.description ?? null,
      data.profil_label,
      data.article_id ?? null,
      data.tjm,
      data.jours,
      id,
    ]
  );
}

export async function deletePrestationLigne(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM prestation_lignes WHERE id = ?", [id]);
}

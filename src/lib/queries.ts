import { getDb } from "./db";
import type { Client, CompteRendu, DossierWithClient, Statut } from "./types";

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

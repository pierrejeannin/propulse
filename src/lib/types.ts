// ─── STATUTS ────────────────────────────────────────────────────────────────

export const STATUTS = [
  "Découverte",
  "Qualification",
  "Proposition",
  "Soutenance",
  "Gagné",
  "Perdu",
  "Abandonné",
] as const;

export type Statut = (typeof STATUTS)[number];

export const STATUT_CONFIG: Record<
  Statut,
  { className: string; dotColor: string }
> = {
  Découverte: {
    className:
      "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/40",
    dotColor: "bg-slate-500 dark:bg-slate-400",
  },
  Qualification: {
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40",
    dotColor: "bg-blue-500 dark:bg-blue-400",
  },
  Proposition: {
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
    dotColor: "bg-amber-500 dark:bg-amber-400",
  },
  Soutenance: {
    className:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/40",
    dotColor: "bg-violet-500 dark:bg-violet-400",
  },
  Gagné: {
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
    dotColor: "bg-emerald-600 dark:bg-emerald-400",
  },
  Perdu: {
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40",
    dotColor: "bg-red-500 dark:bg-red-400",
  },
  Abandonné: {
    className:
      "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-600/30 dark:text-zinc-400 dark:border-zinc-600/40",
    dotColor: "bg-zinc-500",
  },
};

// ─── CLIENT ─────────────────────────────────────────────────────────────────

export interface Client {
  id: number;
  nom: string;
  contact_nom: string | null;
  contact_email: string | null;
  contact_telephone: string | null;
  secteur: string | null;
  adresse: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── DOSSIER ─────────────────────────────────────────────────────────────────

export interface Dossier {
  id: number;
  titre: string;
  client_id: number | null;
  statut: Statut;
  description: string | null;
  date_rendu: string | null;
  montant_estime: number | null;
  created_at: string;
  updated_at: string;
}

export interface DossierWithClient extends Dossier {
  client_nom: string | null;
}

// ─── COMPTE-RENDU ─────────────────────────────────────────────────────────────

export interface CompteRendu {
  id: number;
  dossier_id: number;
  titre: string;
  date_rdv: string;
  participants: string | null;
  contexte_existant: string | null;
  besoins_exprimes: string | null;
  metriques_cles: string | null;
  pistes_solution: string | null;
  actions_next_steps: string | null;
  created_at: string;
  updated_at: string;
}

// ─── CATALOGUE ────────────────────────────────────────────────────────────────

export const ARTICLE_TYPES = ["Licence", "Matériel", "Service"] as const;
export type ArticleType = (typeof ARTICLE_TYPES)[number];

export interface CatalogueFamille {
  id: number;
  nom: string;
  description: string | null;
  created_at: string;
}

export interface CatalogueArticle {
  id: number;
  nom: string;
  reference: string | null;
  description: string | null;
  type: ArticleType;
  famille_id: number | null;
  famille_nom: string | null; // joined
  prix_achat: number;
  prix_vente: number;
  actif: number;
  is_default_cp: number; // 1 = profil Chef de projet par défaut
  created_at: string;
  updated_at: string;
}

// ─── DEVIS ────────────────────────────────────────────────────────────────────

export interface Devis {
  id: number;
  dossier_id: number;
  titre: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DevisSection {
  id: number;
  devis_id: number;
  nom: string;
  ordre: number;
}

export interface DevisLigne {
  id: number;
  devis_id: number;
  section_id: number | null;
  article_id: number | null;
  description: string;
  quantite: number;
  prix_unitaire: number;
  prix_achat: number;
  remise: number;
  ordre: number;
  created_at: string;
}

export interface DevisPieceJointe {
  id: number;
  devis_id: number;
  nom: string;
  chemin_fichier: string;
  type_mime: string | null;
  taille: number | null;
  created_at: string;
}

// Vue transversale (pour la page Chiffrage sidebar)
export interface DevisAvecTotal {
  id: number;
  dossier_id: number;
  dossier_titre: string;
  client_nom: string | null;
  dossier_statut: Statut;
  total_ht: number;
  marge_globale: number | null; // null si aucune ligne avec prix_achat
  updated_at: string;
}

// ─── PRESTATION ───────────────────────────────────────────────────────────────

export interface PrestationLigne {
  id: number;
  devis_id: number;
  tache: string;
  description: string | null;
  profil_label: string;
  article_id: number | null;
  tjm: number;
  jours: number;
  ordre: number;
  created_at: string;
}

// ─── Helpers calcul ───────────────────────────────────────────────────────────

export function totalLigne(l: DevisLigne): number {
  return l.quantite * l.prix_unitaire * (1 - l.remise / 100);
}

export function margeLigne(l: DevisLigne): number | null {
  if (l.prix_achat <= 0 || l.prix_unitaire <= 0) return null;
  const puNet = l.prix_unitaire * (1 - l.remise / 100);
  return ((puNet - l.prix_achat) / puNet) * 100;
}

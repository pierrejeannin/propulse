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
    className: "bg-slate-500/20 text-slate-300 border-slate-500/40",
    dotColor: "bg-slate-400",
  },
  Qualification: {
    className: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    dotColor: "bg-blue-400",
  },
  Proposition: {
    className: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    dotColor: "bg-amber-400",
  },
  Soutenance: {
    className: "bg-violet-500/20 text-violet-300 border-violet-500/40",
    dotColor: "bg-violet-400",
  },
  Gagné: {
    className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    dotColor: "bg-emerald-400",
  },
  Perdu: {
    className: "bg-red-500/20 text-red-300 border-red-500/40",
    dotColor: "bg-red-400",
  },
  Abandonné: {
    className: "bg-zinc-600/30 text-zinc-400 border-zinc-600/40",
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
